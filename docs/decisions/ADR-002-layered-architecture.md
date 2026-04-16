# ADR-002 — Layered architecture: kernel, primitives, Domain Pack, shell

**Status:** Accepted
**Date:** 2026-04-16
**Deciders:** Thiago
**Supersedes:** —

## Context

petstory.co targets pet health today, but the long-term bet is that the same engine — conversational chat → event extraction → auto-generated diary → proactive nudges → longitudinal correlation — is applicable to human health, travel, kids' diaries, and other domains where an individual's daily story accumulates value over time.

Two observations from the 2026 landscape forced the decision:

1. Startup pivot research shows **horizontal → vertical pivots are smooth; vertical → horizontal pivots are the brutal ones**. A codebase that bakes domain assumptions into every layer requires a rewrite, not a refactor, when the second vertical arrives.
2. Vertical SaaS 2.0 winners (healthcare, energy, IoT) consistently share a horizontal core under a vertical activation layer. "Coexistence" — horizontal foundation + vertical specialization — is the shape that scales.

The question: adopt the constraint on day one or accept a rewrite later.

## Decision

Adopt a four-layer architecture with strict inward dependencies:

- **L0 — Agent Kernel** (domain-agnostic runtime)
- **L1 — Conversation & Narrative Primitives** (domain-agnostic interaction shape)
- **L2 — Domain Pack** (vertical-specific, pluggable)
- **L3 — Product Shell** (vertical-specific UI + brand)

Dependencies flow strictly `L3 → L2 → L1 → L0`. No package in L0 or L1 imports from L2 or L3. Enforced in CI via import-boundary linting. `petstory` labels only the Product Shell and the Domain Pack; the kernel is brand-neutral.

Full spec — layer contents, Domain Pack contract (eight required exports), anti-patterns — in [../architecture/layers.md](../architecture/layers.md).

## Rationale

### Why four layers, not three or five

Three (kernel / pack / shell) collapses the distinction between "runtime" and "interaction shape." The interaction shape (chat-first loop, auto-diary, nudges) is opinionated but still domain-agnostic — it deserves its own layer so it can be reused without dragging in pet-specific schemas.

Five (splitting the kernel into "harness" and "ports") adds a boundary without a user. One kernel, many ports, is cleaner.

### Why a strict dependency rule, not a recommended one

Architectural rot in layered systems comes from "just this once" imports that accrete. Linting the boundary makes violations loud and mergeable only with intent. The cost is a lint rule; the benefit is the architecture holding its shape under pressure.

### Why MCP is load-bearing

MCP is the cleanest domain-boundary contract the ecosystem has. A Domain Pack exposes its tools as an MCP surface; the kernel loads that surface and orchestrates over it. Swapping packs becomes "load a different MCP server + Flow Catalog." The 1,600+ public MCP servers (March 2026) and the "build once, use everywhere" norm suggest this bet ages well.

### Why the stack from ADR-001 still holds

ADR-001 chose Expo, Clerk, Convex, Agent SDK, Haiku/Sonnet/Opus tiering, Managed Agents, Stripe/RevenueCat, Braintrust/Sentry/PostHog, Vercel. All of those are **kernel-level adapters** in this new model:

- Expo / RN Web — channel adapter (L0 port, L3 host)
- Clerk — auth adapter
- Convex — storage / realtime / vector adapter
- Agent SDK — orchestration adapter
- Anthropic models — LLM adapter
- Managed Agents — long-horizon execution adapter
- Stripe / RevenueCat — payments adapter
- Braintrust / Sentry / PostHog — observability adapters

None are pet-specific. ADR-001 stands.

### Alternatives rejected

- **Vertical-only codebase, refactor later.** Cheapest today, most expensive later. Rejected on the horizontal-pivot data.
- **Microservices per layer.** Overkill at scale zero. Modular monolith with linted boundaries gives the same dependency discipline without the ops surface.
- **Plugin-only architecture with runtime loading.** Loses compile-time type safety and testing discipline. A pack is a TypeScript package that ships with the build, not a plugin resolved at runtime.
- **LangChain-style monolithic framework.** Same capability with more indirection, locks us to a vendor's abstractions. See also ADR-001 rejection.

## Consequences

### Positive

- Cross-domain reuse is a compile-time operation (swap the pack), not a rewrite.
- Boundary-linted code resists domain pollution under team growth.
- The kernel is itself a productizable surface if we ever want to offer it to other builders.
- MCP alignment means Domain Packs are portable across any MCP client, not locked to petstory's shell.

### Negative / risks

- Discipline tax. Adding a clinical rule means registering a hook at L2, not hard-coding at L0 — slower in the micro, saner in the macro.
- More packages to manage. Monorepo tooling (pnpm + Turborepo) is required; postponing the monorepo postpones the boundaries.
- Naming overhead. The kernel needs its own identifier eventually (see Q2 in [open-questions.md](../open-questions.md)).
- Extractor parameterization is non-trivial. An event schema that's generic enough for pet-health, human-health, and travel needs careful design — this is real work in L1.

## Follow-ups

- [ADR-003](ADR-003-three-level-agent-framework.md): Three-level agent framework (Spine + Flow Catalog + Situation Classifier) — operationalizes how L0 runs L2 flows.

Future ADRs (numbers assigned when the work begins; listed here to keep the work visible):

- Kernel public name — when a second pack is roadmapped or a first external consumer approaches.
- Monorepo layout and boundary-lint configuration — when the first L2 pack starts being built.
- `DomainSchema` parameterization strategy — how generic the event extractor should be before pack specializations bind concrete types.
