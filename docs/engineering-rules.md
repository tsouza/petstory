# Engineering rules

Non-negotiable. Established 2026-04-16. Every PR, every code review, every ADR lives under these rules.

## Posture

Two meta-principles underneath every rule. First, we are building a consumer clinical-adjacent chat app; "good enough" is calibrated to that. A missed clinical guardrail is worse than a slow ship. Second, this is a layered architecture (ADR-002) with a brand-neutral kernel — rules that constrain the kernel are stricter than rules for the shell.

**Security (R8) and observability (R6) are cross-cutting concerns.** They aren't siloed in their rules — read every rule, ADR, and architectural decision through both lenses. A Flow without observability tags, a pack without PII classification, a kernel PR that widens the trust boundary — these are violations regardless of which numbered rule catches them first.

## The rules

### R0 — No over-engineering (the veto rule)

R0 sits above every other rule in this document. When any rule — including the canonical architectural patterns of ADR-002, ADR-003, or ADR-004 — would produce a solution disproportionate to the problem, R0 vetoes it.

**The R0 question.** Before applying any rule, pattern, or abstraction, answer: *"What's the cheapest thing that fixes the current problem? If we pick anything heavier, what concrete pain earns the weight?"* If you can't name the pain, R0 rejects the proposal.

**R0 specifically rejects:**

- Correct pattern application that adds ceremony without proportional benefit.
- New extension slots, rules, artifacts, or sub-agents with zero current consumers.
- Contract requirements (artifacts, metadata files) required before any instance exists.
- Automation for problems that happen twice a year.
- Abstractions whose value lives in the future, paid for now.
- Process ceremony (on-call rotation, formal postmortems, error-budget policies) at zero users.
- Six-level-deep layering where three would do.
- "This is the right pattern" without a concrete pain it currently solves.

**R0 vs R22 — how they cooperate, not conflict.** R0 gates **whether** to extend the kernel at all (reject if no concrete consumer). R22 gates **how** to extend it **when you legitimately need to** (extension slot, not direct edit). A proposal that passes R0 — "yes, this third pack genuinely needs this capability" — then faces R22 — "and the right way to add it is a new extension slot, not editing the kernel." Both rules active, no conflict.

**R0 does NOT override:**

- **Clinical safety** (DH9, no-dosage, red-flag escalation) — patient harm is not a tradeoff.
- **Security baseline** (R8 — secrets management, license allowlist, PII redaction) — table-stakes, not ceremony.
- **Type safety** (R5) — cheap to keep, expensive to add back.
- **The layered dependency rule** (ADR-002) — without it, the cross-domain-reuse promise collapses.

These are the irreducible floor. Everything else bends under R0.

**R0 enforcement:** every PR and ADR faces the R0 question in review. `architecture-guardian` flags proposals that look like over-engineering (new extension slots with zero current consumers, new pack artifacts required before any pack exists, etc.).

## Phasing — when each rule goes live

Many rules below are written for the production system we'll have, not the pre-code scaffold we have now. Under R0, **minimum viable enforcement** beats **full enforcement** until there's pain to justify the upgrade.

| Phase | Live |
|---|---|
| Pre-code (now) | R0, R1, R2, R5, R8 (baseline), R10, R15, R16, R17, R19, R21 |
| Code exists | R3, R4 (baseline: unit + integration + agent-eval golden path), R7, R9 (i18n layer in code), R20, R22 |
| Beta (first real users) | R6 (full Braintrust + Sentry + PostHog), R11 (CI-enforced gates), R12 (rollout %) |
| Scale (real traffic) | R4 (full: + visual regression + mutation + mobile e2e), R13 (SLOs + error budgets + on-call), R14 (full toolchain) |
| ≥2 packs | R18 (layer promotion) |

R4 and R14 appear twice because they phase in their own coverage: R4 starts with the testing essentials and expands at scale; R14 starts with the minimum toolchain (Biome, Vitest, Gitleaks, basic CI) and expands to the full R14 list at scale. Listing once per phase keeps the scope each phase brings visible.

R0 applies at every phase. A rule listed as "live later" can be adopted earlier when a concrete pain argues for it; likewise, a rule "live now" can be relaxed by ADR if it's producing ceremony.

### R1 — Research-first engineering

No tool, pattern, or library is adopted without verified-current evidence. Evidence means: recent npm adoption trend, current benchmarks, security advisory history, maintainer activity on GitHub. Cite sources in the ADR or PR body. When we deviate from the industry norm, the ADR records why.

**Why:** the AI/TS ecosystem moves fast; last-year's truth is often this-year's cargo cult. Cheap research beats expensive migration.

**How to apply:** before introducing a new dep or architectural pattern, do one WebSearch pass and one primary-source fetch. Paste 2–4 links into the PR. If you can't defend the choice against a comparable alternative in two sentences, do more research.

### R2 — Latest stable, never bleeding edge

Pin to the latest stable majors of every runtime dep. Renovate bot handles minor/patch. Major bumps are their own PR with an ADR note. Prefer LTS for runtime infrastructure (Node LTS, RN stable line, Expo SDK latest). Lockfile committed. No `"*"` or unpinned semver.

**Why:** latest-but-stable captures modern APIs without canary surprise. Bleeding-edge betas are a separate, opt-in experiment. A rule 2 violation usually means a transitive dep's caret range pulled in a bad release.

**How to apply:** Thursday is upgrade day. Freeze upgrades the week before any launch. Canary channels (React Canary, Expo Canary) live only in experiment branches, never on main.

### R3 — Modern client patterns

Expo RN New Architecture, React 19+ concurrent + Suspense, Reanimated 4 for animation, MMKV for storage, Convex reactive for data, Zod at every boundary. Web uses modern CSS primitives (Grid, container queries, logical properties, `@layer`). Pre-2023 patterns (class components, Redux-Thunk, SCSS preprocessor, Moment.js, Enzyme) require justification in the PR.

**Why:** old patterns accrue indirection and block later modernization. The team is small; keep one mental model.

**How to apply:** if you type `class extends React.Component` or `import moment`, stop and argue why.

### R4 — Testing pyramid + vanguard UI suite + agent evals + targeted mutation

Every PR ships with tests appropriate to its layer. The UI stack below is research-backed 2026 consensus — modern, low-flake, Storybook-native.

**Non-UI layers:**

- **Unit** — Vitest + fast-check property-based for pure logic
- **Integration** — Convex test harness for backend, MSW for network
- **Agent evals** — Braintrust per Flow: golden path, adversarial prompts, clinical-safety regression (for clinical-adjacent Flows)
- **Mutation** — Stryker, **targeted**. Runs on: kernel invariants, Flow DSL compiler, clinical-safety critic rules, auth/payment paths. Does NOT run on UI, Flow graph definitions, generated types, or fixtures.

**UI layers (vanguard stack):**

- **Component unit + interaction** — Storybook 9 with the built-in `play()` function for behavior assertions. React Testing Library for DOM assertions inside `play()`. Each component ships stories for loading, empty, error, populated, and edge states.
- **Component visual regression** — **Chromatic** (Storybook-native, pixel-perfect, review UI). Every story is a snapshot. PR diffs reviewed inline. Applitools Visual AI is the upgrade path if pixel-perfect produces too much noise at scale — not adopted yet.
- **Accessibility (component layer)** — `@storybook/addon-a11y` runs axe-core on every story. Violations block merge at WCAG 2.2 AA per R9.
- **Full-page visual regression (web)** — Playwright's built-in `toHaveScreenshot()` for integration-level visuals that Storybook can't express.
- **E2E web** — Playwright (browser + network + full interaction). One happy-path test per critical flow, not exhaustive.
- **E2E mobile** — **Maestro** primary (<1% flakiness, Expo-compatible, EAS Workflows-native, single CLI install). Detox kept as an escape hatch for gray-box sync scenarios Maestro can't express.
- **Performance budgets (web)** — Lighthouse CI. Budgets per R7. PR fails on regression.
- **Performance budgets (mobile)** — Flashlight or React DevTools Profiler against a scripted Maestro flow.

**Why:** untested code rots; evenly-tested code wastes effort. The pyramid keeps the bulk cheap. Mutation testing verifies the tests themselves where it matters most. The UI stack is modern 2026 consensus (Chromatic + Storybook + Maestro + Playwright); older tooling (Jest snapshot, Percy, Enzyme, Detox-first) is deliberately rejected.

**How to apply:** a PR that changes kernel code without a mutation score ≥ 80% on the affected module is rejected. A PR that adds a new Flow without Braintrust golden + adversarial evals is rejected. A PR that adds or changes a component without Storybook stories for every meaningful state is rejected. A PR that regresses a Chromatic snapshot needs a story-update in the same PR.

### R5 — End-to-end type safety

`strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` in every `tsconfig.json`. Zod schemas at every boundary: user input, LLM output, MCP tool I/O, network request/response, Convex documents. No `any`. Type assertions require a `// reason:` comment explaining why the assertion is safer than the alternative.

**Why:** the kernel runs agentic code over user-typed input over LLM-typed output over Convex-typed storage. Every boundary is an opportunity for a silent type lie. Zod catches them at runtime; strict TS catches them at build.

**How to apply:** grep `any` and `as ` in any PR. Each hit either has a `// reason:` or is rejected. Zod schemas live beside the boundary they protect, not in a central `types/` dump.

### R6 — Observability is a shipping requirement

Every LLM call tagged to Braintrust with flow + node + pack + cost metadata. Sentry for errors with PII redacted before send. PostHog for product events. Structured JSON logs with a correlation ID per conversation turn. A cost-per-DAU dashboard runs from day one. Alert thresholds for each tier (T1 latency, T2 failure rate, T3 critic reject rate, T4 cost drift) are declared in the ADR that introduced the tier.

**Operationalized at the Flow level.** The Flow DSL carries per-flow observability fields (`expectedCostPerMessage`, `braintrustDataset`, `perNodeLatencyBudgetMs`) — see [architecture/flow-catalog.md](architecture/flow-catalog.md). Observability is not a parallel system, it's a Flow contract element. The Situation Classifier (per-message LLM call that picks a Flow) is itself T1 cost and is tagged with the same Braintrust flow+node+pack+cost metadata as a regular Flow node.

**Why:** observability added later never catches up. Cost drift in an LLM app is how startups die quietly.

**Phased enforcement.** `observability.expectedCostPerMessage` is a **hard requirement** for T2+ flows — `flow-catalog-reviewer` rejects without it. `observability.braintrustDataset` is **strongly recommended** for all flows with ≥3 nodes but not hard-enforced (soft flag) until the first real eval failure costs us. Basic Braintrust flow+node+pack+cost tags on every LLM call remain hard-required from day one.

**How to apply:** a PR that adds a new flow or node without Braintrust tags is rejected. Sentry.init runs with a `beforeSend` hook that strips user messages by default. `flow-catalog-reviewer` rejects new T2+ flows that don't declare `observability.expectedCostPerMessage`.

### R7 — Performance budgets enforced in CI

- T1 Fast Path: P95 ≤ 2s user-visible
- T3 Critic Gate: P95 ≤ 500ms overhead
- Mobile cold start: ≤ 2s to interactive
- Initial JS bundle (web): ≤ 500KB
- Convex query: P95 ≤ 100ms

Regressions block merge. Budgets revisited per major release. Lighthouse CI on web, Flipper / React DevTools Profiler on mobile.

**Why:** conversation feels dead at ~3s. Budget-less performance work ends up chasing tail regressions across releases.

**How to apply:** CI runs a perf suite on every PR touching hot paths. Budget bump requires an ADR.

### R8 — Security & privacy non-negotiables

Secrets live in Infisical or Doppler, never in code, lockfiles, env files checked into the repo, or CI logs. PII tagged at the Convex schema level (`{ piiClass: "health" | "contact" | "behavioral" }`). Health data encrypted at rest (Convex default) + in transit (TLS 1.3). Raw user messages never reach Sentry — redaction/hashing runs in `beforeSend`. Gitleaks + Socket.dev + `npm audit` run on every CI. License allowlist excludes GPL/AGPL from app-shipped code. Clerk configured with PKCE + session rotation.

**Operationalized at the Flow and Event levels.** Security is not siloed in this rule — it threads through:

- **Every Domain Event** declares its PII class (`'none' | 'behavioral' | 'health' | 'contact' | 'payment'`) — see [architecture/layers.md](architecture/layers.md) Domain Pack contract artifact 1.
- **Every Flow** declares `piiHandling` (contains + logsRedacted) — see [architecture/flow-catalog.md](architecture/flow-catalog.md).
- Log redactors, Sentry `beforeSend`, Convex schema tags all read from these declarations. R8 is the principle; the Flow/Event fields are the operational surface.

**Why:** petstory.co handles health data. The regulatory posture (LGPD in Brazil, broader compliance as we expand) demands this baseline. Getting it right at day zero is ~10× cheaper than retrofitting.

**How to apply:** any secret leak in git history is a P0 rotation + post-mortem. A new dep that fails the license check is rejected in CI. A new Flow touching clinical-adjacent nodes without `piiHandling` declared is rejected. A new Domain Event without its PII class is rejected.

### R9 — Accessibility + i18n from day one

WCAG 2.2 AA as the floor. axe checks in CI. Keyboard and screen-reader tested per release (VoiceOver iOS, TalkBack Android, NVDA web). Dynamic type + dark mode first-class. All user-facing copy flows through the translation layer using ICU MessageFormat — locale-aware dates, numbers, and plurals from day one. Zero hardcoded strings in L2 Domain Packs or L3 Product Shells. PT-BR launches; EN follows per [market.md](market.md).

**Why:** the user base includes older tutors with assistive tech; health apps have higher accessibility expectations than games. i18n layer added post-launch is always broken copy for the first audience that needs it.

**How to apply:** any user-facing string that's not a translation key is rejected. Copy keys follow `pack.flow.node.slot` convention.

### R10 — Conventional Commits + trunk-based + small PRs

Conventional Commits 1.0 on every commit. Trunk-based development: short-lived branches, squash-merge to `main`. PRs target ≤ 400 lines of diff; exceptions justified in the PR body. Changesets or semantic-release for per-package version bumps (once the monorepo lands).

**Why:** small PRs review better and ship faster. Conventional Commits enable auto-generated changelogs and make future bisects and audits easy.

**How to apply:** a PR exceeding 400 diff lines gets a first comment requesting a split unless the author argues in-description why it can't be.

### R11 — PR merge gates

A PR merges only when all apply:

- Tests, types, lint green
- Relevant sub-agents invoked: `brand-guardian`, `viz-judge`, `ux-concept-keeper`, `clinical-safety-reviewer`, `architecture-guardian`, `flow-catalog-reviewer`, `user-story-author` — whichever the PR touches
- Braintrust eval regression ≤ baseline on any agent-touching change
- Performance budgets green
- Gitleaks clean; no secret diff
- One substantive human review comment — bare "LGTM" is rejected

**Why:** every gate corresponds to a previous near-miss or a mandatory safety invariant. Automation that stops bad merges is cheaper than code review catching them late.

**How to apply:** CODEOWNERS + required checks configured once the repo graduates from the scaffold. Until then: manual discipline in PR descriptions.

### R12 — Feature flag risky changes

New Flows, model swaps, breaking UI, pricing changes, and onboarding rewrites ship behind flags. Rollout: 1% → 10% → 50% → 100%, each step gated on error rate and Braintrust eval drift. No irreversible rollouts. Flag cleanup tracked as technical debt and reviewed monthly.

**Why:** LLM behavior changes between model versions; what passes evals at 1% may regress at 50%. Flags are the cheapest rollback.

**How to apply:** every new flow lands flag-gated by default. Flag removal is its own PR after the rollout completes.

### R13 — Reliability: SLOs, error budgets, resilience patterns, incident discipline

Reliability is an engineering requirement, not an ops afterthought. Four pieces.

**SLOs per tier, 28-day rolling window:**

| Tier | SLI | Target |
|---|---|---|
| T1 Fast Path | Availability | 99.9% |
| T1 Fast Path | P95 user-visible latency | ≤ 2s |
| T2 Deep Path | Completion rate | ≥ 99.5% |
| T3 Critic Gate | Pass rate on first attempt | ≥ 99% |
| T4 Long-Horizon | Weekly-run completion | ≥ 99.5% |
| App (overall) | Crash-free sessions | ≥ 99.5% |

Each tier-introducing ADR locks in its SLOs. Changes go through an ADR amendment.

**Error budget policy (Google SRE 2026 consensus):**

- Budget **> 50% remaining** — ship features confidently.
- Budget **25–50%** — review what's burning budget; slow risky changes; prioritize stability fixes.
- Budget **< 25%** — feature freeze. Only P0 fixes, security patches, and reliability work.

Trigger: single incident consuming **> 20%** of 28-day error budget → blameless postmortem required. Postmortem publishes within 72 hours; action items tracked in Linear and land within the next cycle.

**Resilience patterns at every external boundary:**

- **Timeouts declared** — Anthropic API 10s, Convex 3s, Clerk 5s, Stripe 8s, MCP tool calls 8s default. No infinite waits anywhere.
- **Retries with exponential backoff + full jitter** — only on idempotent calls. Max 3 retries. Budget consumed per retry tracked.
- **Circuit breakers** — open on rolling failure rate > 20% over 60 seconds. Half-open probe every 30s.
- **Graceful degradation** — LLM unreachable → template responses. Convex degraded → read-only cache. Clerk degraded → cached auth session. Every degradation mode is tested.
- **Rate limits** — per-user turn-rate caps on agent loop (prevents runaway costs + runaway users). Clerk + Stripe webhook dedup.
- **Idempotency keys** on every mutating tool call so retries are safe.

**Incident response:**

- **On-call** — Grafana OnCall or PagerDuty from day one; rotation is weekly.
- **Runbooks** — every alert links to a runbook with the diagnostic steps and the three most common fixes. No alert ships without a runbook.
- **Severity scheme** — SEV1 (service down), SEV2 (core flow degraded), SEV3 (edge case). SEV1/2 triggers the error-budget-burn review.
- **Postmortems** — blameless template; root-cause must be a system change, not a person.

**Disaster recovery:**

- **RPO** (data loss tolerance): 1 hour. **RTO** (recovery time): 4 hours.
- **Convex** — daily export to S3-compatible cold storage; quarterly restore drill (actually rehearse).
- **Clerk** — SSO fallback path documented; user-export tooling ready.
- **Application state** — Convex migrations are forward-only + reversible via shadow writes for the first 7 days.
- **Chaos / fault injection** — deferred until post-launch. Flagged for consideration once we have live users and real SLOs to validate.

**Why:** 70% of outages come from changes. Error budgets are the control mechanism that balances velocity against reliability. At startup scale the temptation is to skip SRE — that's how you end up in a SEV1 without a runbook.

**How to apply:** every new flow declares its SLO in its ADR. Every external-service call passes through the kernel's port layer, which enforces timeouts/retries/breakers by default. A PR without runbook for any alert it introduces is rejected.

### R14 — Automated enforcement via standardized toolchain

Rules that depend on human discipline decay. Rules enforced by tooling survive team growth. The toolchain below is the explicit implementation of R1–R13.

**Linter + formatter — Biome primary, narrow ESLint supplement.**

Biome 2.x is the primary linter and formatter. Rust-based, 10–25× faster than ESLint+Prettier (formats + lints in ~50ms vs 2–3s). Covers ~80% of common ESLint rules, includes a Prettier-compatible formatter, single config (`biome.json`).

ESLint 9 (flat config) is kept on a **narrow allowlist** for what Biome can't do yet: type-aware rules, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, and `eslint-plugin-boundaries` (enforces the L0→L1→L2→L3 dependency rule from ADR-002). No other ESLint plugins. Revisit yearly to shrink this list as Biome catches up.

Prettier is not installed. Biome's formatter replaces it.

**Git hooks — Lefthook.**

Lefthook (Go, parallel, ~10× Husky) manages every git hook. Config lives in `lefthook.yml`. Parallel execution cuts pre-commit time roughly in half vs. sequential Husky.

Hook stages:

- **pre-commit** (fast, staged files only): Biome format + lint on staged → gitleaks scan on staged → commitlint dry-run when applicable.
- **commit-msg**: commitlint with `@commitlint/config-conventional` enforcing Conventional Commits 1.0.
- **pre-push**: `tsc --noEmit` (incremental) → Vitest unit on affected workspaces → Knip → dependency-cruiser for layer boundaries.
- **CI** (post-push): full matrix — all pre-push checks + Playwright + Chromatic + Maestro (on release branches) + license check + Socket.dev + Stryker (nightly, kernel-only).

**Static analysis tools:**

| Tool | Purpose | Where it runs |
|---|---|---|
| Biome | Lint + format | pre-commit + CI |
| ESLint (narrow) | Type-aware + react-hooks + jsx-a11y + boundaries | pre-push + CI |
| `tsc --noEmit` | Type check | pre-push + CI |
| Knip | Dead code + unused deps + unused exports | pre-push + CI |
| dependency-cruiser | ADR-002 layer boundary enforcement | pre-push + CI |
| gitleaks | Secret scan in diff and history | pre-commit + CI |
| Socket.dev | Supply-chain behavioral analysis | CI (on dependency diff) |
| license-checker | License allowlist (reject GPL/AGPL in app deps) | CI |
| `@cyclonedx/bom` | SBOM generation | CI (release builds) |
| axe-core via Storybook a11y | Accessibility (R9) | CI |
| Lighthouse CI | Web perf budgets (R7) | CI |
| commitlint | Conventional Commits (R10) | commit-msg |

**Dependency management:**

- **Renovate** bot configured with auto-merge for minor/patch of trusted packages, PR-only for majors, weekly schedule (Thursday upgrade cadence per R2).
- **pnpm** with strict peer dependency resolution. No caret upgrades in the lockfile. Full monorepo conventions (workspace protocol, no phantom imports, shared configs, changesets for versioning) in [ADR-005](decisions/ADR-005-monorepo-structure-and-tooling.md).
- **Workspace pinning** via pnpm overrides for shared TS/React/Zod/Mastra/Agent SDK versions.

**Secrets & environment:**

- Secrets in **Infisical** or **Doppler** (one, not both — pick on first integration).
- `.env.example` committed with placeholders; `.env.local` gitignored.
- CI secrets via GitHub Environments with protected-branch approvals on production.
- No secrets in lockfiles (gitleaks catches), no secrets in Sentry (`beforeSend` strips).

**Preview environments:**

- **Vercel** preview deploys for the marketing site and web app per PR.
- **EAS Preview Builds** for mobile per PR touching mobile code.
- **Convex Preview Deployments** per PR so every branch has an isolated backend.

**CI platform:**

- **GitHub Actions** with **Turborepo remote cache** (Vercel-hosted or self-hosted once the monorepo lands).
- Required checks: all pre-push checks + Chromatic + Playwright + axe-core + Lighthouse + license + Socket.dev.
- Merge-queue enabled on `main` to prevent green-to-broken races.

**Editor alignment:**

- `.editorconfig` committed (final newline, UTF-8, LF line endings, 2-space indent).
- `.vscode/settings.json` recommends Biome as default formatter, format-on-save.
- `.vscode/extensions.json` recommends Biome, ESLint, Prettier-disable reminder, TypeScript Nightly, Storybook, Playwright.

**Configuration files that must exist at repo root:**

- `biome.json` — lint + format
- `eslint.config.js` — narrow plugin allowlist only
- `lefthook.yml` — git hooks
- `commitlint.config.js` — Conventional Commits rules
- `knip.json` — dead code config
- `.dependency-cruiser.json` — layer boundary rules
- `tsconfig.json` (base) + per-workspace tsconfigs with `extends`
- `.gitleaks.toml` — secret scan rules
- `renovate.json` — dependency bot config
- `lighthouserc.json` — perf budgets
- `.editorconfig` + `.vscode/` recommendations

**Why:** automation is the only durable form of discipline at team growth. Every tool above is a 2026-researched choice (see R1); alternatives were considered and rejected with cause.

**How to apply:** the scaffold includes the config files listed above with sensible defaults from day one. Adding or removing a tool is an ADR-level change.

### R15 — No placeholders, no silent fallbacks, no hidden state

Code that ships to `main` does what it claims end-to-end. If something is incomplete, it is **explicitly** flagged and the flagging is intentional.

Specifically forbidden unless explicitly requested and confirmed:

- **Placeholder implementations.** Functions that return hardcoded mock data, stubs that silently succeed, types that exist without runtime backing. If a function signature is in `main`, it works.
- **`TODO` / `FIXME` / `XXX` comments without a tracked issue link.** A naked `TODO` is a lie that says "this is fine." A TODO with `// TODO(LINEAR-123): description` is a commitment with an owner and a date.
- **Silent error swallowing.** Empty `catch {}`. `catch (e) { return null }`. `.catch(() => undefined)` without a comment. Every caught error is logged, transformed into a typed error, rethrown, or surfaced as a user-visible degradation path. Global framework default of returning `null` on failure is also forbidden — wrap with a typed `Result` instead.
- **Commented-out code.** Git history is the archive. If the code might come back, it's a new PR when it does.
- **Hidden fallbacks.** Silent default values that paper over missing data (`user.name || 'User'` where a missing name should be a bug, not a "friendly default"). Fallbacks that exist are named, explicit, and have a comment explaining the invariant they protect.
- **Dead exports kept "just in case."** Knip catches these in CI.
- **Fake data that looks real.** Fixtures are labeled (e.g. `fixtureUser.brutus`), seed data lives under a `seed/` directory, and no test prop ever appears in production code paths.

**Explicit exceptions are OK.** If a placeholder is required (e.g. staging a screen before its backend is ready, parking a flag-gated code path behind `assertNeverCalled()`), the PR title says so, the ADR records why, and the code has a visible marker (`/* PLACEHOLDER(issue): ... */`). Explicit > implicit, always.

**The confirmation rule:** when Claude (or any collaborator) is considering producing a placeholder — any stub, any fallback, any "we'll fill this in later" — the rule is **ask first**, don't assume. Produce the real thing, or surface the gap and get a direction, never the half-implementation that looks complete but isn't.

**Why:** placeholders and silent fallbacks compound. The app passes review because the happy path works, then falls over in production because the unhappy path was fake. In a clinical-adjacent context, a swallowed error can mean a missed escalation. Honesty about incompleteness is cheaper than mystery about incorrectness.

**How to apply:** Biome's `noUselessCatch`, `noCommentedCode` (where available), and `noDeadCode` rules on. Knip catches unused exports. A custom `rg '^\s*(TODO|FIXME|XXX)(?!\(.+\))'` check in pre-commit blocks untracked TODOs. Code review rejects any catch block that doesn't handle the error meaningfully. The PR template includes: "No placeholders, stubs, or silent fallbacks — or: which ones, why, and where tracked?"

### R16 — YAGNI and scope fidelity

Build for the requirement in front of you, not the requirement you imagine six months out.

- **No premature abstraction.** Three similar lines is cheaper than a configurable abstraction that's wrong in two ways. A shared helper is extracted at the third or fourth use, not the second, and never on the first.
- **No config options nobody asked for.** Every flag, every override, every strategy pattern is paying rent. If it's not wired to a real use case, it's not written.
- **No "for flexibility" designs.** Adapters, plugins, and interfaces exist when there are two implementations or a clearly roadmapped second one. A single-implementation interface is a sign of speculative design.
- **Scope fidelity in PRs.** A PR does what its title says and nothing else. Drive-by reformatting, unrelated refactors, opportunistic cleanup — all go in separate PRs. A "while I was here…" is a code smell.
- **No half-finished implementations.** If you start a thing, finish it in the same PR or defer the whole thing. Partial work hidden behind a not-yet-called code path is the worst kind of placeholder.
- **Features stay scoped to the user story.** A user story for "record meal" doesn't grow into "record meal + portion tracking + calorie estimation" without going back through user-stories.md.

**Explicit exceptions are OK.** Architectural work that's deliberately laying groundwork for a named upcoming feature is flagged in the ADR with the feature + timeline. "Building the abstraction now because the second implementation lands next sprint" is valid; "building the abstraction now because someday we might have a second implementation" is not.

**Why:** every line of code has a maintenance tail. Speculative code is worst-of-both: carrying cost now, not helping now, and usually wrong when the real requirement arrives. YAGNI isn't laziness, it's discipline.

**How to apply:** PR reviewers ask "is this requirement real right now?" of every new abstraction, config option, and flag. ESLint `complexity` + `max-lines-per-function` (reasonable caps: 15 and 50 respectively) flag over-built functions. `architecture-guardian` flags interfaces with zero or one implementation that aren't on the pack-boundary.

### R17 — Honesty in naming, comments, and interfaces

Names, comments, and signatures are part of the contract. If they lie, the code lies.

- **Names describe what the thing does.** `getUser` reads; it doesn't write. `calculateTotal` returns a number, not a Promise. `isValid` returns a boolean. A mismatch between name and behavior is a bug — fix the name or fix the behavior.
- **No misleading abstractions.** A function called `sanitize` that doesn't actually sanitize is worse than no function at all.
- **Comments explain WHY, not WHAT.** `// increment counter` above `i++` is noise. `// Clamp to 60 so we stay inside Anthropic's cache TTL window` is signal.
- **No decorative comments.** Banner comments, section dividers made of `//////////////////////`, and ASCII art do not exist. File structure + function names are the divider.
- **Signatures don't surprise.** A function that takes a config object doesn't secretly read from a global. A "pure" function has no side effects. An async function doesn't return before its side effect completes. If something is surprising, the name makes the surprise visible (`readConfigAndWriteCache`).
- **Public API surfaces are documented honestly.** JSDoc on every public export includes the edge cases: what it returns on empty input, which errors it can throw, what state it mutates.
- **Types are not lies.** A function that can return `undefined` is typed to return `T | undefined`, not `T` with a runtime check. `as` assertions must be justified with `// reason:` per R5.

**Why:** the single fastest way to slow a codebase is to train readers to distrust what they read. When names lie, every reader has to verify by reading the implementation. Multiply by every read, every onboarding, every AI agent pass.

**How to apply:** code review rejects any name/comment/signature that doesn't match the implementation. Biome's `useNamingConvention` enforces casing rules. JSDoc presence on public exports is linted (`eslint-plugin-jsdoc` under the narrow allowlist). `architecture-guardian` flags interface/implementation name mismatches.

### R18 — Rule of Three for layer promotion (DRY vs simplicity)

Code moving up the layer stack (L3 → L2 → L1 → L0) requires evidence, not intuition. The heuristic that gates every "should this move up" decision, three gates, **all** must pass:

1. **Three or more SIMILAR cases exist** in the lower layer. Two cases can coexist; three is the signal a pattern might be real.
2. **The generalization is obvious**, not invented. If designing the abstraction is hard, it's too early — the right shape emerges from the three concrete cases; you don't engineer toward it.
3. **The promoted version covers all cases cleanly**, no "almost, with a few flags." Flags-to-paper-over-mismatch means the cases were never actually similar.

If any gate fails, the code stays local. Revisit when a fourth similar case appears.

**Direction goes both ways:** demote code back down when maintaining the abstraction costs more than the duplication it prevents. An L1 primitive with only one real consumer is worse than clean duplication inside an L2 pack — move it down.

**Layer-specific calibration:**

- **L0 (kernel) has the highest bar.** Kernel code pays maintenance tax in every pack. Promote L1 → L0 only when the pattern appears across **multiple packs**, not within one.
- **L1 primitives.** Promote L2 → L1 when the rule of three passes *and* the abstraction is domain-agnostic (no pack-specific vocabulary). If it only makes sense for pet-health, it stays in the pack.
- **L2 pack internals** factor freely — duplication *between* packs is information about separate domains, not debt.
- **The pack boundary itself is designed, not emergent.** Don't apply the rule of three to the pack contract — that's fixed in ADR-002 (nine required exports after the Ubiquitous Language glossary was added in ADR-004).

**Why:** DRY is a tool, not a goal. Copy-paste of 5 lines across 2 files is cheaper than an abstraction that's wrong in one way; copy-paste of 50 lines across 5 files is real debt. Premature abstractions lock in the wrong interface shape; late abstractions accumulate pain. Applied to our specific layered architecture, the rule prevents kernel bloat driven by speculation and pack sprawl driven by false "this is general" moves.

**How to apply:** before moving a utility, type, or function up a layer, **count concrete uses and write the count in the PR description**. Fewer than three → stays local. Three or more → verify the abstraction is obvious and covers cleanly. `architecture-guardian` rejects any addition to L0 or L1 that doesn't cite ≥3 concrete lower-layer uses. Demotions (moving code down a layer) are celebrated, not resisted — the cost function has two directions.

### R19 — DRY for documentation

Every fact, decision, rule, or definition lives in exactly **one canonical location**. Other docs link to it; they never restate it.

**Canonical sources (declared):**

| Topic | Canonical home |
|---|---|
| Vision | `docs/vision.md` |
| Market, financing, competition | `docs/market.md` |
| Stack choices | `docs/stack.md` + `docs/decisions/ADR-001` |
| Layered architecture | `docs/architecture/layers.md` + `ADR-002` |
| Agent framework, tiers, Flow DSL | `docs/architecture/flow-catalog.md` + `ADR-003` |
| Engineering rules | `docs/engineering-rules.md` (this file) |
| Brand tokens | `docs/brand.md` |
| Data Humanism pillars + 10 rules | `docs/data-humanism.md` |
| Viz simplicity rules | `docs/viz-rules.md` |
| UX concept (chat-first + diary + nudges) | `docs/ux-concept.md` |
| User stories (individual) | `user-stories/US-*.md` |
| User stories (how-to-write) | `docs/user-stories.md` |
| Open questions | `docs/open-questions.md` |
| How Thiago works | `.claude/CONVENTIONS.md` |

**The rules:**

- A new claim lives in exactly one file — its canonical home.
- Every other mention is a Markdown link, never a restatement.
- Short contextual paraphrases that introduce a link are fine ("Per the layered architecture, …" with the link). Two or more restated sentences count as duplication.
- `CLAUDE.md` is the explicit exception: as the auto-loaded index it carries one-sentence-plus-link pointers for each non-negotiable.
- ADRs restate their own **Decision** in the Decision section. They must not restate Context, Rationale, or Consequences that live elsewhere.
- Audit round on every significant doc addition: read adjacent docs for overlap before merging.

**Why:** two copies drift. Readers (and AI agents loading context) don't know which is authoritative. The doc set loses its mathematical cleanliness and every future author has to grep for the truth.

**How to apply:** PR review rejects any restatement of an existing rule instead of a link. `architecture-guardian` gains a doc-duplication check: any identical 20+ word phrase appearing in two docs is flagged for consolidation (CLAUDE.md index entries exempted). Cross-doc links verified on every docs PR.

### R20 — Library adoption: candidate search, minimum quality bar, build-vs-buy

Before writing non-trivial functionality ourselves, search for a third-party library that fully addresses the need. Before adopting a library, run it through the quality bar below. If no library qualifies, build it ourselves. R20 is the discipline that separates "leverage an ecosystem" from "inherit someone else's burden."

**Step 1 — Identify candidates.**

A **candidate** is a third-party library that can **fully** address the need without extra hard work:

- "Fully" means the happy path and the edge cases we care about — not "50% of what we need, we'll wrap the rest."
- "Extra hard work" means writing significant adapters, monkey-patching, forking, or large shim layers around the library to make it fit.
- If a lib requires force-fitting, it isn't a candidate. Build it ourselves.

Search breadth: at least **2–3 candidates** for anything non-trivial. "The first Google result" is not a search. Check npm, GitHub, awesome-lists for the ecosystem.

**Step 2 — Apply the minimum quality bar.**

A candidate must pass **all** of these to stay in the running:

- **License** — on the allowlist per R8: MIT, Apache-2.0, BSD, ISC, MPL-2.0. Reject GPL / AGPL / LGPL for app code. Reject source-available (Elastic License, SSPL, BSL, Commons Clause) for app code.
- **Open source** — no proprietary libs unless the adoption is an ADR'd exception (stack-level choices like Clerk, Convex, Mastra, Stripe, which are services, not libraries).
- **Actively developed** — at least one commit or release in the last ~4 weeks. A repo with no activity in 12+ months is a dead end; walk away even if it technically works today.
- **Healthy adoption** — rough guides, not absolutes: critical-path libs ≥ 5k GitHub stars *and* > 50k weekly npm downloads; utility libs ≥ 1k stars *and* > 10k weekly downloads. Below these floors, the burden is on the PR to argue why.
- **No unresolved critical advisories** — `npm audit`, Socket.dev, GitHub advisories all clean (or with a documented mitigation plan).
- **Maintainer responsiveness** — median issue-close time and PR-review cadence readable on the repo. Months-long unanswered issue backlogs are a red flag.

If zero candidates clear the bar: **build it ourselves, and the ADR/PR records the candidates rejected and why**.

**Step 3 — Pick the best candidate.**

Among those that pass the bar, choose by:

1. **Best fit** — smallest shim layer needed to integrate.
2. **Highest signals of life** — weekly download trend rising, not falling; maintainer activity; recent releases.
3. **Smallest dependency footprint** — a library with 200 transitive deps costs more than the same capability in 10.
4. **License preference** — prefer permissive (MIT, Apache-2.0) over weak-copyleft (MPL-2.0) when otherwise tied.
5. **Best TypeScript story** — native TS or first-class `@types` package. Stale DT types are a tax.

**Step 4 — Document the decision.**

Before `pnpm add <library>`, the PR description (or ADR, if the adoption is architecturally significant) must include:

- The need being solved (one sentence).
- Candidates considered (at least 2 others, or "none found meeting the bar").
- For each candidate: GitHub stars, weekly npm downloads, last-commit date, license, the primary reason accepted or rejected.
- Why the chosen one is the best fit.

**Exempted from per-PR re-evaluation** — tier-zero dependencies already adopted in ADR-001 or later ADRs (React, TypeScript, Node, Zod, Mastra, Claude Agent SDK, Convex client, Clerk, etc.). These were evaluated when adopted and don't need fresh justification every time they're used.

**Why:**

Picking the wrong library is the second-most expensive decision in a codebase, behind picking the wrong architecture. Swapping one out later costs roughly as much as building it from scratch. A dead library is a latent P1 — security patches that won't land, breaking upstream changes that break you, maintainer burnout you inherit. Force-fitting a library to do something it's not designed for usually produces worse code than writing it — glue, workarounds, mystery performance cliffs.

**How to apply:**

`architecture-guardian` flags any PR that adds a new entry to `dependencies` or `devDependencies` without the evaluation rationale in the PR body. `Socket.dev` + `license-checker` in CI block on advisory and license violations per R8/R14. Renovate bot reminds at major-version-bump time to re-verify the bar (R2).

**Related rules:**

- R1 (Research-first) — R20 is R1's specific protocol for the library case.
- R2 (Latest stable) — governs version discipline once the library is adopted.
- R8 (Security & privacy) — license allowlist and supply-chain scanning.
- R16 (YAGNI) — don't pull in a library "just in case."
- R18 (Rule of Three, internal abstractions) — R18 governs when *internal* code promotes up a layer; R20 governs when *external* code enters the dependency tree. Both answer "should this abstraction exist?" with evidence instead of intuition.

### R21 — Small-step iteration: plan, apply, commit, push, test, re-evaluate

Non-trivial work is broken into the smallest coherent units at **planning time**, and each unit runs through the full cycle before the next begins:

1. **Apply** the change.
2. **Commit** with a Conventional Commit subject (per R10).
3. **Push** to remote.
4. **Test** — CI runs the verification appropriate to the change, per R4 (unit, integration, component, visual, e2e, agent eval).
5. **Re-evaluate** the plan — does the next step still make sense, or has something changed?

Then the next unit. Never skip steps. Never batch two unrelated units into one commit.

**What counts as a "small step":**

- A single conceptual change with a clear boundary.
- Describable in one Conventional Commit subject (≤ 72 chars).
- Revertable independently without dragging unrelated changes.
- Ideally < 100 lines of diff; hard cap at 400 per PR (R10).

**Planning output:**

Before writing code, list the commits you intend to produce, in order. Each entry is the Conventional Commit subject you'll write. If the list has fewer than 2 entries for non-trivial work, the plan isn't granular enough — break it down more. Plans with one 500-line commit are a failure mode of R21.

**Why:**

Small steps surface problems early. A 1,000-line commit defers every failure until the end; a 50-line commit fails fast and cheap. Re-evaluation is where learning happens — after each step, reality might differ from the plan, and forcing a pause catches drift. `git bisect` only works when history is atomic; messy commits disable the cheapest debugging tool Git has. AI-assisted edits stay on-scope at ~50 lines and drift at 500.

**How to apply:**

- Treat the planning output (Plan tool, ADR, design doc) as a commit list, not a narrative paragraph.
- Run local verification before push when practical; CI is the source of truth after push.
- After each push, read the test output. Don't assume green. Don't start the next step while CI on the current one is still running, unless the next step is on an independent surface.
- Use `git commit --amend` for local typo fixes within the current step; never amend a pushed commit.
- Don't couple unrelated changes into one commit for convenience. Drive-by one-liners get their own commit.

**Related rules:**

- **R10** (Conventional Commits + trunk-based + small PRs) — R21 specifies the *cycle* that runs within R10's PR-size bound.
- **R4** (testing pyramid) — the test step picks from R4's layers based on what the change touches.
- **R15** (no placeholders, no silent fallbacks) — each step ships complete; no "finish in the next commit" stubs.
- **R16** (YAGNI + scope fidelity) — each step does one thing, not five speculative ones.
- **R12** (feature flag risky changes) — when a large change must land as a sequence of commits but the intermediate state would be user-visible, the flag hides it until complete.

**Exceptions:**

- **Atomic operations** (large renames across a code surface, schema migrations, breaking interface changes) must land in one commit for correctness. When they must, they're still planned as a sequence (prep commit → atomic commit → follow-up commit) with a feature flag (R12) hiding intermediate state from users.
- **Docs-only commits** may batch related small edits if they share one conceptual change (e.g. a single engineering-rules amendment touching the rule file + architecture-guardian + CLAUDE.md).

### R22 — GRASP core principles + Open/Closed for reusable layers

Two connected disciplines. Part A names four GRASP patterns already lived in this architecture (and explicitly declines the other five). Part B operationalizes the Open/Closed Principle on the layers that are meant to be reused across packs.

**Part A — GRASP: four patterns adopted, five declined.**

GRASP (Larman) is a common vocabulary for responsibility assignment. Four patterns are load-bearing here and adopted as named discipline in code review:

- **Low Coupling** — minimize dependencies between modules. ADR-002's strict inward dependency rule enforces this structurally. At code-review level the question is: "Does this introduce a new cross-layer import or a hidden coupling?"
- **High Cohesion** — a module has tightly related responsibilities. Flow DSL (one flow per situation), MCP tool scope, the 9-artifact pack contract already embody this. Code-review level: "Does this module have one reason to change?"
- **Information Expert** — assign responsibility to the module that has the information needed. When deciding "which layer owns this logic?" the answer is "which layer has the data?" Prevents domain logic drifting upward into the kernel.
- **Protected Variations** — interfaces that insulate the rest of the system from expected change. Our thin-wrapper-over-Mastra Flow DSL IS this pattern; L0 vendor ports are this pattern. Named so code review can spell it.

**Declined:** Creator, Controller, Polymorphism, Pure Fabrication, Indirection. Either idiomatic in TS + functional + Zod code (need no name) or duplicated by what we already named (Indirection ≈ Protected Variations in our idiom). Invoking these by name in PRs adds noise, not clarity.

**Part B — OCP for reusable layers (L0 Kernel, L1 Primitives, Flow DSL, Flow runtime wrapper).**

Reusable layers are **closed for modification, open for extension**:

- **Grow by extension, not by edit.** New capability is added through a registered extension slot: MCP tool, Skill, Hook, Flow node type, Critic rule, Situation classifier, Domain Event, Glossary term. Adding a one-off function to the kernel for a specific pack's edge case is a violation.
- **Extension-point signatures are public API, semver'd.** Once exposed, changing them breaks all packs. Major bump + migration notes required (see R2).
- **Public kernel API shrinks by deprecation, not silent removal.** Deprecate in one release, warn in the next, remove in a major after grace period.
- **Kernel PR gate — answer these three in order.** (1) Could this be expressed as a pack using an existing extension slot? (2) If not, can it be a new extension slot (closed API for future packs)? (3) If neither, why is a direct kernel edit necessary? Answer 3 requires an ADR.

**L2 (Domain Pack) and L3 (Product Shell) are exempt** — they are the extension. Packs edit their own code freely.

**Why OCP is load-bearing here specifically.** If pet-health required kernel edits to work, human-health would require more kernel edits, and the brand-neutral kernel decays into a multi-domain-tainted middle. OCP is how we preserve ADR-002's cross-domain-reuse promise under maintenance pressure.

**How to apply:**

- `architecture-guardian` flags kernel and primitive (L0/L1) PRs that aren't expressed as extension slots — or that add a slot without documenting its signature as public API.
- Kernel PR descriptions must include the three-question gate above.
- Extension-slot signatures are documented centrally once the monorepo lands (target: `packs/REGISTRY.md` or the kernel's public API export file).
- Shared review vocabulary: "Low Coupling," "High Cohesion," "Information Expert," "Protected Variations," "extension slot," "kernel edit."

**Related rules:**

- **R18** (Rule of Three for layer promotion) — R18 says *when* code promotes up a layer; R22 says *how* it's consumed once it's there (via extension slots, not kernel edits).
- **R16** (YAGNI + scope fidelity) — extension slots are earned by ≥3 concrete uses per R18, not speculative.
- **R2** (Latest stable) — extension-point signatures follow semver; once exposed, versioning applies.
- **ADR-002 + ADR-004** — R22 names what the layered architecture has always been: OCP applied to agent-app architecture.

**Exceptions:**

- **Bug fixes in kernel/primitive code** are allowed as edits. The edit isn't "adding a new capability," it's "restoring correctness."
- **Kernel plumbing changes with no public-API change** (refactor, type-safety, performance) are allowed when the exposed signatures stay stable.

## Enforcement

- `architecture-guardian` covers R0 (proposals adding ceremony without concrete pain to earn it — the veto), R5 (type safety at layer boundaries), R8 (license + secret checks), R9 (i18n layer leaks), R16 (speculative abstractions across layer boundaries), R17 (naming + signature lies), R18 (layer promotions require ≥3 concrete lower-layer uses; also flags abstractions that could be demoted down a layer), R19 (cross-doc duplication of rules or definitions), R20 (new dependency added without evaluation rationale in PR body), R22 (kernel / primitive PR that isn't an extension-slot addition without justifying the three-question gate).
- `flow-catalog-reviewer` covers R4 (flow evals + UI coverage for flow-facing screens), R12 (flag-gated flows), R13 (flow-level SLOs), R15 (no placeholder flows; stubbed nodes rejected).
- The R14 toolchain enforces R1–R12 and the automatable parts of R15–R17 (Biome rules, Knip, size budgets, TODO checker, JSDoc linting) once the scaffold graduates into a real repo. CI runs every check on every PR.
- R13 reliability rules are enforced by on-call discipline + the error-budget policy + runbook requirements per alert. Not purely automatable.
- R15's confirmation rule is specifically enforced in every AI-assisted edit: before producing any placeholder, stub, or silent fallback, ask the user — don't assume.
- PR template references each rule as a checklist.

## Exceptions

Exceptions require an ADR. A one-off deviation without an ADR is a merge blocker. Exceptions have an expiry date — the ADR commits to when the deviation will be resolved or escalated to a rule change.
