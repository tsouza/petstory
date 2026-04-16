# Three-level agent framework

Non-negotiable complement to [layers.md](layers.md). Established 2026-04-16. Decision record in [../decisions/ADR-003-three-level-agent-framework.md](../decisions/ADR-003-three-level-agent-framework.md).

## The thesis

A single universal agent loop cannot serve every domain and every situation efficiently. Google research shows universal orchestrators lose 39–70% on sequential reasoning vs. tailored flows; enterprise systems report "domain overload" when one loop tries to be good at everything. The answer is three layers of abstraction that together replace a monolithic loop: a universal **Execution Spine**, a pack-owned **Flow Catalog**, and a pack-owned **Situation Classifier** that picks the flow per message.

Unix analogy: Spine = kernel scheduler. Flows = processes. Situation Classifier = process picker. Domain Packs = installable process manifests.

## Level 1 — Execution Spine

Universal. Lives in the kernel (L0). Never changes per domain.

Four tiers define *when* work happens and at *what cost point*:

| Tier | Timing | Model class | Purpose |
|---|---|---|---|
| T1 — Fast Path | Synchronous, ~1–2s | Haiku | Route, decompose, parallel tool-DAG, immediate ack. ~80% of messages never leave this tier. |
| T2 — Deep Path | Async, minutes | Sonnet orchestrator + Sonnet workers | Parallel specialist dispatch, synthesis, bounded replan. Diary-delivered. |
| T3 — Critic Gate | Every user-facing AI string | Haiku | Evaluator-Optimizer against pack-registered rules. One repair pass, fallback template. |
| T4 — Long-Horizon | Scheduled | Claude Managed Agents, Opus possible | Weekly summaries, anomaly sweeps, longitudinal reports. |

Cost tiers are enforced by the Flow runtime. A Flow declaring T1 cannot spawn an Opus call.

## Level 2 — Flow Catalog

Per Domain Pack. A catalog of named, versioned Flow definitions. Hand-authored, testable, diffable, safety-auditable. **Not auto-generated** — we reject FlowReasoner / MetaAgent-style auto-synthesis for safety and determinism reasons. See [ADR-003](../decisions/ADR-003-three-level-agent-framework.md).

### Flow DSL shape

A Flow is a TypeScript object interpreted by the kernel's Flow runtime.

```ts
interface Flow {
  name: string;                       // "symptom-triage-flow"
  version: string;                    // semver
  pack: string;                       // "pet-health"
  description: string;

  trigger: FlowTrigger;               // situation match
  tierBinding: TierBinding;           // which tiers this flow touches
  budget: FlowBudget;                 // maxTokens, maxLatencyMs, maxReplans

  state: StateSchema;                 // zod-typed shared state

  entryNode: string;
  nodes: Record<string, FlowNode>;
  edges: FlowEdge[];

  stopCondition: StopCondition;
  escalation: EscalationPolicy;

  // Cross-cutting concerns — security (R8) and observability (R6) operationalized
  // at the Flow level. Not siloed; these fields are read by log redactors,
  // Braintrust eval harness, Sentry scrubbers, and cost-per-DAU dashboards.
  piiHandling?: {
    contains: Array<'petName' | 'tutorContact' | 'health' | 'behavioral' | 'payment'>;
    logsRedacted: true;               // R8 — raw values never reach Sentry/logs
  };
  observability?: {
    expectedCostPerMessage?: number;  // USD; feeds cost-per-DAU dashboard (R6)
    braintrustDataset?: string;       // eval dataset this flow belongs to (R4)
    perNodeLatencyBudgetMs?: Record<string, number>;  // override tier default (R13)
  };
}

type FlowNode =
  | RouterNode             // classify and pick next edge
  | WorkerNode             // call an MCP tool or specialist sub-agent
  | ParallelDispatchNode   // spawn N workers concurrently
  | CriticNode             // evaluate output against pack-registered rules
  | ClarifierNode          // ask user one EVPI-ranked targeted question
  | ReplanNode             // bounded replan from current state
  | SynthesisNode          // combine parallel results
  | HumanHandoffNode;      // escalate to vet / user

type FlowEdge = {
  from: string;
  to: string;
  condition?: EdgeCondition;   // confidence threshold, state predicate
  priority?: number;
};
```

### Required declarations per Flow

- `trigger` — deterministic predicate or classifier output that activates this flow.
- `tierBinding` — any combination of T1–T4. Flow runtime refuses to spawn a model outside the declared tiers.
- `budget` — token, latency, and replan caps. Exhaustion triggers `escalation`.
- `stopCondition` — explicit. "All spawned workers returned AND critic passed" or similar.
- `escalation` — what happens on critic fail, budget exhaustion, or unresolved ambiguity. Default: defer to a scheduled follow-up rather than fail loudly.

### Invariants the runtime enforces

- Every Flow with user-facing output **must** route through T3 (Critic Gate). No bypass.
- A Flow may call Opus only if its `tierBinding` includes T2 or T4 **and** the call is gated on a premium check.
- A Clarifier node may only emit **one** question per turn. SAGE-Agent data: capped clarification yields 1.5–2.7× fewer questions at higher coverage.
- A Flow cannot read state from another pack.
- Parallel dispatch is the preferred shape when nodes are independent. Sequential only when there is a state dependency.

## Level 3 — Situation Classifier

Per Domain Pack. A fast Haiku call on every inbound event that picks which Flow runs.

Deterministic where possible (keyword hit on a red-flag symptom → `red-flag-flow` immediately, no LLM) and LLM-routed only when the situation is fuzzy. The classifier output is typed:

```ts
interface SituationClassification {
  flow: string;              // flow name in the catalog
  confidence: number;        // 0..1
  reason: string;            // why this flow, for observability
  fallback?: string;         // second-best flow if the first fails
}
```

Confidence policy (Amazon / Maven three-band pattern):

- `>= 0.85` — run the chosen flow directly.
- `0.60 – 0.85` — run the chosen flow, surface a soft confirmation in the ack.
- `< 0.60` — route to `clarify-flow` instead.

## Pet-health Flow Catalog v1 (illustrative)

The pet-health pack ships approximately eight flows for v1. Names are working titles; keep the set small and earn additions.

| Flow | Trigger | Tiers | Notes |
|---|---|---|---|
| `routine-log-flow` | Normal chat with logged events | T1 + T3 | Single Haiku call, parallel tool DAG, ack. 80% path. |
| `clarify-flow` | Low Tier-1 confidence | T1 + T3 | One EVPI-ranked targeted question. Cap one per turn. |
| `symptom-triage-flow` | Suspected symptom | T1 + T2 + T3 | Immediate ack, async correlation, clinical critic. |
| `red-flag-flow` | Keyword match on high-severity symptom | T1 + T3 | Synchronous escalation, mandatory "consulte o veterinário". |
| `onboarding-flow` | First 7 days of tutor | T1 + T3 | Guided prompt-chain, scripted nudges. |
| `treatment-monitoring-flow` | Active medication recorded | T1 + T3 + T4 | Adherence loop, daily check-ins. |
| `weekly-insight-flow` | Scheduled, weekly | T4 + T3 | Managed Agent, Reflexion-style self-critique, diary post. |
| `vet-export-flow` | "Levar ao vet" tap | T2 + T3 | Templated report generation. |

New flows are added only when (a) an existing flow is doing two unrelated things, or (b) a new situation has no reasonable host. Flow sprawl is the failure mode. See [flow-catalog-reviewer agent](../../.claude/agents/flow-catalog-reviewer.md).

## Lifecycle

- **Registration** — a pack exports its flows at boot; the kernel validates the DSL.
- **Versioning** — flows are semver'd. Breaking changes require a major bump and migration of in-flight runs.
- **Testing** — every flow ships with unit tests per node, integration tests per trigger situation, and a golden-path prompt eval in Braintrust.
- **Deprecation** — flows can be marked deprecated but must serve in-flight runs to completion before removal.

## Runtime: Mastra

The Flow runtime is [Mastra](https://mastra.ai) — TS-first agent + workflow framework (Gatsby team, v1.0 Jan 2026, 300k+ weekly npm). Mastra's `workflow` primitive maps 1:1 onto our Flow graph (nodes, edges, state, branching, parallel, nesting). MCP-first, Braintrust-friendly evals, TS end-to-end, Mastra Studio for flow visualization.

Our Flow DSL is a **thin typed wrapper** over Mastra workflows that adds pack-level invariants (tier binding, mandatory T3 critic gate, one-clarifier-per-turn, no cross-pack state, Opus-gated-on-premium). Mastra owns runtime; we own contract.

Per-node agent harnessing stays on the Claude Agent SDK (per ADR-001). Composition: **Mastra workflow = graph runtime. Agent SDK = per-node agent harness.**

## Flows and Domain Events

Flows produce **Domain Events** from the pack's event schema (artifact 1 of the Domain Pack contract — see [layers.md](layers.md) and [ADR-004](../decisions/ADR-004-ddd-strategic-adoption.md)). WorkerNodes that mutate state do so by emitting typed Domain Events (`MealRefused`, `SymptomObserved`, etc.); the timeline, diary, and correlation projections are downstream read models over that event stream. This is the primary write/read split in the architecture — CQRS-shaped without the ceremony.

Mastra's internal runtime events (step transitions, retries, suspensions) are distinct from Domain Events and stay scoped to the runtime. Domain Events are pack-level, stable, and semver'd alongside the Flow Catalog.

## How the wrapping works

Flows are **declarative specs compiled to Mastra workflows at boot**, not direct Mastra API usage scattered through code.

Pack authors write:

```ts
// packs/pet-health/flows/symptom-triage.ts
export const symptomTriage = defineFlow({
  name: 'symptom-triage-flow',
  version: '1.0.0',
  pack: 'pet-health',
  trigger: { situation: 'suspected_symptom' },
  tierBinding: ['T1', 'T2', 'T3'],
  budget: { maxTokens: 60_000, maxLatencyMs: 3_000, maxReplans: 2 },
  state: SymptomTriageState,
  entryNode: 'classify',
  nodes: {
    classify:   router({ model: 'haiku', outputs: ['clarify', 'proceed'] }),
    clarify:    clarifier({ model: 'haiku', evpi: true }),
    dispatch:   parallel([worker('symptom-correlator'), worker('kb-retriever'), worker('context-builder')]),
    synthesize: worker('clinical-synthesizer'),
    criticGate: critic({ rules: 'pet-health:clinical' }),
  },
  edges: [
    { from: 'classify',   to: 'clarify',    when: 'confidence<0.6' },
    { from: 'classify',   to: 'dispatch',   when: 'confidence>=0.6' },
    { from: 'dispatch',   to: 'synthesize' },
    { from: 'synthesize', to: 'criticGate' },
  ],
  stopCondition: 'criticGate:passed',
  escalation: { onCriticFail: 'useTemplate', onBudgetExhaust: 'deferToNudge' },
});
```

The kernel's Flow compiler (`@kernel/flows/compile`) takes the spec and emits a Mastra workflow via Mastra's fluent API (`.then()`, `.branch()`, `.parallel()`, `.doWhile()`). Invariants run as compile-time validation before any Mastra call:

- Flow with user-facing output but no critic node on every terminal path → throws.
- `tierBinding: ['T1']` with a node using `model: 'opus'` → throws.
- `clarifier` node with `maxPerTurn !== 1` → throws.
- Edge references undefined node → throws.
- State access crosses pack boundary → throws.

## Escape hatch: `rawMastra()`

Opaque wrapping is a perfect-abstraction trap. Some Mastra features won't have a clean DSL equivalent — streaming partial tokens, `RuntimeContext` manipulation, bespoke suspension patterns. Rather than block access, the DSL exposes a `rawMastra()` node type:

```ts
nodes: {
  specialResume: rawMastra(wf => wf.doWhile(ctx => !ctx.resolved, handleStep)),
}
```

Usage is flagged by `flow-catalog-reviewer`; the flow must argue why a higher-level abstraction can't serve. If the same raw pattern recurs across flows, it graduates to a first-class DSL node type.

## Exit ramp

If Mastra stalls or the relationship goes wrong, only `@kernel/flows/compile` needs to change. Every Flow definition in every pack keeps working unchanged. Likely migration target: LangGraph.js. Re-evaluate at ~12-month cadence per ADR-003.

## Why not alternatives

- **LangGraph.js** — production-stable, TS-native, excellent. Rejected because StateGraph + LangChain ecosystem is heavier than needed and competes with the Agent SDK as the agentic harness. Two agentic runtimes is a tax.
- **Vercel AI SDK v6 + Vercel Workflow** — strong durable execution, but agent primitives are lower-level than Flow graphs. Reconsider if Mastra's durability proves inadequate.
- **Inngest AgentKit** — best durable execution in TS, but its platform duplicates Convex scheduled functions.
- **DSPy** — optimizer-first; wrong shape for hand-authored safety-audited flows.
- **Custom build** — considered. Rejected once we validated Mastra covers the runtime needs. Our value-add is the pack-level contract, not reinventing graph execution.

## Enforcement

Sub-agent `flow-catalog-reviewer` checks any proposed new flow. Invoke with `use flow-catalog-reviewer` before registering.
