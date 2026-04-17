# Contributing to petstory.co

Before your first commit, read [`CLAUDE.md`](CLAUDE.md) (project index) and [`docs/engineering-rules.md`](docs/engineering-rules.md). This file is the practical cheat-sheet on top.

## Setup

```bash
just install         # bun install
just install-hooks   # lefthook hooks
just ci              # local CI sanity check
```

`just --list` for every available task. Everything canonical goes through Just — never raw `bun run X` for documented workflows.

## The R21 cycle

Every non-trivial change runs through seven steps on its own branch:

```
branch  →  apply  →  commit  →  push  →  test (CI)  →  re-evaluate  →  merge (squash)
```

- **Branch names** match Conventional-Commits types: `feat/<desc>` · `fix/<desc>` · `docs/<desc>` · `chore/<desc>` · `refactor/<desc>` · `test/<desc>` · `perf/<desc>` · `build/<desc>` · `ci/<desc>` · `revert/<desc>`. Description is kebab-case, ≤ 50 chars, all lowercase. With a ticket: `<type>/<ticket-id>-<desc>`. Validator regex in `lefthook.yml`.
- **Commits** use Conventional Commits 1.0 subjects (≤ 100 chars, lowercase). `commitlint` runs in the `commit-msg` hook.
- **PRs** are squash-merged, target ≤ 400 diff lines (R10). PR body must answer the checklist in `.github/pull_request_template.md`.
- **Direct commits to `main` are blocked** by repository rules — everything goes through a PR.

## Testing expectations (R4)

- **Unit:** Vitest + fast-check property-based for pure logic.
- **Integration:** Convex test harness for backend, MSW for network.
- **Component:** Storybook 9 + React Native Reusables.
- **Visual regression:** Chromatic.
- **E2E:** Playwright (web), Maestro (mobile).
- **Agent evals:** Braintrust per Flow — golden path + adversarial + clinical-safety regression.
- **Mutation:** Stryker (targeted — kernel invariants, Flow DSL compiler, clinical-safety critic, auth/payment).

CI runs the subset relevant to the affected workspaces.

## Library adoption (R20)

Before `bun add <library>`, the PR description includes:

- **At least 2 candidates considered.** Each with: GitHub stars, weekly npm downloads, last-commit date, license, reason accepted-or-rejected.
- **Why the chosen one is the best fit.**

Tier-zero deps already adopted via ADRs (React, TypeScript, Bun, Zod, Mastra, Agent SDK, Convex client, Clerk, etc.) are exempted.

## Code integrity (R15)

No placeholders. No silent fallbacks. No naked TODO/FIXME without a tracked issue link. No empty `catch {}`. No commented-out code. If a function signature is in `main`, it works.

Explicit exceptions: a placeholder in a staging screen before its backend exists is fine if the PR title says so, an ADR records the plan, and the code carries a visible marker like `/* PLACEHOLDER(issue-ref): … */`.

## Security & secrets (R8)

- Secrets in Infisical/Doppler, never in code/lockfiles/env files checked into the repo.
- PII tagged per Domain Event's PII class (`glossary.md` per pack).
- Raw user messages never reach Sentry — redaction runs in `beforeSend`.
- Gitleaks + Socket.dev + license-checker run in CI.

## Communication

Project status updates go to [`ntfy.sh/petstory-dev`](https://ntfy.sh/petstory-dev) per `.claude/CONVENTIONS.md`. Subscribe if you want to follow commits, milestones, blockers.
