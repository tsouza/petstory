import { describe, expect, it, vi } from 'vitest';

import {
  AnthropicLlmAdapter,
  LlmPortError,
  type LlmRequest,
  type LlmResponse,
  MockLlmAdapter,
} from '../index';

// --- Helpers ---------------------------------------------------------------

const baseRequest: LlmRequest = {
  tier: 'haiku',
  messages: [{ role: 'user', content: 'hello' }],
  maxTokens: 100,
};

const okResponse: LlmResponse = {
  content: 'hi!',
  stopReason: 'end_turn',
  usage: { inputTokens: 5, outputTokens: 3 },
  model: 'claude-haiku-4-5-20251001',
};

// --- MockLlmAdapter --------------------------------------------------------

describe('MockLlmAdapter', () => {
  it('returns scripted responses in order', async () => {
    const first: LlmResponse = { ...okResponse, content: 'first' };
    const second: LlmResponse = { ...okResponse, content: 'second' };
    const mock = new MockLlmAdapter([first, second]);

    await expect(mock.complete(baseRequest)).resolves.toMatchObject({ content: 'first' });
    await expect(mock.complete(baseRequest)).resolves.toMatchObject({ content: 'second' });
  });

  it('records the request of every call', async () => {
    const mock = new MockLlmAdapter([okResponse, okResponse]);

    await mock.complete(baseRequest);
    await mock.complete({
      ...baseRequest,
      tier: 'sonnet',
      messages: [{ role: 'user', content: 'again' }],
    });

    const calls = mock.getCalls();
    expect(calls).toHaveLength(2);
    expect(calls[0]?.request.tier).toBe('haiku');
    expect(calls[1]?.request.tier).toBe('sonnet');
    expect(calls[1]?.request.messages[0]?.content).toBe('again');
    expect(mock.callCount).toBe(2);
  });

  it('surfaces scripted errors via LlmPortError with the full detail', async () => {
    const mock = new MockLlmAdapter([
      { error: { kind: 'rate_limit', retryAfterMs: 1200, message: 'slow down' } },
    ]);

    await expect(mock.complete(baseRequest)).rejects.toMatchObject({
      name: 'LlmPortError',
      detail: { kind: 'rate_limit', retryAfterMs: 1200 },
    });
  });

  it('throws explicitly when the scripted queue is exhausted (R15 — no silent fallback)', async () => {
    const mock = new MockLlmAdapter([okResponse]);
    await mock.complete(baseRequest);

    await expect(mock.complete(baseRequest)).rejects.toBeInstanceOf(LlmPortError);
    await expect(mock.complete(baseRequest)).rejects.toMatchObject({
      detail: { kind: 'invalid_response' },
    });
  });

  it('assertDrained throws if scripted responses remain unused', () => {
    const mock = new MockLlmAdapter([okResponse, okResponse]);

    expect(() => mock.assertDrained()).toThrow(/2 scripted response/);
  });

  it('assertDrained succeeds once every scripted response has been consumed', async () => {
    const mock = new MockLlmAdapter([okResponse]);
    await mock.complete(baseRequest);

    expect(() => mock.assertDrained()).not.toThrow();
  });
});

// --- AnthropicLlmAdapter (request-shaping) ---------------------------------
//
// We don't call the real Anthropic API in unit tests. We spy on the SDK's
// `messages.create` to verify the adapter shapes requests correctly and
// maps responses/errors.

describe('AnthropicLlmAdapter', () => {
  it('maps tier → concrete model ID (haiku → claude-haiku-4-5-...)', async () => {
    const adapter = new AnthropicLlmAdapter({ apiKey: 'test-key' });
    const create = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 1, output_tokens: 1 },
      model: 'claude-haiku-4-5-20251001',
    });
    // biome-ignore lint/suspicious/noExplicitAny: reason: test-only seam into SDK client internals
    (adapter as any).client = { messages: { create } };

    await adapter.complete(baseRequest);

    const call = create.mock.calls[0]?.[0];
    expect(call?.model).toBe('claude-haiku-4-5-20251001');
    expect(call?.max_tokens).toBe(100);
    expect(call?.messages).toEqual([{ role: 'user', content: 'hello' }]);
  });

  it('applies ephemeral cache_control on system when cache.system is true', async () => {
    const adapter = new AnthropicLlmAdapter({ apiKey: 'test-key' });
    const create = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 1, output_tokens: 1 },
      model: 'claude-haiku-4-5-20251001',
    });
    // biome-ignore lint/suspicious/noExplicitAny: reason: test-only seam into SDK client internals
    (adapter as any).client = { messages: { create } };

    await adapter.complete({
      ...baseRequest,
      system: 'You are a helpful assistant.',
      cache: { system: true, lastMessage: false },
    });

    const call = create.mock.calls[0]?.[0];
    expect(call?.system).toEqual([
      {
        type: 'text',
        text: 'You are a helpful assistant.',
        cache_control: { type: 'ephemeral' },
      },
    ]);
  });

  it('normalizes Anthropic response into LlmResponse shape', async () => {
    const adapter = new AnthropicLlmAdapter({ apiKey: 'test-key' });
    const create = vi.fn().mockResolvedValue({
      content: [
        { type: 'text', text: 'Hello' },
        { type: 'text', text: ' there!' },
      ],
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 12,
        output_tokens: 4,
        cache_read_input_tokens: 10,
      },
      model: 'claude-haiku-4-5-20251001',
    });
    // biome-ignore lint/suspicious/noExplicitAny: reason: test-only seam into SDK client internals
    (adapter as any).client = { messages: { create } };

    const result = await adapter.complete(baseRequest);

    expect(result.content).toBe('Hello there!');
    expect(result.stopReason).toBe('end_turn');
    expect(result.usage).toEqual({
      inputTokens: 12,
      outputTokens: 4,
      cacheReadInputTokens: 10,
    });
    expect(result.model).toBe('claude-haiku-4-5-20251001');
  });

  it('throws invalid_response when the API returns no text content', async () => {
    const adapter = new AnthropicLlmAdapter({ apiKey: 'test-key' });
    const create = vi.fn().mockResolvedValue({
      content: [],
      stop_reason: 'max_tokens',
      usage: { input_tokens: 100, output_tokens: 0 },
      model: 'claude-haiku-4-5-20251001',
    });
    // biome-ignore lint/suspicious/noExplicitAny: reason: test-only seam into SDK client internals
    (adapter as any).client = { messages: { create } };

    await expect(adapter.complete(baseRequest)).rejects.toMatchObject({
      detail: { kind: 'invalid_response' },
    });
  });

  it('maps 429 into rate_limit with retryAfterMs when the header is present', async () => {
    const adapter = new AnthropicLlmAdapter({ apiKey: 'test-key' });
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const apiError = new Anthropic.APIError(
      429,
      { message: 'too many requests' },
      'too many requests',
      // biome-ignore lint/suspicious/noExplicitAny: reason: SDK types Headers as Web Headers but runtime accepts a plain record
      { 'retry-after': '2' } as any,
    );
    const create = vi.fn().mockRejectedValue(apiError);
    // biome-ignore lint/suspicious/noExplicitAny: reason: test-only seam into SDK client internals
    (adapter as any).client = { messages: { create } };

    await expect(adapter.complete(baseRequest)).rejects.toMatchObject({
      detail: { kind: 'rate_limit', retryAfterMs: 2000 },
    });
  });

  it('rejects an invalid request at the schema boundary (R5)', async () => {
    const adapter = new AnthropicLlmAdapter({ apiKey: 'test-key' });

    // maxTokens > 8192 is out of range
    await expect(
      adapter.complete({ ...baseRequest, maxTokens: 999999 } as LlmRequest),
    ).rejects.toThrow();
  });
});
