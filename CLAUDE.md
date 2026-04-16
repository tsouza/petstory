# PetStory — project context

> App de saúde inteligente para pets. Registra o dia a dia do animal (alimentação, sintomas, comportamento, eventos) e usa IA para correlacionar padrões e gerar insights clínicos. "Prontuário vivo" conversacional.

This file is auto-loaded by Claude Code. Keep it short; point to `docs/` for depth.

## Non-negotiables

Read these before proposing anything user-facing:

- **Brand tokens** — [`docs/brand.md`](docs/brand.md). Never invent colors; use the single source of truth.
- **Data Humanism rules** — [`docs/data-humanism.md`](docs/data-humanism.md). The 4 pillars + 10 rules govern every data display and AI response.
- **Viz simplicity** — [`docs/viz-rules.md`](docs/viz-rules.md). Max 1+1 dimensions. No line charts. Cute/light/simple only.
- **UX concept** — [`docs/ux-concept.md`](docs/ux-concept.md). Chat-first + auto-generated diary + proactive nudges.
- **Clinical safety** — AI suggests, never diagnoses. Always recommend vet escalation on red-flag symptoms. Never output dosage/prescription language.

## Stack

See [`docs/stack.md`](docs/stack.md) and [`docs/decisions/ADR-001-stack.md`](docs/decisions/ADR-001-stack.md).

TL;DR: Expo (RN New Arch) + Clerk + Convex + Claude Agent SDK + Haiku/Sonnet/Opus tiered + Claude Managed Agents for async + Stripe/RevenueCat + Braintrust/Sentry/PostHog.

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
- `prontuario-vivo-entry` — format a diary entry consistently (tone, structure, R1–R10).
- `new-user-story` — scaffold a US-*.md with correct frontmatter and AC format.

## When in doubt

- Frontend design question → [`docs/ux-concept.md`](docs/ux-concept.md) + [`docs/data-humanism.md`](docs/data-humanism.md)
- Backend/agent question → [`docs/stack.md`](docs/stack.md)
- Writing a user story → [`docs/user-stories.md`](docs/user-stories.md) + template in `.claude/skills/new-user-story/`
- Can't find it → ask before inventing.
