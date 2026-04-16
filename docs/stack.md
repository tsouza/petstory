# Stack

Decided April 2026. See [decisions/ADR-001-stack.md](decisions/ADR-001-stack.md) for rationale and alternatives considered.

## Summary

| Layer | Choice |
|---|---|
| Client (mobile + web) | Expo SDK 52+ (React Native New Architecture) + Expo Router; RN Web for browser |
| Auth | Clerk |
| Backend / DB / realtime / storage / vector | Convex |
| Agent orchestration | Claude Agent SDK (TypeScript), in-process MCP tools |
| Models | Haiku 4.5 default, Sonnet 4.6 for insights, Opus 4.6 for premium correlations |
| Long-running async | Claude Managed Agents (public beta, April 2026) |
| Prompt caching | 1-hour extended cache on pet profile + medical KB + skills |
| Images | Convex storage + Claude Vision |
| Push | Expo Notifications + Convex scheduled functions |
| Payments | Stripe (web) + RevenueCat (iOS/Android IAP bridge) |
| Observability | Braintrust (LLM evals), Sentry (crashes), PostHog (product analytics) |
| Marketing / extra compute | Vercel (Fluid compute + AI Gateway) |

## Agent architecture

- **Custom in-process MCP tools** as domain API: `record_event`, `get_pet_timeline`, `query_medical_kb`, `schedule_nudge`, `flag_clinical_anomaly`, `generate_vet_report`.
- **Skills** (versionable prompt assets): `diario-narrativo`, `triagem-sintomas`, `correlacao-comportamento`, `relatorio-veterinario`.
- **Sub-agents**: `diary-writer` (Haiku, fast), `clinical-analyzer` (Sonnet, extended thinking), `nudge-scheduler` (background).
- **Hooks** for guardrails: no prescription language, always escalate red-flag symptoms.

## Model routing

- Per-message chat, diary extraction, simple event classification → **Haiku 4.5**
- Weekly insight runs, correlation detection, premium chat → **Sonnet 4.6**
- Complex clinical reasoning (extended thinking, rare, premium-gated) → **Opus 4.6**

## Compute topology

1. Convex actions call Anthropic API (Agent SDK harness) for live chat turns.
2. Convex scheduled functions trigger background agent runs.
3. Long async jobs (>5 min or sandboxed code) → delegate to Claude Managed Agents.
4. Marketing site + Node-heavy server logic → Vercel.

## Vector & RAG

- Start: Convex vector search (fits 100k–1M vectors per tenant).
- If outgrown: Turbopuffer (serverless, cheap cold storage).

## Medical KB handling

Curated structured KB from vetted sources (AAHA, AVMA, licensed vet content). Embedded and exposed via `query_medical_kb` MCP tool. Hard-coded hook: never output treatment/dosage without "consult your vet" escalation. See [clinical-safety-reviewer](../.claude/agents/clinical-safety-reviewer.md) sub-agent.

## Explicitly rejected

- **Flutter** — Dart cuts off from JS/TS AI tooling where Anthropic ecosystem lives.
- **LangChain/LangGraph** as main agent framework — Agent SDK is Anthropic-native, same capability, less indirection.
- **Firebase** — offline/sync is nice but TS-native reactive model and AI story are weaker than Convex.
- **DIY auth** — zero strategic value.
- **DIY agent loop** — the Agent SDK exists; use it.
