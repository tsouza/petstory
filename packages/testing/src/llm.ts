import {
  type LlmError,
  type LlmResponse,
  type LlmStopReason,
  type LlmUsage,
  MockLlmAdapter,
  type ScriptedResponse,
} from '@petstory/kernel';

export type { ScriptedResponse };
export { MockLlmAdapter };

/**
 * Build a scripted `LlmResponse` with sensible defaults for the 95% test case.
 * Override anything via the partial. Model defaults to Haiku's pinned ID.
 */
export function mockLlmResponse(partial?: {
  readonly content?: string;
  readonly stopReason?: LlmStopReason;
  readonly usage?: Partial<LlmUsage>;
  readonly model?: string;
}): LlmResponse {
  return {
    content: partial?.content ?? '',
    stopReason: partial?.stopReason ?? 'end_turn',
    usage: {
      inputTokens: partial?.usage?.inputTokens ?? 0,
      outputTokens: partial?.usage?.outputTokens ?? 0,
      ...(partial?.usage?.cacheCreationInputTokens !== undefined
        ? { cacheCreationInputTokens: partial.usage.cacheCreationInputTokens }
        : {}),
      ...(partial?.usage?.cacheReadInputTokens !== undefined
        ? { cacheReadInputTokens: partial.usage.cacheReadInputTokens }
        : {}),
    },
    model: partial?.model ?? 'claude-haiku-4-5-20251001',
  };
}

/** Build a scripted error entry for the `MockLlmAdapter` queue. */
export function mockLlmError(error: LlmError): ScriptedResponse {
  return { error };
}
