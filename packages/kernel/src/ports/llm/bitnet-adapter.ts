import {
  type LlmPort,
  LlmPortError,
  type LlmRequest,
  LlmRequestSchema,
  type LlmResponse,
  LlmResponseSchema,
} from '../llm';

/**
 * BitNet LLM adapter — for local development + integration testing only.
 *
 * Targets Microsoft's bitnet.cpp server (github.com/microsoft/BitNet), which
 * ships an OpenAI-compatible HTTP API on top of the b1.58 1-bit inference
 * kernels. The same adapter works against any other OpenAI-compatible
 * local server (Ollama, LM Studio, llama.cpp's `llama-server`) — swap the
 * `baseUrl` and the `model` id.
 *
 * **Not a product path.** Local 2B-class models are an order of magnitude
 * behind Anthropic Haiku on tool-calling and PT-BR nuance. We use this to
 * exercise the full LLM pipeline in tests without hitting the real API —
 * zero cost per test run, fully offline, reproducible enough.
 *
 * Design choices that diverge from `AnthropicLlmAdapter`:
 *  - **No cache_control.** OpenAI-compat servers don't support prompt
 *    caching. Cache hints in the request are silently ignored.
 *  - **No tier → model mapping.** BitNet ships one model; callers supply
 *    the `model` id via config and every request uses it regardless of
 *    `request.tier`. A mismatch (e.g. flow asking for Opus) is not an
 *    error here — BitNet can't refuse, and adding fake tier validation
 *    would mask a real misuse in an integration test.
 *  - **No Anthropic-specific error mapping.** HTTP 4xx/5xx map to
 *    `upstream`; timeouts to `timeout`; parse failures to `invalid_response`.
 */

export interface BitNetLlmConfig {
  /** Base URL of the OpenAI-compatible server. Default http://127.0.0.1:8080 */
  readonly baseUrl?: string;
  /** Model id the server exposes (as reported by the `/v1/models` endpoint). */
  readonly model: string;
  /** Request timeout in ms. Default 60s (local model first-token latency is real). */
  readonly timeoutMs?: number;
  /** Optional fetch override — test seam. Defaults to `globalThis.fetch`. */
  readonly fetch?: typeof fetch;
}

const DEFAULT_BASE_URL = 'http://127.0.0.1:8080';
const DEFAULT_TIMEOUT_MS = 60_000;

interface OpenAiChatRequestMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

interface OpenAiChatResponse {
  readonly choices: ReadonlyArray<{
    readonly message: { readonly content: string };
    readonly finish_reason?: string;
  }>;
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
  };
  readonly model?: string;
}

export class BitNetLlmAdapter implements LlmPort {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(config: BitNetLlmConfig) {
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.model = config.model;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = config.fetch ?? globalThis.fetch;
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const validated = LlmRequestSchema.parse(request);
    const messages = this.buildMessages(validated);

    const abort = new AbortController();
    const timeoutHandle = setTimeout(() => abort.abort(), this.timeoutMs);
    const start = Date.now();

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: validated.maxTokens,
          ...(validated.temperature !== undefined ? { temperature: validated.temperature } : {}),
        }),
        signal: abort.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new LlmPortError({
          kind: 'upstream',
          statusCode: response.status,
          message: body.slice(0, 200) || `${response.status} ${response.statusText}`,
        });
      }

      const json = (await response.json()) as OpenAiChatResponse;
      return this.normalize(json);
    } catch (err) {
      throw this.mapError(err, Date.now() - start);
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  private buildMessages(request: LlmRequest): OpenAiChatRequestMessage[] {
    const messages: OpenAiChatRequestMessage[] = [];
    if (request.system !== undefined) {
      messages.push({ role: 'system', content: request.system });
    }
    for (const m of request.messages) {
      messages.push({ role: m.role, content: m.content });
    }
    return messages;
  }

  private normalize(json: OpenAiChatResponse): LlmResponse {
    const choice = json.choices?.[0];
    const content = choice?.message?.content ?? '';
    if (content === '') {
      throw new LlmPortError({
        kind: 'invalid_response',
        message: `OpenAI-compatible response had no text content (finish_reason: ${choice?.finish_reason ?? 'unknown'})`,
      });
    }
    const result: LlmResponse = {
      content,
      stopReason: mapFinishReason(choice?.finish_reason),
      usage: {
        inputTokens: json.usage?.prompt_tokens ?? 0,
        outputTokens: json.usage?.completion_tokens ?? 0,
      },
      model: json.model ?? this.model,
    };
    return LlmResponseSchema.parse(result);
  }

  private mapError(err: unknown, elapsedMs: number): LlmPortError {
    if (err instanceof LlmPortError) return err;
    // AbortError from the timeout.
    if (err instanceof Error && err.name === 'AbortError') {
      return new LlmPortError({
        kind: 'timeout',
        elapsedMs,
        message: `BitNet request timed out after ${this.timeoutMs}ms`,
      });
    }
    const message = err instanceof Error ? err.message : String(err);
    return new LlmPortError({ kind: 'invalid_response', message });
  }
}

function mapFinishReason(raw: string | undefined): LlmResponse['stopReason'] {
  switch (raw) {
    case 'stop':
      return 'end_turn';
    case 'length':
      return 'max_tokens';
    case 'tool_calls':
      return 'tool_use';
    default:
      return 'end_turn';
  }
}
