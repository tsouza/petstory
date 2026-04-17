<!-- R11 PR merge gates. Replace placeholder prose with your actual content; keep the checklists. -->

## What & why

<!-- One paragraph: what this change does and the concrete pain it addresses (R0 — name the pain). -->

## Changes

<!-- Bulleted list of what changed. Link ADRs / engineering rules / user stories where relevant. -->

-

## Engineering rules — merge gates (R11)

- [ ] Tests, types, lint green (`just ci` passes locally)
- [ ] Relevant sub-agents invoked (`brand-guardian`, `viz-judge`, `ux-concept-keeper`, `clinical-safety-reviewer`, `architecture-guardian`, `flow-catalog-reviewer`, `user-story-author` — whichever apply)
- [ ] Braintrust eval regression ≤ baseline (agent-touching changes only)
- [ ] Performance budgets green (R7 — changes that touch hot paths)
- [ ] Gitleaks clean; no secret in diff (R8)
- [ ] No placeholders / silent fallbacks / commented-out code (R15)
- [ ] PR diff ≤ 400 lines, or size justified below (R10)

## Rule-specific callouts (fill when relevant)

- **R20 library adoption** (new `bun add` dep) — candidates considered, stars/downloads/last-commit/license per candidate, reason chosen:
- **R18 layer promotion** (new L0/L1 code) — concrete lower-layer use count (≥ 3 required):
- **R22 kernel edit** — three-question gate answered (existing slot? new slot? why a direct edit?):
- **R12 feature flag** — rollout flag + percentage plan + eval-drift threshold:

## Branch naming (R21)

Branch: `<type>/<short-kebab-desc>` where `<type>` ∈ {feat, fix, docs, chore, refactor, test, perf, build, ci, revert}.

## Screenshots / eval diffs (if UI or agent change)

<!-- Attach Chromatic diffs, Braintrust eval comparisons, or screenshots. -->
