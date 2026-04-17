import { defineSchema } from 'convex/server';

// Per ADR-005, Convex lives at the repo root and is shared by both apps
// (@petstory/mobile + @petstory/web).
//
// Per ADR-004, each Domain Pack exports its event schema (artifact 1) with
// PII class per Domain Event. The pack-loader
// (packages/kernel/src/pack-loader/) composes loaded-pack schemas into this
// file at build time.
//
// Empty schema today — no tables exist until the pet-health pack is wired
// in and its Domain Event types (MealRefused, SymptomObserved, etc.) are
// registered.
export default defineSchema({});
