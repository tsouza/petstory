# petstory.co — canonical task runner.
# `just` itself is a system tool — install via `brew install just`, `cargo install just`,
# or download from https://just.systems.
#
# Tool invocations use `bunx` (explicit binary, never ambiguous with an npm script).
# No root package.json scripts are relied on — everything resolves through Bun's bin dir.

set shell := ["bash", "-cu"]
set positional-arguments

# Default target: list all commands.
default:
    @just --list --unsorted

# -----------------------------------------------------------------------------
# Install & bootstrap
# -----------------------------------------------------------------------------

# Install dependencies with Bun. Frozen-lockfile flag optional.
install frozen="":
    @if [ "{{frozen}}" = "frozen" ] || [ "{{frozen}}" = "--frozen-lockfile" ]; then \
        bun install --frozen-lockfile; \
    else \
        bun install; \
    fi

# Install lefthook git hooks locally (required after fresh clone).
install-hooks:
    bunx lefthook install

# -----------------------------------------------------------------------------
# Turbo pipeline — the core build/check/test loop
# -----------------------------------------------------------------------------

# Build every workspace (respects Turbo task graph + cache).
build:
    bunx turbo run build

# Lint every workspace via Biome.
lint:
    bunx turbo run lint

# Typecheck every workspace (tsc --noEmit).
typecheck:
    bunx turbo run typecheck

# Run unit + integration tests (Vitest).
test:
    bunx turbo run test

# Thresholds live in packages/config/vitest.base.ts (80/80/75/80).
# Run tests with coverage across every workspace.
coverage:
    bunx turbo run test -- --coverage

# Run Vitest in watch mode on a specific workspace (e.g. `just watch kernel`).
watch pkg:
    bunx turbo run test --filter=@petstory/{{pkg}} -- --watch

# Run Braintrust agent evals (pack-level; no-op on packages without an eval task).
eval:
    bunx turbo run eval

# Affected-only runs (used by CI). Pass args to target affected packages.
affected *args:
    bunx turbo run {{args}} --affected

# -----------------------------------------------------------------------------
# Code quality & static analysis
# -----------------------------------------------------------------------------

# Biome format + lint diagnostics on the root (non-destructive; no Turbo).
biome-check:
    bunx biome check .

# Biome format the whole repo in place.
format:
    bunx biome format --write .

# Biome + auto-fix + format on staged files (used by pre-commit hook).
check-staged:
    bunx biome check --staged --write --no-errors-on-unmatched

# Knip — dead code, unused deps, unused exports.
knip:
    bunx knip --no-exit-code

# Dependency-cruiser — enforces the L0 → L1 → L2 → L3 boundary rule.
depcruise:
    bunx depcruise --config .dependency-cruiser.json packages apps

# Run commitlint against a message file (used by commit-msg hook).
commitlint file:
    bunx commitlint --edit {{file}}

# Validate current branch name against the Conventional-Commits naming rule.
verify-branch:
    #!/usr/bin/env bash
    branch="$(git rev-parse --abbrev-ref HEAD)"
    if [ "$branch" = "main" ]; then exit 0; fi
    if ! echo "$branch" | grep -qE '^(feat|fix|docs|chore|refactor|test|perf|build|ci|revert)/[a-z0-9-]+$'; then
        echo "Branch '$branch' must match <type>/<short-kebab-desc>."
        echo "Types: feat|fix|docs|chore|refactor|test|perf|build|ci|revert"
        exit 1
    fi

# -----------------------------------------------------------------------------
# Composite targets
# -----------------------------------------------------------------------------

# Lint + typecheck + test, with a visible header per phase.
check:
    @echo "▶ [1/3] lint"
    @just lint
    @echo "▶ [2/3] typecheck"
    @just typecheck
    @echo "▶ [3/3] test"
    @just test
    @echo "✓ check passed"

# Full local CI equivalent. Run before pushing to spot regressions locally.
ci:
    @echo "▶ [1/5] lint"
    @just lint
    @echo "▶ [2/5] typecheck"
    @just typecheck
    @echo "▶ [3/5] test"
    @just test
    @echo "▶ [4/5] knip"
    @just knip
    @echo "▶ [5/5] depcruise"
    @just depcruise
    @echo "✓ local CI passed"

# Auto-fix everything Biome can fix + re-run checks.
fix: format
    bunx biome check --write .

# Review the diff carefully — unsafe fixes can change behavior.
# Same as `fix`, but also applies Biome's *unsafe* fixes (import reorg, dead-code removal, etc.).
fix-unsafe: format
    bunx biome check --write --unsafe .

# -----------------------------------------------------------------------------
# Convex (backend)
# -----------------------------------------------------------------------------

# Start Convex dev deployment. Requires CLERK_JWT_ISSUER_DOMAIN in .env.local.
convex-dev:
    bunx convex dev

# Deploy Convex to the configured environment.
convex-deploy:
    bunx convex deploy

# -----------------------------------------------------------------------------
# Versioning
# -----------------------------------------------------------------------------

# Create a new changeset for the next release.
changeset:
    bunx changeset

# Apply pending changesets (bumps versions + updates changelogs).
version:
    bunx changeset version

# -----------------------------------------------------------------------------
# Housekeeping
# -----------------------------------------------------------------------------

# Remove node_modules, build outputs, and Turbo cache.
clean:
    bunx turbo run clean
    rm -rf node_modules .turbo
