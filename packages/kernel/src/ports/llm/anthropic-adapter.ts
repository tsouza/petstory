import Anthropic from '@anthropic-ai/sdk';
import {
  type LlmPort,
  LlmPortError,
  type LlmRequest,
  LlmRequestSchema,
  type LlmResponse,
  LlmResponseSchema,
  type ModelTier,
} from '../llm.js';

/**
 * Tier → concrete Claude model ID. Pinned per ADR-001. Kernel major
 * version controls this map; a model-ID change is a breaking change.
 */
const MODEL_ID_BY_TIER: Readonly<Record<ModelTier, string>> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-6',
};

export interface AnthropicLlmConfig {
  /** API key — caller reads from env/Infisical/Doppler; adapter never touches process.env. */
  readonly apiKey: string;
  /** Request timeout in ms. Default 30s. */
  readonly timeoutMs?: number;
}

type SystemBlock = {
  readonly type: 'text';
  readonly text: string;
  readonly cache_control?: { readonly type: 'ephemeral' };
};

type MessageContent = string | ReadonlyArray<SystemBlock>;

/** Real adapter wrapping `@anthropic-ai/sdk`. */
export class AnthropicLlmAdapter implements LlmPort {
  private readonly client: Anthropic;

  constructor(config: AnthropicLlmConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      timeout: config.timeoutMs ?? 30_000,
    });
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const validated = LlmRequestSchema.parse(request);
    const modelId = MODEL_ID_BY_TIER[validated.tier];
    const start = Date.now();

    try {
      const apiResponse = await this.client.messages.create({
        model: modelId,
        max_tokens: validated.maxTokens,
        ...(validated.temperature !== undefined ? { temperature: validated.temperature } : {}),
        ...(validated.system !== undefined
          ? { system: this.buildSystem(validated.system, validated.cache?.system === true) }
          : {}),
        messages: validated.messages.map((m, idx) => ({
          role: m.role,
          content: this.buildMessageContent(
            m.content,
            idx === validated.messages.length - 1 && validated.cache?.lastMessage === true,
          ) as string,
        })),
      });

      const textContent = apiResponse.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      if (textContent === '') {
        throw new LlmPortError({
          kind: 'invalid_response',
          message: `Anthropic response had no text content (stop_reason: ${apiResponse.stop_reason})`,
        });
      }

      // The SDK's `Usage` type in v0.32 does not surface cache fields, but the
      // API returns them when prompt caching is used. Widen at this ACL seam.
      const usage = apiResponse.usage as Anthropic.Usage & {
        readonly cache_creation_input_tokens?: number | null;
        readonly cache_read_input_tokens?: number | null;
      };
      const result: LlmResponse = {
        content: textContent,
        stopReason: apiResponse.stop_reason as LlmResponse['stopReason'],
        usage: {
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          ...(usage.cache_creation_input_tokens != null
            ? { cacheCreationInputTokens: usage.cache_creation_input_tokens }
            : {}),
          ...(usage.cache_read_input_tokens != null
            ? { cacheReadInputTokens: usage.cache_read_input_tokens }
            : {}),
        },
        model: apiResponse.model,
      };
      return LlmResponseSchema.parse(result);
    } catch (err) {
      throw this.mapError(err, Date.now() - start);
    }
  }

  private buildSystem(system: string, cached: boolean): SystemBlock[] {
    return [
      {
        type: 'text',
        text: system,
        ...(cached ? { cache_control: { type: 'ephemeral' as const } } : {}),
      },
    ];
  }

  private buildMessageContent(text: string, cached: boolean): MessageContent {
    if (!cached) return text;
    return [
      {
        type: 'text',
        text,
        cache_control: { type: 'ephemeral' as const },
      },
    ];
  }

  private mapError(err: unknown, elapsedMs: number): LlmPortError {
    if (err instanceof LlmPortError) return err;
    if (err instanceof Anthropic.APIConnectionTimeoutError) {
      return new LlmPortError({ kind: 'timeout', elapsedMs, message: err.message });
    }
    if (err instanceof Anthropic.APIError) {
      return this.mapApiError(err);
    }
    const message = err instanceof Error ? err.message : String(err);
    return new LlmPortError({ kind: 'invalid_response', message });
  }

  private mapApiError(err: InstanceType<typeof Anthropic.APIError>): LlmPortError {
    if (err.status === 401 || err.status === 403) {
      return new LlmPortError({ kind: 'auth', message: err.message });
    }
    if (err.status === 429) {
      return new LlmPortError({
        kind: 'rate_limit',
        ...parseRetryAfterMs(err.headers),
        message: err.message,
      });
    }
    return new LlmPortError({
      kind: 'upstream',
      statusCode: err.status ?? 0,
      message: err.message,
    });
  }
}

function parseRetryAfterMs(headers: InstanceType<typeof Anthropic.APIError>['headers']): {
  retryAfterMs?: number;
} {
  // The SDK types `headers` as Web Headers but runtime accepts a plain record.
  // biome-ignore lint/suspicious/noExplicitAny: reason: ACL boundary — widen to read the header defensively
  const raw = (headers as any)?.['retry-after'];
  if (typeof raw !== 'string') return {};
  const seconds = Number.parseInt(raw, 10);
  return Number.isFinite(seconds) ? { retryAfterMs: seconds * 1000 } : {};
}
