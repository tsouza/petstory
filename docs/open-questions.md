# Open questions

Decisions deliberately deferred. Revisit when the timing is right.

## Q1 — Interaction specs missing from user stories

**Raised:** 2026-04-16 during MVP prototype work.

**Context:** The 123 user stories in `user-stories/` have no interaction flows, screen maps, or step-by-step "how the user goes through this" documentation.

**Why it's deliberate:** [`../user-story-guidelines.md`](../user-story-guidelines.md) R5 says "Don't prescribe UI in the story." Job Stories (JTBD) keep stories at situation/motivation/outcome level. Acceptance criteria describe *behavior* ("≤ 2 taps"), never *interaction* ("user taps X, then sees Y").

**The gap:** when building, there's no artifact between US and code that says "this is the flow." Currently only `mockup-chat-dashboard.jsx` and `viz-library-mockups.jsx` hint at the *how*.

**Options surfaced (not chosen):**

1. Add optional "Interaction flow" section to US files. Breaks JTBD purity, adds operational detail.
2. Separate interaction-spec docs per cluster, e.g. `interactions/INT-DR-meal-logging.md`, referencing the US.
3. Flow diagrams per critical journey (onboarding, symptom report, vet export).

**Recommendation when revisiting:** prototype option 2 or 3 with 2–3 critical stories (e.g. OB-001, DR-001, SP-001) before scaling the format.

---

## How to add new questions here

```
## QN — Title

**Raised:** YYYY-MM-DD in [context].

**Context:** …

**Options:**
1. …
2. …

**Recommendation:** …
```

Promote to an ADR under `decisions/` once resolved.
