# ADR-007 — Bun for local development

**Status:** Accepted
**Date:** 2026-04-16
**Deciders:** Thiago
**Supersedes:** The package-manager + local-runtime sections of [ADR-005](ADR-005-monorepo-structure-and-tooling.md) (pnpm). The rest of ADR-005 (Turborepo, Changesets, workspace layout, sharing configs, etc.) stands.
**Depends on:** [ADR-001](ADR-001-stack.md), [ADR-005](ADR-005-monorepo-structure-and-tooling.md)

## Context

ADR-005 pinned pnpm + Node 22 as the monorepo package manager and local runtime. Two months in, Bun has matured enough (Bun 1.3 in 2026, ~98% Node-API compatibility, Anthropic-acquired, mainstream Turborepo + Expo integration) that the speed wins and unified tooling story are real.

The user's direction is unambiguous: "bun based, both development and runtime, update docs, update tooling." The honest scope is "Bun wherever Bun can actually reach us":

- **Bun-reachable** — package manager, local script runtime, test runtime (Vitest runs under Bun), `convex dev` client CLI, Mastra dev, Claude Agent SDK dev scripts.
- **Not Bun-reachable** — Convex cloud functions (run on Convex's own infra), iOS/Android native RN (Hermes / JSC), browser (RN Web), Vercel production functions (Vercel's runtime).

Per R0, the decision only replaces what Bun can actually replace.

## Decision

Adopt Bun 1.3+ as the local development package manager, script runner, and test runtime.

### What Bun replaces

- **Package manager** — `bun install` replaces `pnpm install`. Lockfile becomes `bun.lock` instead of `pnpm-lock.yaml`. 6-8× faster than pnpm on cold installs, 25-30× faster than npm.
- **Script runner** — `bun run <script>` replaces `pnpm run`. `bun` runs TypeScript directly (no `tsx` / `ts-node` needed for dev scripts).
- **Workspace manifest** — workspaces move from `pnpm-workspace.yaml` to the `workspaces` field in root `package.json` (Bun's canonical location).
- **`.npmrc`** → `bunfig.toml` where Bun-specific knobs apply. The strict-peer-dependency posture carries over via `bunfig.toml`.

### What Bun does NOT replace

- **Convex cloud** — still our backend (ADR-001 unchanged). Functions run on Convex's own runtime, not Bun.
- **Expo / React Native** — native runtimes stay Hermes/JSC on device. Metro bundler is Expo-managed. Bun can drive `bun install` for Expo per Expo's official support, but Metro itself runs under Node when necessary (known Bun-Metro edge cases: `vm` module and file-watcher reliability).
- **Vitest** — stays as the test framework. Bun runs it fine; no migration to `bun test` until there's a concrete pain to justify it (R0).
- **Turborepo, Biome, Knip, dependency-cruiser, Lefthook, commitlint, Changesets, Renovate** — all tool choices unchanged. Bun runs their binaries through `bun run`.
- **TypeScript strict mode (R5)** — unchanged. Bun's direct-TS execution is a dev speedup; our strict config still governs.

### Engines posture

- `engines.bun`: `>=1.3`
- `engines.node`: `>=22` remains declared so contributors whose environments use Node (e.g., running Metro directly, running a Convex dev CLI that expects Node) don't break. `.nvmrc` stays pinned to Node 22 as the fallback runtime. `.bun-version` pins Bun.

## Rationale

### Why Bun now

- **2026 maturity.** Bun 1.3 hit ~98% Node-API compatibility. Anthropic acquisition adds strategic alignment (our Claude Agent SDK + Mastra stack gets a same-vendor runtime).
- **Speed.** `bun install` on our 10-workspace scaffold is measurably faster than `pnpm install`. Startup for dev scripts is 10× Node.
- **Unified tooling.** One binary for package install, script run, test, and bundle (even if we don't use the test/bundle pieces yet).

### Why not bleeding-edge (Bun-only, no Node fallback)

- **Metro + Bun edge cases.** Metro's file watcher and `vm` module usage are imperfect under Bun per 2026 reports. Keeping Node available as a fallback for Expo's dev server buys reliability without giving up Bun's speed for the 95% case.
- **Convex CLI.** Convex's `convex dev` targets Node. Works under Bun's compat but isn't officially blessed; the Node fallback is cheap insurance.
- **R0.** We adopt Bun for the concrete wins; we keep Node available for the concrete risks. Cheapest thing that fixes the current problem.

### Why keep Vitest, not switch to `bun test`

- Vitest has a mature feature set (UI mode, coverage providers, snapshot tooling, Braintrust integration via its reporter hooks) we already rely on in R4.
- `bun test` is fast but has a narrower API. Migration isn't free, and R0 vetoes cost-without-proportional-benefit.
- Revisit if Vitest under Bun proves slow enough to matter (unlikely at scale zero).

### Alternatives rejected

- **Stay on pnpm.** Cheapest no-op, but the user's direction is clear and Bun's 2026 story has matured past the "experimental" label.
- **Bun-for-everything (drop Node entirely).** Metro + Convex CLI compatibility gaps make this risky. The 95% case is faster; the 5% case is a dealbreaker if it bites.
- **Deno.** More runtime-focused, weaker package-management story for monorepos. Ruled out by the same reasoning that pointed at Bun.

## Consequences

### Positive

- Faster cold installs, faster script startup, direct TS execution without a transpile layer.
- Anthropic-vendor alignment with Claude Agent SDK + Mastra.
- Fewer transitive dev-tool layers (`tsx`, `ts-node`, etc.) — Bun handles TS natively.
- `bun install --frozen-lockfile` in CI tracks deterministic builds.

### Negative / risks

- **Lockfile format change.** `bun.lock` replaces `pnpm-lock.yaml`. Contributors who were used to pnpm semantics need to learn Bun's. Small cost.
- **Workspace protocol.** Bun's `workspace:*` support in 2026 is functional but less battle-tested than pnpm's. Verified during this ADR's execution on the 10-workspace scaffold.
- **Metro + Bun.** Covered by the Node fallback for Expo dev, but a real contributor may hit it. Documented in the mobile-app README when that app gets scaffolded.
- **Native modules via node-gyp.** Bun's 98% compat has a 2% tail; audit native deps if any land (R20 applies).

### Cross-cutting consequences

- **Security.** Lockfile + Socket.dev + gitleaks + license-checker all still run — just against `bun.lock` instead of `pnpm-lock.yaml`. License allowlist (R8) unchanged.
- **Observability.** Script execution speed improves slightly; no change to runtime observability posture (Braintrust + Sentry + PostHog are SaaS, unaffected).

## Self-hosted Convex for integration tests

User flagged: "I want to be able to explore non-cloud convex so we can run integ tests." This is a distinct capability from the Bun migration and is intentionally **deferred** as a separate future ADR.

Convex is open-source (Apache-2.0, Rust backend). Self-hosting is feasible for integration tests where cloud round-trips are expensive or egress-sensitive. When we have real integration tests that need this, a future ADR will cover: Docker Compose harness location, per-pack schema seeding, ephemeral instances per test run, CI integration.

Not implementing today per R0 — no concrete integ-test pain yet.

## Follow-ups

Future ADRs (numbers assigned when the work begins):

- **Self-hosted Convex for integration tests.** Triggered when the first integ test needs it.
- **Revisit `bun test` vs Vitest** — when Vitest performance becomes a bottleneck or when Bun's test ecosystem matures enough that the switch earns its weight.
- **Deprecate Node fallback** — when Metro + Bun and Convex CLI + Bun reach parity with Node; not before.
