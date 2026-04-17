# petstory.co — ultimate project frontend (per R23).
# Every canonical task for testing, building, checking, dev-ing goes here.
# `just` itself is a system tool — install via `brew install just`, `cargo install just`,
# or download from https://just.systems. See engineering-rules.md R23.

set shell := ["bash", "-cu"]
set positional-arguments

# Default target: list all commands.
default:
    @just --list --unsorted

# -----------------------------------------------------------------------------
# Install & bootstrap
# -----------------------------------------------------------------------------

# Install dependencies with Bun (ADR-007). Frozen-lockfile flag optional.
install frozen="":
    @if [ "{{frozen}}" = "frozen" ] || [ "{{frozen}}" = "--frozen-lockfile" ]; then \
        bun install --frozen-lockfile; \
    else \
        bun install; \
    fi

# Install lefthook git hooks locally (required after fresh clone).
install-hooks:
    bun run lefthook install

# -----------------------------------------------------------------------------
# Turbo pipeline — the core build/check/test loop
# -----------------------------------------------------------------------------

# Build every workspace (respects Turbo task graph + cache).
build:
    bun run turbo run build

# Lint every workspace via Biome per R14.
lint:
    bun run turbo run lint

# Typecheck every workspace (tsc --noEmit).
typecheck:
    bun run turbo run typecheck

# Run unit + integration tests (Vitest under Bun per R4 + ADR-007).
test:
    bun run turbo run test

# Run Braintrust agent evals (pack-level; no-op on packages without eval task per R4).
eval:
    bun run turbo run eval

# Affected-only runs (used by CI per R11). Pass args to target affected packages.
affected *args:
    bun run turbo run {{args}} --affected

# -----------------------------------------------------------------------------
# Code quality & static analysis
# -----------------------------------------------------------------------------

# Biome check (format + lint diagnostics). Non-destructive.
check:
    bun run biome check .

# Biome format the whole repo in place.
format:
    bun run biome format --write .

# Biome + auto-fix + format on staged files (used by pre-commit hook).
check-staged:
    bun run biome check --staged --write --no-errors-on-unmatched

# Knip — dead code, unused deps, unused exports (R14, R15).
knip:
    bun run knip --no-exit-code

# Dependency-cruiser — ADR-002 layer boundary enforcement.
depcruise:
    bun run depcruise --config .dependency-cruiser.json packages apps

# Validate current branch name against R21 regex.
verify-branch:
    #!/usr/bin/env bash
    branch="$(git rev-parse --abbrev-ref HEAD)"
    if [ "$branch" = "main" ]; then exit 0; fi
    if ! echo "$branch" | grep -qE '^(feat|fix|docs|chore|refactor|test|perf|build|ci|revert)/[a-z0-9-]+$'; then
        echo "Branch '$branch' violates R21. Format: <type>/<short-kebab-desc>"
        echo "Types: feat|fix|docs|chore|refactor|test|perf|build|ci|revert"
        exit 1
    fi

# -----------------------------------------------------------------------------
# Composite targets
# -----------------------------------------------------------------------------

# Full local CI equivalent. Run before pushing to spot regressions locally.
ci: lint typecheck test knip depcruise
    @echo "✓ local CI passed"

# Auto-fix everything Biome can fix + re-run checks.
fix: format
    bun run biome check --write .

# Run all checks in parallel — good for a fast "is everything green" sanity check.
verify: check typecheck

# -----------------------------------------------------------------------------
# Convex (backend)
# -----------------------------------------------------------------------------

# Start Convex dev deployment. Requires CLERK_JWT_ISSUER_DOMAIN in .env.local.
convex-dev:
    bun run convex dev

# Deploy Convex to the configured environment.
convex-deploy:
    bun run convex deploy

# -----------------------------------------------------------------------------
# Versioning
# -----------------------------------------------------------------------------

# Create a new changeset for the next release (ADR-005 + Changesets).
changeset:
    bun run changeset

# Apply pending changesets (bumps versions + updates changelogs).
version:
    bun run changeset version

# -----------------------------------------------------------------------------
# Housekeeping
# -----------------------------------------------------------------------------

# Remove node_modules, build outputs, and Turbo cache.
clean:
    bun run turbo run clean
    rm -rf node_modules .turbo
