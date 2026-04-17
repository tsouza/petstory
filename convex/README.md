# Convex backend

Per [ADR-005](../docs/decisions/ADR-005-monorepo-structure-and-tooling.md), Convex lives at the repo root (not a workspace). Both `@petstory/mobile` and `@petstory/web` share this single backend.

## What's here (Stage A — chat mid-tier)

- `schema.ts` — `messages` table backing the chat UI's reactive stream. Event tables arrive when the pet-health pack is wired per [ADR-004](../docs/decisions/ADR-004-ddd-strategic-adoption.md).
- `chat.ts` — the turn orchestrator:
  - `messages` (query) — reactive message list, indexed `by_pet_created`.
  - `sendTurn` (mutation) — inserts the user message and schedules `runTurn`.
  - `runTurn` (internal action) — calls the LLM server-side (`lib/llm.ts`) and appends the reply.
  - `insertAssistantMessage` (internal mutation) — the action's write-back helper.
- `lib/llm.ts` — server-side LLM client. Picks provider from env:
  - `BITNET_BASE_URL` present → call the local bitnet.cpp server (OpenAI-compat).
  - Otherwise → echo fallback so the pipeline still renders something.
  - `ANTHROPIC_API_KEY` hooks in at Stage C.
- `auth.config.ts` — Clerk JWT integration. Stage A tolerates a missing `CLERK_JWT_ISSUER_DOMAIN` for anonymous dev; Stage B flips real auth on.

## Architectural invariant

**The browser never calls the LLM directly.** All LLM I/O happens in Convex actions. Keys, endpoints, and provider choice live server-side only. The `ConvexChatAdapter` (kernel) is a thin bridge: it speaks Convex's `mutation` / `onUpdate` API, nothing more.

## Running locally

1. `just install` — dependencies.
2. First run of `just convex-dev` prompts you to create a deployment and writes `CONVEX_DEPLOYMENT` + `CONVEX_URL` to `.env.local`. It also writes `_generated/` types.
3. Copy the resulting deployment URL to `EXPO_PUBLIC_CONVEX_URL` so the mobile app wires `ConvexChatAdapter` (instead of the in-memory echo fallback).
4. `just dev` starts BitNet + Convex + Metro together.

Without `EXPO_PUBLIC_CONVEX_URL` the app falls back to `InMemoryChatAdapter` so `just mobile-web` and the Playwright smoke stay usable without a deployment.

## Server-side envs (set via `npx convex env set` or the Convex dashboard)

| Var | Purpose | Stage |
| --- | --- | --- |
| `BITNET_BASE_URL` | OpenAI-compat server URL, e.g. `http://host.docker.internal:11434` | A |
| `BITNET_MODEL` | Override model id (default `bitnet-b1.58-2B-4T`) | A |
| `ANTHROPIC_API_KEY` | Production adapter key | C |
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk issuer for real auth | B |

## Why Generic builders instead of `_generated/server`?

`convex/chat.ts` uses `mutationGeneric`, `internalActionGeneric`, etc. from `convex/server` so the module builds without having run `convex dev` at least once. When CI touches the repo on a fresh clone, no codegen step is required. Typed refs (via `_generated/api`) become available after the first `just convex-dev`; Stage B can swap them in without breaking the public API.

## Per-pack schema composition (future)

When a Domain Pack lands, its event schema is exported via the pack manifest's `events` artifact. The pack-loader (`packages/kernel/src/pack-loader/`) composes loaded-pack schemas into `schema.ts` at build time. Each Domain Event's PII class (per R8 + the pack's `glossary.md`) maps to Convex schema tags for log redaction and Sentry `beforeSend`.
