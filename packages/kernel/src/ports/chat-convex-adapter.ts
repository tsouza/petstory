import type { ConvexClient } from 'convex/browser';
import { type FunctionReference, makeFunctionReference } from 'convex/server';
import {
  type ChatMessage,
  type ChatPort,
  type ChatTurn,
  ChatTurnSchema,
  type MessageListener,
  type Unsubscribe,
} from './chat';

/**
 * Convex-backed `ChatPort` — the production shape for the chat substrate.
 *
 * The browser talks to Convex (mid-tier); Convex stores messages and calls
 * the LLM from server-side actions. This adapter is a thin bridge: it
 * reshapes the kernel's ChatPort contract onto Convex's non-React client
 * API (`onUpdate`, `mutation`). No LLM credentials, keys, or endpoints
 * ever leave the server — that's the architectural invariant this adapter
 * exists to enforce (see Stage A plan).
 *
 * Design notes:
 *  - **Function refs are string-based** (`'chat:messages'`, `'chat:sendTurn'`)
 *    rather than coming from Convex's generated `api` proxy. This lets the
 *    adapter ship in the kernel without a compile-time dependency on the
 *    project-specific `convex/_generated/` output. A later stage can swap
 *    in typed refs without changing the public contract.
 *  - **Server-side field name for message id is mapped on the server** — the
 *    `chat:messages` query returns objects already shaped as `ChatMessage`
 *    (kernel's `id` field is the app-level `msg_<uuid>`, not Convex's
 *    internal `_id`). Keeping the remap server-side means other clients
 *    (web, a future native replay tool) don't duplicate the logic.
 *  - **No built-in retry / reconnection logic.** `ConvexClient` handles
 *    WebSocket reconnects; UI-level error surfacing is the chat screen's
 *    responsibility (see packages/conversation/src/chat-screen.tsx).
 */
export interface ConvexChatAdapterOptions {
  /**
   * A connected `ConvexClient` instance (from `new ConvexClient(url)`).
   * The adapter never constructs one itself so the app shell controls
   * auth, lifecycle, and connection state.
   */
  readonly client: ConvexClient;

  /**
   * Override the query/mutation function names. Defaults match this repo's
   * `convex/chat.ts`. Useful only if a downstream project registers chat
   * under a different module path.
   */
  readonly functions?: {
    readonly messages?: string;
    readonly sendTurn?: string;
  };
}

type MessagesQuery = FunctionReference<
  'query',
  'public',
  { petId: string },
  readonly ChatMessage[]
>;
type SendTurnMutation = FunctionReference<
  'mutation',
  'public',
  { petId: string; text: string },
  { turnId: string }
>;

export class ConvexChatAdapter implements ChatPort {
  private readonly client: ConvexClient;
  private readonly messagesRef: MessagesQuery;
  private readonly sendTurnRef: SendTurnMutation;

  constructor({ client, functions }: ConvexChatAdapterOptions) {
    this.client = client;
    this.messagesRef = makeFunctionReference<'query', { petId: string }, readonly ChatMessage[]>(
      functions?.messages ?? 'chat:messages',
    ) as MessagesQuery;
    this.sendTurnRef = makeFunctionReference<
      'mutation',
      { petId: string; text: string },
      { turnId: string }
    >(functions?.sendTurn ?? 'chat:sendTurn') as SendTurnMutation;
  }

  async sendTurn(turn: ChatTurn): Promise<void> {
    const validated = ChatTurnSchema.parse(turn);
    await this.client.mutation(this.sendTurnRef, validated);
  }

  subscribeMessages(petId: string, listener: MessageListener): Unsubscribe {
    const unsubscribe = this.client.onUpdate(this.messagesRef, { petId }, (result) => {
      listener(result);
    });
    // `onUpdate` returns an `Unsubscribe` object that is callable and has
    // extra properties; the ChatPort contract only needs the callable side.
    return () => {
      unsubscribe();
    };
  }
}
