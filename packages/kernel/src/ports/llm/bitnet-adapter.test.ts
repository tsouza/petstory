import { describe, expect, it, vi } from 'vitest';

import { BitNetLlmAdapter, LlmPortError, type LlmRequest } from '../../index';

const baseRequest: LlmRequest = {
  tier: 'haiku',
  messages: [{ role: 'user', content: 'hello' }],
  maxTokens: 100,
};

function mockFetchJson(body: unknown, init: { status?: number; statusText?: string } = {}) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: init.status ?? 200,
      statusText: init.statusText ?? 'OK',
      headers: { 'content-type': 'application/json' },
    }),
  );
}

interface ParsedRequestBody {
  readonly model: string;
  readonly messages: ReadonlyArray<{ readonly role: string; readonly content: string }>;
  readonly max_tokens: number;
  readonly temperature?: number;
}

function parseBody(raw: string): ParsedRequestBody {
  return JSON.parse(raw) as ParsedRequestBody;
}

describe('BitNetLlmAdapter', () => {
  it('posts to /v1/chat/completions with the configured model + max_tokens', async () => {
    const fetchFn = mockFetchJson({
      choices: [{ message: { content: 'oi' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 2 },
      model: 'bitnet-b1.58-2B-4T',
    });
    const adapter = new BitNetLlmAdapter({
      model: 'bitnet-b1.58-2B-4T',
      fetch: fetchFn as unknown as typeof fetch,
    });
    await adapter.complete(baseRequest);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe('http://127.0.0.1:8080/v1/chat/completions');
    expect(init?.method).toBe('POST');
    const body = parseBody(init?.body as string);
    expect(body.model).toBe('bitnet-b1.58-2B-4T');
    expect(body.max_tokens).toBe(100);
    expect(body.messages).toEqual([{ role: 'user', content: 'hello' }]);
  });

  it('includes system message when provided and skips it otherwise', async () => {
    const fetchFn = mockFetchJson({
      choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
    });
    const adapter = new BitNetLlmAdapter({
      model: 'bitnet-b1.58-2B-4T',
      fetch: fetchFn as unknown as typeof fetch,
    });
    await adapter.complete({ ...baseRequest, system: 'You are helpful.' });
    const body = parseBody(fetchFn.mock.calls[0]?.[1]?.body as string);
    expect(body.messages).toEqual([
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'hello' },
    ]);
  });

  it('normalises the OpenAI-compatible response into an LlmResponse', async () => {
    const fetchFn = mockFetchJson({
      choices: [{ message: { content: 'hi there!' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 4, completion_tokens: 3 },
      model: 'bitnet-b1.58-2B-4T',
    });
    const adapter = new BitNetLlmAdapter({
      model: 'bitnet-b1.58-2B-4T',
      fetch: fetchFn as unknown as typeof fetch,
    });
    const result = await adapter.complete(baseRequest);
    expect(result).toEqual({
      content: 'hi there!',
      stopReason: 'end_turn',
      usage: { inputTokens: 4, outputTokens: 3 },
      model: 'bitnet-b1.58-2B-4T',
    });
  });

  it('maps finish_reason values to LlmStopReason', async () => {
    const cases: ReadonlyArray<[string, 'end_turn' | 'max_tokens' | 'tool_use']> = [
      ['stop', 'end_turn'],
      ['length', 'max_tokens'],
      ['tool_calls', 'tool_use'],
      ['unknown', 'end_turn'],
    ];
    for (const [raw, expected] of cases) {
      const fetchFn = mockFetchJson({
        choices: [{ message: { content: 'x' }, finish_reason: raw }],
      });
      const adapter = new BitNetLlmAdapter({
        model: 'm',
        fetch: fetchFn as unknown as typeof fetch,
      });
      const result = await adapter.complete(baseRequest);
      expect(result.stopReason).toBe(expected);
    }
  });

  it('throws upstream LlmPortError on a 4xx/5xx response', async () => {
    const fetchFn = mockFetchJson({ error: 'nope' }, { status: 500, statusText: 'Server Error' });
    const adapter = new BitNetLlmAdapter({
      model: 'm',
      fetch: fetchFn as unknown as typeof fetch,
    });
    await expect(adapter.complete(baseRequest)).rejects.toMatchObject({
      name: 'LlmPortError',
      detail: { kind: 'upstream', statusCode: 500 },
    });
  });

  it('throws invalid_response when the server returns no text content', async () => {
    const fetchFn = mockFetchJson({
      choices: [{ message: { content: '' }, finish_reason: 'length' }],
    });
    const adapter = new BitNetLlmAdapter({
      model: 'm',
      fetch: fetchFn as unknown as typeof fetch,
    });
    await expect(adapter.complete(baseRequest)).rejects.toMatchObject({
      name: 'LlmPortError',
      detail: { kind: 'invalid_response' },
    });
  });

  it('throws timeout LlmPortError when the fetch aborts', async () => {
    const fetchFn = vi.fn().mockImplementation(
      (_url: string, init: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const err = new Error('Aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    );
    const adapter = new BitNetLlmAdapter({
      model: 'm',
      timeoutMs: 10,
      fetch: fetchFn as unknown as typeof fetch,
    });
    await expect(adapter.complete(baseRequest)).rejects.toMatchObject({
      name: 'LlmPortError',
      detail: { kind: 'timeout' },
    });
  });

  it('rejects an invalid request at the schema boundary (R5)', async () => {
    const adapter = new BitNetLlmAdapter({ model: 'm' });
    await expect(
      adapter.complete({ ...baseRequest, maxTokens: 999_999 } as LlmRequest),
    ).rejects.toThrow();
  });

  it('strips trailing slash from baseUrl', async () => {
    const fetchFn = mockFetchJson({ choices: [{ message: { content: 'x' } }] });
    const adapter = new BitNetLlmAdapter({
      baseUrl: 'http://localhost:9090/',
      model: 'm',
      fetch: fetchFn as unknown as typeof fetch,
    });
    await adapter.complete(baseRequest);
    expect(fetchFn.mock.calls[0]?.[0]).toBe('http://localhost:9090/v1/chat/completions');
  });

  it('does not throw on unknown tier — BitNet has one model; tier is advisory here', async () => {
    const fetchFn = mockFetchJson({ choices: [{ message: { content: 'x' } }] });
    const adapter = new BitNetLlmAdapter({
      model: 'bitnet-b1.58-2B-4T',
      fetch: fetchFn as unknown as typeof fetch,
    });
    // Opus-tier request still goes through; the tier is ignored by the adapter.
    await expect(adapter.complete({ ...baseRequest, tier: 'opus' })).resolves.toMatchObject({
      content: 'x',
    });
  });

  // biome-ignore lint/suspicious/noExplicitAny: reason: intentionally unused type re-export guard
  const _portTypeCheck = LlmPortError as any;
  void _portTypeCheck;
});
