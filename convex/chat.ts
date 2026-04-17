import {
  internalActionGeneric,
  internalMutationGeneric,
  makeFunctionReference,
  mutationGeneric,
  queryGeneric,
} from 'convex/server';
import { v } from 'convex/values';
import { generateReply } from './lib/llm';

// Mid-tier chat orchestration. Browser clients talk here; the LLM call
// (see lib/llm.ts) happens server-side only. Never expose LLM credentials
// or endpoints to the browser — that's the architectural invariant this
// module exists to enforce.
//
// Flow for one user turn:
//   1. `sendTurn` mutation    — append the user message, schedule `runTurn`.
//   2. `runTurn` action       — call the LLM, invoke `insertAssistantMessage`.
//   3. `insertAssistantMessage` internal mutation — append assistant reply.
// The `messages` query is a reactive subscription; the client receives
// incremental updates as each message lands.
//
// We intentionally bypass `_generated/api` via `makeFunctionReference` so
// the code builds without running `convex dev` once. Typed generated refs
// are a nicety, not a requirement — Stage B can swap in the generated
// `internal` proxy when it's available.

const runTurnRef = makeFunctionReference<
  'action',
  { petId: string; turnId: string; userText: string },
  null
>('chat:runTurn');

const insertAssistantRef = makeFunctionReference<
  'mutation',
  { petId: string; turnId: string; text: string },
  null
>('chat:insertAssistantMessage');

// Shape returned over the wire — matches kernel's ChatMessage type exactly
// so the ConvexChatAdapter can forward without remapping.
interface ChatMessageWire {
  id: string;
  petId: string;
  turnId: string;
  author: 'user' | 'assistant' | 'system';
  payload: { kind: string; [k: string]: unknown };
  createdAt: number;
}

function randomId(prefix: 'msg' | 'turn'): string {
  // Convex runtime exposes `crypto.randomUUID` (Node 19+ + Deno).
  return `${prefix}_${crypto.randomUUID()}`;
}

export const messages = queryGeneric({
  args: { petId: v.string() },
  handler: async (ctx, { petId }): Promise<readonly ChatMessageWire[]> => {
    const docs = await ctx.db
      .query('messages')
      .withIndex('by_pet_created', (q: { eq: (field: string, value: string) => unknown }) =>
        q.eq('petId', petId),
      )
      .order('asc')
      .collect();
    return docs.map((d: Record<string, unknown>) => ({
      id: d.messageId as string,
      petId: d.petId as string,
      turnId: d.turnId as string,
      author: d.author as ChatMessageWire['author'],
      payload: d.payload as ChatMessageWire['payload'],
      createdAt: d.createdAt as number,
    }));
  },
});

export const sendTurn = mutationGeneric({
  args: { petId: v.string(), text: v.string() },
  handler: async (ctx, { petId, text }): Promise<{ turnId: string }> => {
    const turnId = randomId('turn');
    const now = Date.now();
    await ctx.db.insert('messages', {
      messageId: randomId('msg'),
      petId,
      turnId,
      author: 'user',
      payload: { kind: 'text', text },
      createdAt: now,
    });
    await ctx.scheduler.runAfter(0, runTurnRef, { petId, turnId, userText: text });
    return { turnId };
  },
});

export const runTurn = internalActionGeneric({
  args: { petId: v.string(), turnId: v.string(), userText: v.string() },
  handler: async (ctx, { petId, turnId, userText }): Promise<null> => {
    const replyText = await generateReply(userText);
    await ctx.runMutation(insertAssistantRef, { petId, turnId, text: replyText });
    return null;
  },
});

export const insertAssistantMessage = internalMutationGeneric({
  args: { petId: v.string(), turnId: v.string(), text: v.string() },
  handler: async (ctx, { petId, turnId, text }): Promise<null> => {
    await ctx.db.insert('messages', {
      messageId: randomId('msg'),
      petId,
      turnId,
      author: 'assistant',
      payload: { kind: 'text', text },
      createdAt: Date.now(),
    });
    return null;
  },
});
