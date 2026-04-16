# ADR-003 — Three-level agent framework: Spine, Flow Catalog, Situation Classifier

**Status:** Accepted
**Date:** 2026-04-16
**Deciders:** Thiago
**Supersedes:** —
**Depends on:** [ADR-002](ADR-002-layered-architecture.md)

## Context

ADR-002 establishes layers (kernel / primitives / pack / shell). This ADR answers the next question: what is the shape of the agent loop that runs *inside* that architecture?

Two candidate failures were considered.

One, a single universal orchestrator-workers loop. It handles the hard cases well but overshoots on the 80% of messages that want a single-shot fast path, and it's uniform where different situations in the same domain want different topologies (onboarding vs. acute symptom vs. weekly summary).

Two, ad-hoc code per situation. It fits each case but has no shared substrate — safety critics are re-implemented per path, cost discipline is per-developer, observability is uneven, and Domain Packs have no contract.

The research converges on a three-level abstraction: a universal execution substrate, a pack-owned catalog of named flows, and a pack-owned classifier that picks the flow. MetaAgent, FlowReasoner, LangGraph's StateGraph, and Anthropic's own "compose these primitives" posture all point the same direction.

## Decision

Adopt a three-level agent framework.

**Level 1 — Execution Spine.** Universal, kernel-owned. Four tiers define when work happens and at what cost: T1 Fast Path (Haiku, sync, ~80% path), T2 Deep Path (Sonnet orchestrator + workers, async), T3 Critic Gate (Haiku, every user-facing string), T4 Long-Horizon (Managed Agents, scheduled). Cost tiers are enforced by the Flow runtime.

**Level 2 — Flow Catalog.** Per Domain Pack. A catalog of named, versioned, typed Flow definitions. Hand-authored, testable, diffable. Flows are TypeScript objects interpreted by a small kernel runtime. Each Flow declares trigger, tier binding, budget, shared state schema, node graph, stop condition, and escalation policy. Invariants: every user-facing output routes through the critic gate; one clarification per turn; no cross-pack state access; Opus gated on premium + T2/T4.

**Level 3 — Situation Classifier.** Per Domain Pack. A fast Haiku call on every inbound event picks which Flow runs. Deterministic where possible, LLM-routed only when fuzzy. Confidence tiered: `>= 0.85` run; `0.60 – 0.85` run with soft confirmation; `< 0.60` route to `clarify-flow`.

The Flow DSL and the full spec live in [../architecture/flow-catalog.md](../architecture/flow-catalog.md).

## Rationale

### Why three levels, not one or two

One level (monolithic loop) cannot adapt topology per situation. Two levels (spine + flows, no classifier) would require every Flow's `trigger` to contain a full situation-detection prompt — duplicated, inconsistent, expensive. A single classifier upstream keeps detection in one place and Flows focused on execution.

### Why hand-authored, not auto-generated

MetaAgent-style FSM synthesis and FlowReasoner-style RL-trained meta-agents are research-grade. For consumer clinical-adjacent chat three requirements are incompatible with auto-generation: flows must be safety-auditable in advance (clinical-safety-reviewer needs something to review), flows must be deterministic under a given input class (regulators and tutors both want predictable behavior), and flow-level observability needs stable node names. Hand-authored catalog, classifier-driven selection, is the sweet spot until we have enough flows to see patterns worth automating.

### Why Mastra as the Flow runtime (corrected)

An earlier draft of this ADR proposed building a custom TS Flow interpreter. That was wrong: LangGraph.js is production-stable (42k+ weekly npm, TS-native — not Python-only as I'd claimed), and **Mastra** — TS-first framework from the Gatsby team, hit 300k+ weekly npm at v1.0 (Jan 2026) — is a closer fit to our needs than either a custom build or LangGraph.js.

We adopt **Mastra** as the Flow runtime. Rationale:

- Mastra's `workflow` primitive maps 1:1 onto our Flow graph concept (nodes, edges, state, branching, parallel execution, nesting).
- MCP-first architecture — core to our Domain Pack boundary (L2 packs expose their tools as MCP, kernel loads them).
- TS-native across the stack. No cross-runtime bridge. Fits the pnpm + Turborepo monorepo plan.
- Built-in evals align with the Braintrust integration (ADR-001).
- Mastra Studio gives flow visualization and debugging for free.
- Smaller surface area than LangGraph.js (no LangChain baggage).

Our Flow DSL becomes a **thin typed wrapper** over Mastra workflows that enforces pack-level invariants (tier binding, mandatory T3 critic gate, one-clarifier-per-turn, no cross-pack state, Opus-gated-on-premium). Mastra owns the runtime; we own the contract.

### Why not LangGraph.js or Vercel Workflow or Inngest AgentKit

All three are production-proven TS options. Rejected for our case because:

- **LangGraph.js** — excellent graph primitives, but its StateGraph model + LangChain ecosystem is heavier than what we need, and it competes with the Claude Agent SDK as the agentic harness. Two agentic runtimes in one stack is a maintenance tax.
- **Vercel AI SDK v6 + Vercel Workflow (DurableAgent)** — strong durable-execution story, but the agent primitives are lower-level than full Flow graphs; we'd still need a higher layer to express pack-level Flows. Reconsider if Mastra's durability story proves inadequate and we already run heavy Vercel infra.
- **Inngest AgentKit** — best durable-execution primitives in TS, but Inngest is a workflow orchestration platform requiring their infra or self-hosting. Duplicates what Convex scheduled functions already give us.

### Why not DSPy

DSPy is optimizer-first — it wants to tune flow topology from data. Opposite of our safety requirement (flows must be hand-authored and audit-stable).

### Why the four tiers, not three or five

Three tiers (fast / deep / scheduled) misses the critic gate as a first-class concern — clinical safety can't be an afterthought. Five tiers (adding a "mid" tier for medium-effort work) didn't carry its weight in modeling; medium-effort work fits cleanly inside Deep Path with a budget cap.

### Why the 80% → 20% split

Anthropic reports multi-agent systems consume ~15× the tokens of chat. For a freemium consumer app that's prohibitive if applied uniformly. The Fast Path carries the 80% of messages that need acknowledgment and logging, not reasoning. The Deep Path is reserved for the 20% where the 15× token spend is justified. This is the economic hinge of the whole architecture.

### Alternatives rejected

- **Single-tier orchestrator.** Uniform cost, missing the 80% efficiency.
- **Full blackboard architecture.** Elegant, +13–57% on data-discovery benchmarks, lower tokens. Premature for a chat app where the orchestrator knows what it spawned. Revisit if L4-style long-horizon jobs grow complex.
- **LATS / MCTS-style tree search.** Strong on benchmarks (92.7% HumanEval), lethal on token budget for consumer chat. Not excluded for L4 offline reasoning — revisit for `weekly-insight-flow` if depth becomes a bottleneck.
- **Reflexion-with-memory per turn.** Over-engineering for per-message. Reserved for T4 offline runs.
- **Multi-agent debate.** Reserved for narrow escalation decisions ("should we recommend vet visit?") — not a general pattern.

## Consequences

### Positive

- Same execution substrate serves pet-health today and future packs tomorrow — the layering rule holds at the loop level, not just the code level.
- Cost discipline is built-in, not a code-review norm. A T1-bound Flow cannot call Opus.
- Clinical safety is enforced by invariant, not by convention. Every user-facing string passes T3.
- Flow Catalog is diffable and reviewable; `flow-catalog-reviewer` gates additions.
- Observability is per-flow, per-node — Braintrust evals map cleanly to flow + node names.

### Negative / risks

- Flow sprawl is the failure mode. Eighty loosely-specified flows is worse than twenty tight ones. `flow-catalog-reviewer` exists to prevent this.
- Situation Classifier is itself an LLM call on every message. Adds latency and cost, even if small. Mitigation: deterministic fast-path on keyword triggers skips the LLM for red-flag and other known cases.
- Hand-authored flows have authoring cost. We accept this as the price of safety and determinism; revisit when we have 20+ flows and auto-synthesis research has matured.
- **Mastra vendor risk.** Mastra is TS-first, Apache-2.0 core, Y Combinator-backed, $22M Series A in April 2026 led by Spark Capital (total raised $35M), 23k GitHub stars, 220k+ weekly npm downloads, production at Replit/PayPal/Adobe/Docker/SoftBank/Marsh McLennan. v1.0 stable since January 2026. The team's Gatsby lineage is a double-edged reference — strong JS-framework chops, but Gatsby itself ended in Netlify acquisition and maintenance mode. **Mitigation:** Flow DSL is a thin typed wrapper over Mastra workflows, not direct Mastra API usage scattered through the code. If Mastra stalls, the runtime is swappable — LangGraph.js is the most likely migration target — while pack-level Flow definitions remain unchanged. Re-evaluate at ~12-month cadence.
- Mastra's enterprise features (RBAC, SSO, ACL) are commercially licensed. Core runtime is open source and is all we need for the Flow abstraction. Commercial license only relevant if we later adopt their enterprise tier, which is not the current plan.

## Follow-ups

- ADR-004 (future): Braintrust eval structure for Flow Catalog — how golden prompts map to flows and nodes.
- ADR-005 (future): Flow migration strategy — how in-flight runs survive Flow version bumps.
- ADR-006 (future): When to revisit auto-generation (MetaAgent / FlowReasoner). Trigger: catalog exceeds ~30 flows or flow authoring becomes a bottleneck.
