import {
  type LlmError,
  type LlmPort,
  LlmPortError,
  type LlmRequest,
  type LlmResponse,
} from '../llm.js';

/** A single scripted outcome for the mock to emit on its next `complete()` call. */
export type ScriptedResponse = LlmResponse | { readonly error: LlmError };

/** Record of one call made on the mock, for assertions. */
export interface MockLlmCall {
  readonly request: LlmRequest;
  readonly at: number;
}

/**
 * Mock implementation of `LlmPort` for unit tests.
 *
 * Construct with an array of scripted responses. Each `complete()` call
 * pops the next one. Exhausting the queue throws explicitly — no silent
 * fallback. Exposes the full call log for ordering / shape assertions.
 */
export class MockLlmAdapter implements LlmPort {
  private readonly queue: ScriptedResponse[];
  private readonly callLog: MockLlmCall[] = [];

  constructor(scripted: readonly ScriptedResponse[]) {
    this.queue = [...scripted];
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    this.callLog.push({ request, at: Date.now() });
    const next = this.queue.shift();
    if (next === undefined) {
      throw new LlmPortError({
        kind: 'invalid_response',
        message: `MockLlmAdapter: scripted queue exhausted. Call ${this.callLog.length} had no scripted response.`,
      });
    }
    if ('error' in next) {
      throw new LlmPortError(next.error);
    }
    return next;
  }

  /** Inspect the calls made on this mock, in order. */
  getCalls(): readonly MockLlmCall[] {
    return this.callLog;
  }

  /** The number of calls made. */
  get callCount(): number {
    return this.callLog.length;
  }

  /** Throw if scripted responses remain unused — catches stale test expectations. */
  assertDrained(): void {
    if (this.queue.length > 0) {
      throw new Error(
        `MockLlmAdapter: ${this.queue.length} scripted response(s) left unused. Test expectations do not match actual calls.`,
      );
    }
  }
}
