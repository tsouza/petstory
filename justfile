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

# Run tests once against a single workspace (e.g. `just test-pkg kernel`).
test-pkg pkg:
    bunx turbo run test --filter=@petstory/{{pkg}}

# Typecheck a single workspace (e.g. `just typecheck-pkg kernel`).
typecheck-pkg pkg:
    bunx turbo run typecheck --filter=@petstory/{{pkg}}

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
# Expo apps (mobile = iOS/Android/web via RN, web = separate SSR app)
# -----------------------------------------------------------------------------

# Start the Expo dev server for the mobile app (interactive menu picks platform).
mobile-start:
    cd apps/petstory-mobile && bunx expo start

# Launch the mobile app on an iOS simulator (requires Xcode).
mobile-ios:
    cd apps/petstory-mobile && bunx expo start --ios

# Launch the mobile app on an Android emulator (requires Android Studio).
mobile-android:
    cd apps/petstory-mobile && bunx expo start --android

# Run the mobile app in a web browser (RN Web via Metro).
# Pass `lan` to bind to the local network IP (reachable from phone / other devices);
# pass `tunnel` for an ngrok-style public URL. Default is localhost.
mobile-web host="localhost":
    cd apps/petstory-mobile && bunx expo start --web --host {{host}}

# Static export of the mobile app's web build (writes to apps/petstory-mobile/dist).
mobile-web-build:
    cd apps/petstory-mobile && bunx expo export --platform web

# Build + serve the mobile web bundle locally for e2e testing.
# Produces the static bundle then starts a tiny file server bound to all interfaces.
mobile-web-preview port="4173":
    cd apps/petstory-mobile && bunx expo export --platform web
    bunx serve apps/petstory-mobile/dist -l {{port}} --no-clipboard --single

# -----------------------------------------------------------------------------
# End-to-end tests (Playwright)
# -----------------------------------------------------------------------------

# Install Playwright browser binaries. Run once after clone + after major Playwright bumps.
e2e-install:
    bunx playwright install --with-deps chromium

# Run Playwright e2e tests. Playwright's webServer config auto-launches `just mobile-web-preview`.
e2e *args:
    bunx playwright test {{args}}

# Open the Playwright HTML report from the last run.
e2e-report:
    bunx playwright show-report

# -----------------------------------------------------------------------------
# BitNet (local LLM for integration testing — not for product)
#
# Uses Microsoft's official container `mcr.microsoft.com/appsvc/docs/
# sidecars/sample-experiment:bitnet-b1.58-2b-4t-gguf` — ships bitnet.cpp +
# the b1.58-2B-4T GGUF pre-baked, exposes an OpenAI-compatible HTTP server
# on port 11434. No local build, no clang/cmake/python venv dance.
#
# A legacy native-build path (scripts/bitnet/preflight.sh) is retained for
# folks who want to hack on bitnet.cpp itself, but it currently hits an
# upstream clang-18 compile error (see docs/testing/bitnet.md).
# -----------------------------------------------------------------------------

_BITNET_IMAGE := "mcr.microsoft.com/appsvc/docs/sidecars/sample-experiment:bitnet-b1.58-2b-4t-gguf"
_BITNET_CONTAINER := "petstory-bitnet"
_BITNET_INTERNAL_PORT := "11434"

# Pull the official BitNet container. ~1.2 GB download; skip if already local.
bitnet-install:
    docker pull {{_BITNET_IMAGE}}

# Start the BitNet server in the background. Maps the container's 11434 to
# the given host port (default 11434). Idempotent — reuses a running
# container if the name already exists.
bitnet-serve port="11434":
    #!/usr/bin/env bash
    set -euo pipefail
    if docker ps --format '{{{{.Names}}' | grep -q "^{{_BITNET_CONTAINER}}$"; then
        echo "{{_BITNET_CONTAINER}} already running — reusing"
        exit 0
    fi
    if docker ps -a --format '{{{{.Names}}' | grep -q "^{{_BITNET_CONTAINER}}$"; then
        docker rm {{_BITNET_CONTAINER}} >/dev/null
    fi
    docker run -d --rm \
        --name {{_BITNET_CONTAINER}} \
        -p {{port}}:{{_BITNET_INTERNAL_PORT}} \
        {{_BITNET_IMAGE}} >/dev/null
    # Wait up to 30s for the model to load + listen.
    for _ in $(seq 1 30); do
        if curl -fsS "http://127.0.0.1:{{port}}/" >/dev/null 2>&1; then
            echo "bitnet listening on http://127.0.0.1:{{port}}"
            exit 0
        fi
        sleep 1
    done
    echo "bitnet did not come up within 30s — check `docker logs {{_BITNET_CONTAINER}}`"
    exit 1

# Stop the running BitNet container (no-op if not running).
bitnet-stop:
    #!/usr/bin/env bash
    if docker ps --format '{{{{.Names}}' | grep -q "^{{_BITNET_CONTAINER}}$"; then
        docker stop {{_BITNET_CONTAINER}} >/dev/null
        echo "stopped {{_BITNET_CONTAINER}}"
    else
        echo "{{_BITNET_CONTAINER}} is not running"
    fi

# Tail logs from the running BitNet container.
bitnet-logs:
    docker logs -f --tail 200 {{_BITNET_CONTAINER}}

# Quick smoke — POST a hello to the running server.
bitnet-ping port="11434":
    curl -s http://127.0.0.1:{{port}}/v1/chat/completions \
        -H 'Content-Type: application/json' \
        -d '{"model":"bitnet-b1.58-2B-4T","messages":[{"role":"user","content":"say hi in 3 words"}],"max_tokens":20}' \
        | jq .

# Legacy: native build path (hits an upstream clang-18 compile bug today).
# Kept for folks who want to hack on bitnet.cpp directly.
bitnet-native-preflight:
    ./scripts/bitnet/preflight.sh vendor/bitnet

# -----------------------------------------------------------------------------
# Dev — one command to start every local process you need to iterate
# -----------------------------------------------------------------------------

# Start BitNet (docker, detached) + Convex dev (background) + Expo web dev
# server (foreground, LAN). Ctrl+C stops the foreground server; a trap then
# stops Convex + BitNet cleanly.
# Ports: BitNet 11434, Convex via CONVEX_URL, Metro 8081.
#
# First run bootstraps Convex: `just convex-dev` will prompt to create a
# deployment and write CONVEX_DEPLOYMENT to .env.local. Subsequent runs
# connect silently. Set EXPO_PUBLIC_CONVEX_URL (from the deployment) so
# the app wires ConvexChatAdapter instead of the echo fallback.
dev host="lan":
    #!/usr/bin/env bash
    set -euo pipefail
    # Start BitNet first — its warm-up happens in parallel with Metro's boot.
    just bitnet-serve
    # Background Convex — streams filesystem changes to the dev deployment,
    # holds a WebSocket open for the client. Logs to convex.log for debug.
    just convex-dev > convex.log 2>&1 &
    CONVEX_PID=$!
    # Ensure both background processes exit regardless of how this recipe ends.
    trap 'echo; kill $CONVEX_PID 2>/dev/null || true; just bitnet-stop' EXIT INT TERM
    # Foreground Metro + Expo. Ctrl+C returns control; the trap runs.
    just mobile-web {{host}}

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
