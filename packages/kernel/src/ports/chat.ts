import { z } from 'zod';

// Core chat primitives — the L0 contract every L1 conversation primitive
// and every chat adapter (in-memory, Convex, cassette-replay) speaks to.
//
// The kernel knows only: a turn comes in as text; some messages come out.
// Messages carry a discriminated `kind` — `text` today, arbitrary pack-
// registered kinds tomorrow. The kernel never enumerates card kinds; the
// set is open via the CardRegistry extension slot (see @petstory/conversation).

/** A single user-initiated turn of conversation. */
export const ChatTurnSchema = z.object({
  petId: z.string().min(1),
  text: z.string().min(1),
});
export type ChatTurn = z.infer<typeof ChatTurnSchema>;

/** Author of a chat message. */
export const MessageAuthorSchema = z.enum(['user', 'assistant', 'system']);
export type MessageAuthor = z.infer<typeof MessageAuthorSchema>;

// --- Card payloads ---------------------------------------------------------
//
// A message's `kind` drives rendering. `text` is the only kind the kernel
// ships with — any L2 pack can register new kinds (e.g. `meal-card`,
// `symptom-card`) via the CardRegistry. The kernel stores payloads as opaque
// JSON; the registry owns schema enforcement per-kind.

/** Text message — the only kind the kernel itself defines. */
export const TextCardPayloadSchema = z.object({
  kind: z.literal('text'),
  text: z.string(),
});
export type TextCardPayload = z.infer<typeof TextCardPayloadSchema>;

/**
 * Open-ended payload envelope. The `kind` field discriminates; the rest is
 * opaque to the kernel and validated by the pack-registered schema in the
 * card registry. `kind: 'text'` is the one exception — kernel-owned.
 */
export const CardPayloadSchema = z
  .object({
    kind: z.string().min(1),
  })
  .passthrough();
export type CardPayload = z.infer<typeof CardPayloadSchema>;

// --- ChatMessage -----------------------------------------------------------

export const ChatMessageSchema = z.object({
  id: z.string().min(1),
  petId: z.string().min(1),
  turnId: z.string().min(1),
  author: MessageAuthorSchema,
  payload: CardPayloadSchema,
  createdAt: z.number().int().nonnegative(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

/**
 * Type guard — narrows a generic CardPayload to a TextCardPayload.
 * Consumers that want to render text-only without the registry can use this.
 */
export function isTextCard(payload: CardPayload): payload is TextCardPayload {
  return payload.kind === 'text' && typeof (payload as TextCardPayload).text === 'string';
}

// --- ChatPort --------------------------------------------------------------
//
// The kernel's Anti-Corruption Layer for chat persistence + streaming.
// Adapters (InMemory, Convex, cassette-replay) implement this. Consumers
// receive a ChatPort via dependency injection.

/** Called with the latest message list whenever it changes. */
export type MessageListener = (messages: readonly ChatMessage[]) => void;

/** Return value of a subscribe call — invoke to stop receiving updates. */
export type Unsubscribe = () => void;

export interface ChatPort {
  /** Push a user turn. Implementations are expected to eventually append
   *  one or more messages (user echo + assistant reply) to the stream. */
  sendTurn(turn: ChatTurn): Promise<void>;

  /** Subscribe to the message stream for a given pet. The listener is called
   *  once immediately with the current snapshot and again on every change. */
  subscribeMessages(petId: string, listener: MessageListener): Unsubscribe;
}

// --- ID helpers ------------------------------------------------------------
//
// Shared ID generators used by every adapter — in-memory, Convex, cassette.
// One source of truth means ID shapes don't drift across backends, and
// consumers can match against the prefix if they need to differentiate.
//
// `crypto.randomUUID` is available on every modern runtime (Bun 1.0+, Node
// 19+, React Native 0.76+) — BUT in browsers it's gated behind Secure
// Context. That means it works on `https://…` and `localhost`, and is
// `undefined` everywhere else, including plain-HTTP LAN-IP access like
// `http://192.168.x.x:8081` used for on-device testing.
//
// We can't require HTTPS in dev, so we fall back to a v4-UUID-shaped
// Math.random generator when `crypto.randomUUID` isn't callable. The
// fallback is not cryptographically secure — it's sufficient for chat
// row IDs (no security boundary), not for tokens or keys.

const UUID_TEMPLATE = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';

function safeRandomUUID(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return UUID_TEMPLATE.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** ID for a single chat turn (one user send + its assistant reply). */
export function generateTurnId(): string {
  return `turn_${safeRandomUUID()}`;
}

/** ID for a single message row (user echo, assistant reply, system notice). */
export function generateMessageId(): string {
  return `msg_${safeRandomUUID()}`;
}

/** ID for a single Domain Event row. */
export function generateEventId(): string {
  return `evt_${safeRandomUUID()}`;
}
