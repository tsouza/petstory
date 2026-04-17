# petstory.co

> Intelligent pet-health app. Chat-first diary, auto-extracted events, proactive nudges, longitudinal correlation. Built on a brand-neutral agent kernel — pet-health is the first vertical on top of reusable layers.

## Status

Pre-code scaffold. Monorepo seeded, docs canonical, CI wired, no feature code yet. Flow Catalog v1 sketched in [`docs/architecture/flow-catalog.md`](docs/architecture/flow-catalog.md); pet-health pack exists as an empty shell with its Ubiquitous Language glossary.

## Stack

Expo (React Native New Arch) + Expo Router SSR · NativeWind + React Native Reusables · React Hook Form + Zustand · Clerk · Convex · Claude Agent SDK · Mastra (flow runtime) · Haiku/Sonnet/Opus tiered · Claude Managed Agents · Stripe/RevenueCat · Braintrust/Sentry/PostHog · Bun (local dev) · Turborepo · Changesets.

Full rationale in [`docs/stack.md`](docs/stack.md) and [`docs/decisions/`](docs/decisions/).

## Architecture

Four layers with strict inward dependencies (`L3 → L2 → L1 → L0`):

- **L0 — Agent Kernel** (domain-agnostic): ports, flow runtime, critic harness, pack loader.
- **L1 — Conversation & Narrative Primitives** (domain-agnostic): chat-first loop, event extractor, diary, nudges, shared-access.
- **L2 — Domain Pack** (vertical-specific): pet-health today; human-health, tripstory, etc. tomorrow.
- **L3 — Product Shell**: Expo mobile + RN Web apps.

See [`docs/architecture/layers.md`](docs/architecture/layers.md) and [`ADR-002`](docs/decisions/ADR-002-layered-architecture.md).

Agent loop: three-level framework (Execution Spine + Flow Catalog + Situation Classifier) per [`ADR-003`](docs/decisions/ADR-003-three-level-agent-framework.md). Mastra is the Flow runtime, our Flow DSL is a thin typed wrapper that enforces pack-level invariants per [`ADR-007`](docs/decisions/ADR-007-bun-for-local-development.md).

## Engineering rules

23 non-negotiable rules in [`docs/engineering-rules.md`](docs/engineering-rules.md), phased by project stage. R0 (no over-engineering) is the veto rule above the others. Security (R8) and observability (R6) are cross-cutting concerns threaded through every decision.

## Quick start

**Prerequisites:** Bun 1.3+, Node 22 LTS (fallback for Metro + Convex CLI), [just](https://just.systems/).

```bash
just install         # bun install
just install-hooks   # lefthook install
just ci              # full local CI (lint + typecheck + test + knip + depcruise)
```

Every canonical task is a `just` target per R23 — `just --list` for the full menu.

## Layout

```
apps/                   L3 shells (petstory-mobile, petstory-web)
packages/
  kernel/               L0 — agent kernel
  conversation/         L1 — chat-first turn loop
  diary/                L1 — auto-generated diary
  nudges/               L1 — proactive nudges
  shared-access/        L1 — invites + scope + duration
  packs/pet-health/     L2 — first Domain Pack (+ glossary.md)
  ui/                   L3 primitives
  config/               shared base configs
  test-utils/           shared test helpers
convex/                 shared backend (Convex cloud)
docs/                   canonical docs + ADRs (includes user-stories/ JTBD files)
.claude/                sub-agents, skills, commands, conventions
```

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the branch → commit → PR flow, Conventional Commits + branch naming (R10 + R21), testing expectations (R4), and the canonical `just` interface (R23).

## License

No license granted. All rights reserved. This repository is public for transparency and collaboration with invited contributors; contact the owner for usage permissions beyond that.
