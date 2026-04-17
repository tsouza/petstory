# ADR-005 — Monorepo structure, tooling, and conventions

**Status:** Accepted (package-manager section superseded by [ADR-007](ADR-007-bun-for-local-development.md) — Bun replaces pnpm)
**Date:** 2026-04-16
**Deciders:** Thiago
**Supersedes:** —
**Depends on:** [ADR-001](ADR-001-stack.md), [ADR-002](ADR-002-layered-architecture.md), [ADR-003](ADR-003-three-level-agent-framework.md), [ADR-004](ADR-004-ddd-strategic-adoption.md)

> **Update (2026-04-16 — same day):** The package-manager decision in this ADR (pnpm) was reversed by [ADR-007](ADR-007-bun-for-local-development.md). **Bun 1.3+ is now the local-dev package manager and script runtime.** The workspace layout, Turborepo, Changesets, shared configs, CI shape, and everything else in this ADR remain canonical. Read the pnpm-specific text below as historical context for the decision chain.

## Context

ADR-002 established a four-layer architecture (L0 kernel, L1 primitives, L2 packs, L3 shells) that maps cleanly to a monorepo shape. ADR-002 and R14 already cite pnpm + Turborepo as the direction. ADR-005 makes the monorepo choices canonical: package manager, orchestrator, workspace layout, naming, shared configs, versioning strategy, task pipeline, and inter-package dependency discipline.

The alternative — a polyrepo across kernel, primitives, packs, shells, and configs — was rejected in the ADR-002 reasoning. Polyrepo multiplies CI surface and makes refactoring across the dependency rule (R22 extension slots) expensive. The monorepo gives us atomic cross-layer commits and a single CI graph.

## Decision

### Package manager: pnpm

pnpm is the monorepo package manager. Workspace declared via `pnpm-workspace.yaml`. Strict peer-dependency resolution enabled. `packageManager` field pinned in `package.json`. Lockfile committed. No npm or yarn fallbacks.

### Orchestrator: Turborepo

Turborepo drives task orchestration, caching, and affected-graph detection. Pipeline defined in `turbo.json`. Remote cache via Vercel-hosted cache (already on the stack per ADR-001) or self-hosted once multi-developer.

### Workspace layout

```
apps/
  petstory-mobile/          # L3 — Expo RN mobile app
  petstory-web/             # L3 — Expo RN Web + marketing
packages/
  kernel/                   # L0 — agent kernel, ports, flow runtime
  conversation/             # L1
  diary/                    # L1
  nudges/                   # L1
  shared-access/            # L1
  packs/
    pet-health/             # L2 — the pet-health Domain Pack
  ui/                       # L3 primitives (brand-aware, pack-neutral)
  config/                   # shared tsconfig, biome, eslint, lefthook, lighthouse presets
  test-utils/               # shared Vitest/Playwright helpers, fixtures, MSW handlers
docs/                       # documentation (outside workspaces)
.claude/                    # sub-agents, skills, commands (outside workspaces)
user-stories/               # US-*.md files (outside workspaces)
user-story-guidelines.md
README.md
CLAUDE.md
```

`apps/` are private deployable applications (never published). `packages/` are the reusable modules the apps consume.

### Package naming

All packages use `@scope/<name>` syntax. The scope is the kernel's public identifier, which is open — see [Q2 in open-questions.md](../open-questions.md). Until Q2 resolves, interim scope is `@petstory/…`. The scope is a one-line rename when Q2 closes.

Package names match the workspace directory name (`@petstory/kernel` = `packages/kernel`). Domain Packs use `pack-*` prefix in the package name to make them scannable: `@petstory/pack-pet-health`.

### Shared base configs — `packages/config/`

A single workspace package owns the shared base configs every other workspace extends:

- `tsconfig.base.json` — `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` per R5.
- `biome.json` — lint + format per R14.
- `eslint.config.js` — the narrow allowlist (react-hooks, jsx-a11y, boundaries) per R14.
- `lefthook.yml` — pre-commit + pre-push + commit-msg hooks per R14.
- `lighthouserc.json` — perf budgets per R7.
- `vitest.base.ts` — shared Vitest config (coverage thresholds, setup files).
- `turbo.json` tasks shared via Turborepo's `extends`.

Per-workspace configs extend the base and override only what's specific.

### Versioning: Changesets with independent per-package semver

**Changesets** is the versioning tool. Rationale: allows independent per-package semver (kernel vs. packs vs. shells versioned separately), integrates with GitHub Actions, produces changelogs from contributor-authored markdown. Industry standard for 2026 TS monorepos.

Rejected alternatives: **single-version monorepo** (kernel and packs version in lockstep) — rejected because kernel's stability promise differs from a pack's iteration velocity; **semantic-release** — great for single-package repos, awkward across workspaces; **Lerna** — essentially sunset in favor of Turborepo + changesets.

Per R2 (latest stable), breaking changes in kernel or primitives require a major bump; per R22 (OCP), extension-slot signature changes are breaking.

### Task pipeline (Turborepo)

Standard tasks every package defines:

| Task | Purpose |
|---|---|
| `build` | Produce the package's output (TS compilation, bundling where applicable) |
| `lint` | Biome + narrow ESLint |
| `test` | Vitest unit + integration |
| `typecheck` | `tsc --noEmit` |
| `eval` | Braintrust agent evals (packs only) |

Turborepo pipeline wires dependencies — `build` depends on upstream `build`; `test` depends on local `build`. Remote cache hits skip re-execution on unchanged inputs.

CI runs `turbo run lint test typecheck --affected` so PRs only test what their diff touched, per R11 merge gates.

### Inter-package dependency rules

- **Workspace protocol.** Packages depend on other packages via `workspace:*` syntax — never a version range. Enforced at install time.
- **No phantom imports.** A package may only import from packages it declares in its own `package.json`. Enforced via R14's dependency-cruiser and TypeScript project references.
- **Layer boundaries enforced by dependency-cruiser rule set.** The ADR-002 dependency rule (L3→L2→L1→L0) is configured in `.dependency-cruiser.json` at repo root.
- **Strict peer dependencies.** `strict-peer-dependencies=true` in `.npmrc`. Peer conflicts surface at install, not at runtime.
- **Overrides sparingly.** `pnpm.overrides` is reserved for security patches and breaking-change bridging; each override carries a `// reason:` comment in `package.json` per R5's justification norm.

### Publishing

All packages start **private** (`"private": true`). No npm publishing until Q2 (kernel public name) resolves and we explicitly decide to spin out the kernel. Internal consumption is via workspace protocol only.

### Renovate + dependency management

Renovate bot per R14 drives dependency upgrades. Config groups upgrades by type: patch auto-merged (with green CI), minor in weekly batches (Thursday cadence per R2), majors as their own PRs with an ADR mention when the bump affects the kernel.

### CI matrix

- `turbo run lint test typecheck --affected` on every PR.
- Full matrix (`turbo run lint test typecheck build`) on `main` merges and nightly.
- Remote cache on both flows.
- Per R11, the affected set must be green for merge.

## Rationale

### Why pnpm, not npm or yarn

pnpm's symlink-based `node_modules` prevents phantom imports (which R14 bans), deduplicates dependencies across workspaces, and is measurably faster than npm/yarn for workspace installs. Industry consensus for 2026 TS monorepos.

### Why Turborepo, not Nx or Moon

Turborepo is the minimum viable orchestrator: task graph, caching, affected-graph. Nx is more powerful (generators, code intelligence, project graph UI) but heavier than we need at scale one. Moon is younger and less established. Revisit if Turborepo's limitations bite — but "cache + task graph" is the core need, and Turborepo nails that.

### Why changesets

Per-package independent semver matters because the kernel's stability contract is different from a pack's. Changesets puts the semver decision in the contributor's PR (they write a changeset explaining the impact), generates changelogs, and publishes in one GitHub Action. No ambiguity about "should this be a minor or major."

### Why shared configs in a package, not at repo root

A `packages/config/` workspace can be consumed via `workspace:*` like any other package. This gives us typed access to the base configs, local override semantics, and test-ability. Configs at repo root are accessible but not workspace-aware.

## Consequences

### Positive

- Atomic cross-layer commits — editing the kernel and a pack in one PR is natural, which is essential when an R22 extension-slot change lands.
- Single CI graph with affected-detection — PRs only run what they touched.
- Independent per-package versioning preserves the kernel's stability contract.
- Shared base configs eliminate drift between workspaces.
- Workspace protocol + strict peer deps + dependency-cruiser = no phantom imports, boundary violations surface at install/build time.

### Negative / risks

- Turborepo remote cache adds an external dependency (Vercel cache or self-host). Mitigated: local cache works without the remote, remote is an acceleration.
- Renovate configuration is its own small surface. Mitigated: preset configs handle 90% of needs.
- pnpm's strict resolution occasionally surfaces peer-dep conflicts that yarn would paper over. This is a feature, not a bug — conflicts you don't see are conflicts you hit in prod.
- One-time scope rename when Q2 resolves. Cheap (one codemod + one lockfile regen) but non-zero.

### Cross-cutting consequences

- **Security.** Single `pnpm-lock.yaml` is one file for Socket.dev + `npm audit` to scan; one license allowlist applies across the whole repo; one gitleaks config. Lockfile integrity is a single surface to verify.
- **Observability.** Turborepo's remote cache emits per-task telemetry (cache hit rate, build time) — feeds directly into CI dashboards. Affected-graph runs keep feedback loop short, which is itself an observability win.

## Follow-ups

Future ADRs (numbers assigned when the work begins):

- Monorepo seeding — the initial `pnpm init`, first workspace stub, first turbo task. Lands when the first real code lands.
- Remote cache strategy — Vercel hosted vs. self-hosted. Decide when multi-developer or when Vercel quota becomes a concern.
- Publishing strategy — when the kernel spins out as a standalone product or when we need to share code with a partner.
- Test-utils split — if `packages/test-utils` grows enough to warrant internal sub-packages (e.g. `test-utils/flow-fixtures`, `test-utils/mcp-mocks`).
