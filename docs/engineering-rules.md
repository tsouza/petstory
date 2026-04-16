# Engineering rules

Non-negotiable. Established 2026-04-16. Every PR, every code review, every ADR lives under these rules.

## Posture

Two meta-principles underneath every rule. First, we are building a consumer clinical-adjacent chat app; "good enough" is calibrated to that. A missed clinical guardrail is worse than a slow ship. Second, this is a layered architecture (ADR-002) with a brand-neutral kernel — rules that constrain the kernel are stricter than rules for the shell.

## The rules

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

**Why:** observability added later never catches up. Cost drift in an LLM app is how startups die quietly.

**How to apply:** a PR that adds a new flow or node without Braintrust tags is rejected. Sentry.init runs with a `beforeSend` hook that strips user messages by default.

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

**Why:** petstory.co handles health data. The regulatory posture (LGPD in Brazil, broader compliance as we expand) demands this baseline. Getting it right at day zero is ~10× cheaper than retrofitting.

**How to apply:** any secret leak in git history is a P0 rotation + post-mortem. A new dep that fails the license check is rejected in CI.

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
- **pnpm** with strict peer dependency resolution. No caret upgrades in the lockfile.
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

## Enforcement

- `architecture-guardian` covers R5 (type safety at layer boundaries), R8 (license + secret checks), R9 (i18n layer leaks).
- `flow-catalog-reviewer` covers R4 (flow evals + UI coverage for flow-facing screens), R12 (flag-gated flows), R13 (flow-level SLOs).
- The R14 toolchain enforces R1–R12 automatically once the scaffold graduates into a real repo. CI runs every check on every PR.
- R13 reliability rules are enforced by on-call discipline + the error-budget policy + runbook requirements per alert. Not purely automatable.
- PR template references each rule as a checklist.

## Exceptions

Exceptions require an ADR. A one-off deviation without an ADR is a merge blocker. Exceptions have an expiry date — the ADR commits to when the deviation will be resolved or escalated to a rule change.
