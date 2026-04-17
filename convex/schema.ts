import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Per ADR-005, Convex lives at the repo root and is shared by both apps
// (@petstory/mobile + @petstory/web). Per ADR-004, each Domain Pack will
// contribute its event schema (MealRefused, SymptomObserved, …) via the
// pack-loader (packages/kernel/src/pack-loader/).
//
// Stage A (this PR): chat mid-tier only — `messages` backs the chat UI's
// reactive stream. The pack-contributed `events` table lands when the
// pet-health pack is wired.
//
// Field shape mirrors kernel's ChatMessage (packages/kernel/src/ports/chat.ts)
// so the ConvexChatAdapter can pass server docs through unchanged. We store
// our own `messageId` in addition to Convex's auto `_id` because the kernel
// ID scheme (`msg_<uuid>`, `turn_<uuid>`) is the stable identifier across
// every adapter — InMemory, Convex, cassette. Downstream code never keys
// off backend-specific IDs.
export default defineSchema({
  messages: defineTable({
    messageId: v.string(),
    petId: v.string(),
    turnId: v.string(),
    author: v.union(v.literal('user'), v.literal('assistant'), v.literal('system')),
    // Open-ended card payload (`kind: 'text' | 'meal' | …`). Per ADR-004 the
    // kernel stores payloads as opaque JSON; card-registry schemas validate
    // at the rendering boundary.
    payload: v.any(),
    createdAt: v.number(),
  }).index('by_pet_created', ['petId', 'createdAt']),
});
