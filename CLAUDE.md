# PetStory — project context

> App de saúde inteligente para pets. Registra o dia a dia do animal (alimentação, sintomas, comportamento, eventos) e usa IA para correlacionar padrões e gerar insights clínicos. "Prontuário vivo" conversacional.

This file is auto-loaded by Claude Code. Keep it short; point to `docs/` for depth.

## Non-negotiables

Read these before proposing anything:

- **Layered architecture** — [`docs/architecture/layers.md`](docs/architecture/layers.md). petstory is the first vertical on a brand-neutral kernel. Strict inward dependency: `shell → pack → primitives → kernel`. No pet concepts in kernel or primitives. See [`ADR-002`](docs/decisions/ADR-002-layered-architecture.md).
- **Agent framework** — [`docs/architecture/flow-catalog.md`](docs/architecture/flow-catalog.md). Three-level model: Execution Spine (kernel) + Flow Catalog (pack) + Situation Classifier (pack). No bespoke loops outside the Flow DSL. See [`ADR-003`](docs/decisions/ADR-003-three-level-agent-framework.md).
- **Monorepo structure** — [`docs/decisions/ADR-005-monorepo-structure-and-tooling.md`](docs/decisions/ADR-005-monorepo-structure-and-tooling.md) + [`ADR-007`](docs/decisions/ADR-007-bun-for-local-development.md) (Bun supersedes pnpm for local dev). **Bun** + Turborepo + Changesets. `apps/` + `packages/` split; shared base configs in `packages/config/`; workspace protocol for inter-package deps; independent per-package semver. Node 22 stays as fallback for Metro + Convex CLI.
- **Brand tokens** — [`docs/brand.md`](docs/brand.md). Never invent colors; use the single source of truth.
- **Data Humanism rules** — [`docs/data-humanism.md`](docs/data-humanism.md). The 4 pillars + 10 rules govern every data display and AI response.
- **Viz simplicity** — [`docs/viz-rules.md`](docs/viz-rules.md). Max 1+1 dimensions. No line charts. Cute/light/simple only.
- **UX concept** — [`docs/ux-concept.md`](docs/ux-concept.md). Chat-first + auto-generated diary + proactive nudges.
- **Clinical safety** — AI suggests, never diagnoses. Always recommend vet escalation on red-flag symptoms. Never output dosage/prescription language. Lives as pack-registered critic rules (not hard-coded in kernel).
- **Engineering rules** — [`docs/engineering-rules.md`](docs/engineering-rules.md). **R0 (no over-engineering) is the veto rule** and sits above the others — when any rule would produce ceremony disproportionate to the problem, R0 wins. Security (R8) and observability (R6) are cross-cutting concerns, read every decision through both lenses. Rules are phased: see the Phasing table for what's live pre-code vs. at Beta vs. at scale. Full list covers research discipline, version policy, modern patterns, testing (vanguard UI + agent evals + targeted mutation), type safety, observability, perf budgets, security, a11y + i18n, Conventional Commits, PR gates, feature flags, reliability/SLOs, the standardized toolchain (Biome, Lefthook, commitlint, Knip, gitleaks, etc.), code integrity (no placeholders/silent fallbacks), YAGNI + scope fidelity, naming honesty, layer-promotion rule of three, doc DRY, library adoption, small-step iteration on per-change branches with Conventional-Commits naming, GRASP core + Open/Closed for reusable layers, and Justfile as the ultimate project frontend (every canonical task invoked via `just <target>`). Exceptions require an ADR.

## Stack

See [`docs/stack.md`](docs/stack.md) and [`docs/decisions/ADR-001-stack.md`](docs/decisions/ADR-001-stack.md).

TL;DR: Expo (RN New Arch) + Expo Router SSR + NativeWind + React Native Reusables + React Hook Form + Zustand + Clerk + Convex + Claude Agent SDK + Mastra (flow runtime) + Haiku/Sonnet/Opus tiered + Claude Managed Agents for async + Stripe/RevenueCat + Braintrust/Sentry/PostHog.

## Product

- **Vision** — [`docs/vision.md`](docs/vision.md)
- **Market & financing** — [`docs/market.md`](docs/market.md)
- **User stories** — [`user-stories/INDEX.md`](user-stories/INDEX.md) (123 stories across 16 categories). See also [`docs/user-stories.md`](docs/user-stories.md) for how we write them.
- **Open questions** — [`docs/open-questions.md`](docs/open-questions.md)

## How Thiago works

See [`.claude/CONVENTIONS.md`](.claude/CONVENTIONS.md). Highlights:

- Respect literal scope. "The pad" means exactly that element, not siblings.
- When he hand-crafts a reference during iteration, use his values verbatim — don't re-tune algorithms.
- Write docs and explanations as prose, not bulleted walls. Lists only when genuinely list-shaped.
- PT/EN code-mixing is normal. Product copy is PT-BR. Code and internal docs in EN.

## Sub-agents available

- `architecture-guardian` — flags cross-layer leaks and dependency-rule violations.
- `flow-catalog-reviewer` — reviews any proposed new Flow against the DSL and catalog invariants.
- `brand-guardian` — refuses/flags brand-token violations.
- `viz-judge` — enforces [`docs/viz-rules.md`](docs/viz-rules.md) on any viz proposal.
- `ux-concept-keeper` — checks features against [`docs/ux-concept.md`](docs/ux-concept.md).
- `clinical-safety-reviewer` — gates user-facing medical text.
- `user-story-author` — knows the Job Stories template and writes new US-*.md files.

## Slash commands

- `/review-viz <file>` — run viz-judge over a mockup.
- `/new-us` — scaffold a new user story in the correct format.
- `/handoff <screen>` — produce a design → engineering handoff spec.

## Skills

- `brand-apply` — inject tokens, pick warm/cool background, color the logo.
- `data-humanism-viz` — guided creation flow for a new viz following the 10 rules.
- `prontuario-vivo-entry` — format a diary entry consistently (tone, structure, DH1–DH10).
- `new-user-story` — scaffold a US-*.md with correct frontmatter and AC format.

## When in doubt

- Architecture / layer question → [`docs/architecture/layers.md`](docs/architecture/layers.md)
- Agent loop / flow question → [`docs/architecture/flow-catalog.md`](docs/architecture/flow-catalog.md)
- Frontend design question → [`docs/ux-concept.md`](docs/ux-concept.md) + [`docs/data-humanism.md`](docs/data-humanism.md)
- Backend / stack question → [`docs/stack.md`](docs/stack.md)
- Writing a user story → [`docs/user-stories.md`](docs/user-stories.md) + template in `.claude/skills/new-user-story/`
- Can't find it → ask before inventing.
