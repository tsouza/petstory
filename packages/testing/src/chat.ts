import {
  type ChatMessage,
  type ChatPort,
  type ChatTurn,
  ChatTurnSchema,
  generateMessageId,
  generateTurnId,
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
 * the user echo, drives a scripted reply producer, and notifies every
 * subscriber for that pet. There is no real LLM here — callers pass in a
 * `reply` function to produce the assistant's response text.
 *
 * IDs are generated via the kernel's shared helpers (`turn_<uuid>`,
 * `msg_<uuid>`) so they match the shape the real Convex adapter produces —
 * nothing pipes test-shaped IDs into production code paths.
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
   * Message id generator. Overridable in tests for deterministic IDs.
   * Defaults to `generateMessageId` (uuid-based).
   */
  readonly nextMessageId?: () => string;
  /**
   * Turn id generator. Overridable in tests for deterministic IDs.
   * Defaults to `generateTurnId` (uuid-based).
   */
  readonly nextTurnId?: () => string;
}

export class InMemoryChatAdapter implements ChatPort {
  private readonly messages = new Map<string, ChatMessage[]>();
  private readonly listeners = new Map<string, Set<MessageListener>>();
  private readonly reply: (turn: ChatTurn) => Promise<string> | string;
  private readonly now: () => number;
  private readonly nextMessageId: () => string;
  private readonly nextTurnId: () => string;

  constructor(options: InMemoryChatAdapterOptions = {}) {
    this.reply = options.reply ?? ((turn) => `You said: ${turn.text}`);
    this.now = options.now ?? (() => Date.now());
    this.nextMessageId = options.nextMessageId ?? generateMessageId;
    this.nextTurnId = options.nextTurnId ?? generateTurnId;
  }

  async sendTurn(turn: ChatTurn): Promise<void> {
    const validated = ChatTurnSchema.parse(turn);
    const turnId = this.nextTurnId();

    const userMessage: ChatMessage = {
      id: this.nextMessageId(),
      petId: validated.petId,
      turnId,
      author: 'user',
      payload: { kind: 'text', text: validated.text } satisfies TextCardPayload,
      createdAt: this.now(),
    };
    this.appendAndNotify(validated.petId, userMessage);

    const replyText = await this.reply(validated);
    const assistantMessage: ChatMessage = {
      id: this.nextMessageId(),
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
    id: partial?.id ?? 'msg_test',
    petId: partial?.petId ?? 'pet-1',
    turnId: partial?.turnId ?? 'turn_test',
    author: partial?.author ?? 'assistant',
    payload: partial?.payload ?? ({ kind: 'text', text: 'hi' } satisfies TextCardPayload),
    createdAt: partial?.createdAt ?? 0,
  };
}
