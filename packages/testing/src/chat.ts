import {
  type ChatMessage,
  type ChatPort,
  type ChatTurn,
  ChatTurnSchema,
  type MessageListener,
  type TextCardPayload,
  type Unsubscribe,
} from '@petstory/kernel';

/**
 * Minimal in-memory implementation of `ChatPort`. Useful for:
 *  - Dev-mode app builds before Convex is wired (F1 of the chat substrate).
 *  - Unit tests over any component that consumes a ChatPort.
 *
 * The adapter keeps one message list per `petId`. On `sendTurn` it appends
 * the user echo, optionally drives a scripted reply producer, and notifies
 * every subscriber for that pet. There is no real LLM here — callers pass
 * in a `reply` function to produce the assistant's response text.
 */
export interface InMemoryChatAdapterOptions {
  /**
   * Produces the assistant's text reply for a user turn. Defaults to a
   * simple echo ("You said: …") so a dev environment has something to show
   * before a real LLM is wired.
   */
  readonly reply?: (turn: ChatTurn) => Promise<string> | string;
  /**
   * Monotonic clock. Overridable in tests for deterministic timestamps.
   * Defaults to Date.now.
   */
  readonly now?: () => number;
  /**
   * Id generator. Overridable in tests. Defaults to an ever-incrementing
   * counter ("m-1", "m-2", …). Not cryptographically unique; only for local
   * in-memory use.
   */
  readonly nextId?: () => string;
}

export class InMemoryChatAdapter implements ChatPort {
  private readonly messages = new Map<string, ChatMessage[]>();
  private readonly listeners = new Map<string, Set<MessageListener>>();
  private readonly reply: (turn: ChatTurn) => Promise<string> | string;
  private readonly now: () => number;
  private readonly nextIdFn: () => string;
  private counter = 0;

  constructor(options: InMemoryChatAdapterOptions = {}) {
    this.reply = options.reply ?? ((turn) => `You said: ${turn.text}`);
    this.now = options.now ?? (() => Date.now());
    this.nextIdFn =
      options.nextId ??
      (() => {
        this.counter += 1;
        return `m-${this.counter}`;
      });
  }

  async sendTurn(turn: ChatTurn): Promise<void> {
    const validated = ChatTurnSchema.parse(turn);
    const turnId = `t-${this.nextIdFn()}`;

    const userMessage: ChatMessage = {
      id: this.nextIdFn(),
      petId: validated.petId,
      turnId,
      author: 'user',
      payload: { kind: 'text', text: validated.text } satisfies TextCardPayload,
      createdAt: this.now(),
    };
    this.appendAndNotify(validated.petId, userMessage);

    const replyText = await this.reply(validated);
    const assistantMessage: ChatMessage = {
      id: this.nextIdFn(),
      petId: validated.petId,
      turnId,
      author: 'assistant',
      payload: { kind: 'text', text: replyText } satisfies TextCardPayload,
      createdAt: this.now(),
    };
    this.appendAndNotify(validated.petId, assistantMessage);
  }

  subscribeMessages(petId: string, listener: MessageListener): Unsubscribe {
    if (!this.listeners.has(petId)) this.listeners.set(petId, new Set());
    this.listeners.get(petId)?.add(listener);
    // Fire immediately with current snapshot so consumers don't need a
    // separate getSnapshot call.
    listener(this.snapshot(petId));
    return () => {
      this.listeners.get(petId)?.delete(listener);
    };
  }

  /** Test-only helper: inspect the current message list without subscribing. */
  snapshot(petId: string): readonly ChatMessage[] {
    return this.messages.get(petId) ?? [];
  }

  /** Test-only helper: inject a message directly (e.g. to seed a conversation). */
  seed(petId: string, message: ChatMessage): void {
    this.appendAndNotify(petId, message);
  }

  private appendAndNotify(petId: string, message: ChatMessage): void {
    const existing = this.messages.get(petId) ?? [];
    const next = [...existing, message];
    this.messages.set(petId, next);
    const listeners = this.listeners.get(petId);
    if (!listeners) return;
    for (const listener of listeners) listener(next);
  }
}

/**
 * Build a `ChatMessage` with sensible defaults for tests. Override anything
 * via the partial.
 */
export function mockChatMessage(partial?: Partial<ChatMessage>): ChatMessage {
  return {
    id: partial?.id ?? 'm-test',
    petId: partial?.petId ?? 'pet-1',
    turnId: partial?.turnId ?? 't-test',
    author: partial?.author ?? 'assistant',
    payload: partial?.payload ?? ({ kind: 'text', text: 'hi' } satisfies TextCardPayload),
    createdAt: partial?.createdAt ?? 0,
  };
}
