# Open questions

Decisions deliberately deferred. Revisit when the timing is right.

## Q2 — Kernel's public name

**Raised:** 2026-04-16 during the layered architecture amendment ([ADR-002](decisions/ADR-002-layered-architecture.md)).

**Context:** `petstory` labels the Product Shell (L3) and the Domain Pack (L2) only. The kernel (L0) and the narrative primitives (L1) are brand-neutral by rule — no pet concepts, no PT-BR strings. But the kernel still needs a name: for package scoping (`@???/kernel`, `@???/conversation`), for internal doc references, and eventually for any case where the kernel surfaces as its own product.

**Why it matters:** Vertical SaaS 2.0 data from 2026 shows platforms that later monetize the core are the ones that kept the brand detached from day one. If the kernel is `@petstory/kernel` forever, spinning it out is a rename-plus-migration; if it has its own identity, it's a package publish.

**Options surfaced (not chosen):**

1. Anonymous under petstory scope (`@petstory/kernel`, `@petstory/conversation`). Cheapest, loses future optionality.
2. Pick a brand-neutral internal name now (e.g. `storyline`, `narrativa`, `livevault`, `cortex`). Options open, tiny naming cost.
3. Defer until a second pack is actually in motion.

**Recommendation when revisiting:** pick option 2, but only when we have a second pack on the roadmap or when the kernel is about to ship to a first external consumer. Don't name for naming's sake.

**Downstream impact:** [ADR-005](decisions/ADR-005-monorepo-structure-and-tooling.md) uses `@petstory/…` as the interim package scope. When Q2 resolves to a new kernel name, that scope is a one-line rename (codemod + lockfile regen). No blocking dependency; the two decisions are coupled but not sequential.

---

## Q1 — Interaction specs missing from user stories

**Raised:** 2026-04-16 during MVP prototype work.

**Context:** The 123 user stories in `user-stories/` have no interaction flows, screen maps, or step-by-step "how the user goes through this" documentation.

**Why it's deliberate:** [`../user-story-guidelines.md`](../user-story-guidelines.md) WR5 says "Don't prescribe UI in the story." Job Stories (JTBD) keep stories at situation/motivation/outcome level. Acceptance criteria describe *behavior* ("≤ 2 taps"), never *interaction* ("user taps X, then sees Y").

**The gap:** when building, there's no artifact between US and code that says "this is the flow." Currently no interaction spec format has been chosen.

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
