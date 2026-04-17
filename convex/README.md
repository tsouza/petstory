# Convex backend

Per [ADR-005](../docs/decisions/ADR-005-monorepo-structure-and-tooling.md), Convex lives at the repo root (not a workspace). Both `@petstory/mobile` and `@petstory/web` share this single backend.

## Bootstrap status

- `schema.ts` — empty (`defineSchema({})`) until packs contribute their Domain Event schemas per [ADR-004](../docs/decisions/ADR-004-ddd-strategic-adoption.md).
- `auth.config.ts` — Clerk JWT wiring. Requires `CLERK_JWT_ISSUER_DOMAIN` env var (from Clerk dashboard → JWT Templates → Convex → Issuer).
- No functions, no HTTP handlers, no crons yet — those land when the kernel's storage port + nudges scheduler need them.

## Running locally

1. Install dependencies: `just install` at the repo root (per R23 + ADR-007).
2. Set `CONVEX_DEPLOY_KEY` and `CLERK_JWT_ISSUER_DOMAIN` in `.env.local` (see R8 — never commit secrets).
3. Run `just convex-dev` to start the dev deployment. This creates the `_generated/` types directory (committed) and syncs on save.

## Per-pack schema composition

When a Domain Pack lands, its event schema is exported via the pack manifest's `events` artifact. The pack-loader (`packages/kernel/src/pack-loader/`) composes loaded-pack schemas into `schema.ts` at build time. Each Domain Event's PII class (per R8 + the pack's `glossary.md`) maps to Convex schema tags for log redaction and Sentry `beforeSend`.
