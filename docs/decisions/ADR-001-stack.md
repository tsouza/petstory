# ADR-001 — Cross-platform agentic stack

**Status:** Accepted
**Date:** 2026-04-16
**Deciders:** Thiago
**Supersedes:** —

## Context

PetStory MVP needs a cross-platform (iOS, Android, web) client backed by an agentic core (chat-first diary, auto-extraction, proactive nudges, longitudinal pattern correlation). Anthropic is the model provider of choice. The project is being bootstrapped by a senior engineer with limited ops bandwidth; low operational surface matters.

## Decision

Adopt the following stack:

| Layer | Choice |
|---|---|
| Client | Expo SDK 52+ (RN New Architecture) + Expo Router, RN Web for browser |
| Auth | Clerk |
| Backend | Convex (DB, realtime, storage, functions, vector, schedules) |
| Agent orchestration | Claude Agent SDK (TypeScript), in-process MCP tools |
| Models | Haiku 4.5 default, Sonnet 4.6 insights, Opus 4.6 premium correlations |
| Long-running async | Claude Managed Agents (public beta, April 2026) |
| Payments | Stripe + RevenueCat |
| Observability | Braintrust + Sentry + PostHog |
| Extra compute / marketing | Vercel |

## Rationale

### Client — Expo (RN New Arch) over Flutter / Lynx

- Jan 2026: Expo is officially the recommended way to start RN.
- New Architecture (JSI + Fabric + TurboModules) closed most of Flutter's perf gap.
- **One language** (TypeScript) for client + server + agent tools — no glue layer.
- **EAS Build + EAS Update** enable OTA JS bundle pushes (ship hotfixes without App Store review).
- **RN Web** covers petstory.co from the same codebase.
- **Expo Skills + Expo MCP** are already tuned for Claude Code; dev velocity multiplier.

Flutter would win on pixel-perfect custom animations but loses on AI ecosystem. Lynx (ByteDance) is too early for MVP.

### Agent — Claude Agent SDK over LangGraph / DIY

The Agent SDK gives the same loop powering Claude Code: tool use, context management, sub-agents, hooks, skills, built-in tool search. Anthropic-native, less indirection. DIY agent loop has zero strategic value.

Pattern used:

- Custom in-process MCP tools = domain API
- Skills (markdown) = versionable prompt-engineering assets
- Sub-agents = isolated contexts per task type
- Hooks = guardrails (no prescription language, red-flag escalation)

### Model tiering

- Haiku 4.5 — cheap per-message chat, diary extraction, classification
- Sonnet 4.6 — weekly insights, correlation, premium chat
- Opus 4.6 — complex clinical reasoning, extended thinking, gated to premium

Route via a heuristic classifier (regex first, Haiku fallback).

### Prompt caching — mandatory

Cached reads cost 0.1× base input price. Pet profile + medical KB + skills are static-ish. Expect 70–90% input cost reduction with 1-hour extended cache. Since Feb 2026 caching is workspace-isolated; one workspace per env.

### Managed Agents for long-running

$0.08/session-hour + standard tokens. Wrong choice for live chat (latency, cost per short session). Right choice for weekly reports, overnight anomaly scans, longitudinal studies. Anthropic handles sandbox, tool exec, persistent memory store.

### Backend — Convex over Supabase

Convex wins on:

- Reactive queries (chat + timeline update live, zero socket code) — sub-50ms at 5k concurrent
- TypeScript end-to-end types with the client
- Built-in vector search (good for 100k–1M vectors/tenant; pattern correlation = one query)
- File storage → pipe directly to Claude Vision
- Scheduled functions for proactive nudges, weekly reports
- Actions are the perfect host for Agent SDK invocations
- Minimal ops

Supabase would win on SQL familiarity, open-source portability, and RLS maturity. Revisit if open-source portability becomes a hard requirement.

### Rejected alternatives

- **Flutter** — Dart cuts off from JS/TS AI tooling.
- **LangChain/LangGraph** — same capability as Agent SDK with more indirection.
- **Firebase** — TS-native reactive model and AI story are weaker than Convex.
- **Cloudflare Project Think** — philosophically aligned (durable per-pet agent state) but more plumbing. Bookmarked for v2.

## Consequences

Positive:

- Single language across the whole stack → faster iteration.
- OTA updates → hotfixes without app review.
- Convex reactive DB → chat/timeline work with near-zero realtime code.
- Anthropic-native → access to Claude's best agentic features (prompt caching, tool search, sub-agents, managed agents) without porting.

Negative / risks:

- Convex is proprietary. If portability becomes critical later, migration is real work.
- RN Web has rough edges for SEO-heavy marketing pages. Split marketing to Next.js if that becomes a problem.
- RevenueCat is essentially required for cross-platform sub parity; adds a vendor.
- Claude Managed Agents is beta (April 2026); behavior may change.

## Follow-ups

- ADR-002: Convex vs Supabase revisit trigger (e.g. at 10k MAU or if data portability becomes a customer demand).
- ADR-003: SEO strategy (RN Web vs split Next.js marketing site).
