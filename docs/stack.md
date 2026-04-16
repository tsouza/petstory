# Stack

Decided April 2026. See [decisions/ADR-001-stack.md](decisions/ADR-001-stack.md) for rationale and alternatives considered.

## Layering note (read this first)

Per [ADR-002](decisions/ADR-002-layered-architecture.md), every choice below is a **kernel-level adapter** (L0), not a pet-health-specific decision. Swapping domains later means swapping the Domain Pack (L2) and Product Shell (L3); the stack table below stays. Convex, Clerk, the Agent SDK, Anthropic models, Managed Agents, Stripe/RevenueCat, Braintrust/Sentry/PostHog, and Vercel are portable across `pet-health`, `human-health`, future `tripstory-trips`, or any other vertical we ship.

## Summary

| Layer | Choice |
|---|---|
| Client (mobile + web) | Expo SDK 52+ (React Native New Architecture) + Expo Router; RN Web for browser |
| Auth | Clerk |
| Backend / DB / realtime / storage / vector | Convex |
| Agent orchestration (per-node) | Claude Agent SDK (TypeScript), in-process MCP tools |
| Flow runtime (graph execution) | Mastra (TS-native workflows, MCP-first) |
| Models | Haiku 4.5 default, Sonnet 4.6 for insights, Opus 4.6 for premium correlations |
| Long-running async | Claude Managed Agents (public beta, April 2026) |
| Prompt caching | 1-hour extended cache on pet profile + medical KB + skills |
| Images | Convex storage + Claude Vision |
| Push | Expo Notifications + Convex scheduled functions |
| Payments | Stripe (web) + RevenueCat (iOS/Android IAP bridge) |
| Observability | Braintrust (LLM evals), Sentry (crashes), PostHog (product analytics) |
| Marketing / extra compute | Vercel (Fluid compute + AI Gateway) |

## Agent architecture

Operationalized by the three-level framework in [architecture/flow-catalog.md](architecture/flow-catalog.md). Kernel owns the Execution Spine and the Flow runtime; the pet-health Domain Pack owns the Flow Catalog, Situation Classifier, MCP tools, Skills, and critic rules.

- **Custom in-process MCP tools** (pack-level, L2 pet-health): `record_event`, `get_pet_timeline`, `query_medical_kb`, `schedule_nudge`, `flag_clinical_anomaly`, `generate_vet_report`.
- **Skills** (pack-level prompt assets): `diario-narrativo`, `triagem-sintomas`, `correlacao-comportamento`, `relatorio-veterinario`.
- **Sub-agents registered as Flow node types** (pack-level): `diary-writer` (Haiku), `clinical-analyzer` (Sonnet, extended thinking), `nudge-scheduler` (background).
- **Critic rules** (pack-level hooks into kernel harness): no prescription language, red-flag escalation. Never hard-coded in the kernel.

### Flow runtime choice

**Mastra** runs the Flow graphs; **Claude Agent SDK** runs each node's agent harness. Rejected alternatives: LangGraph.js (heavier, competes with Agent SDK), Vercel AI SDK + Workflow (primitives lower-level than Flow graphs), Inngest AgentKit (platform overlaps with Convex schedules), DSPy (optimizer-first, wrong shape). Rejected building custom (validated Mastra covers runtime; our value-add is the pack-level Flow contract, not graph execution). See ADR-003 for rationale.

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
