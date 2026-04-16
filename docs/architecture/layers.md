# Layered architecture

Non-negotiable. Established 2026-04-16 as the core architectural rule for petstory.co. See [../decisions/ADR-002-layered-architecture.md](../decisions/ADR-002-layered-architecture.md) for the decision record.

## The thesis

petstory.co is the first vertical built on a brand-neutral agent kernel. The name `petstory` labels the Product Shell and the Domain Pack — never the kernel. A future `humanhealth`, `tripstory`, or any new vertical is another Domain Pack on the same kernel, swapped at the pack boundary. This is a design constraint applied from day one, not a refactor target.

## The four layers

| Layer | Scope | Examples | Knows about pets? |
|---|---|---|---|
| L0 — Agent Kernel | Domain-agnostic runtime | Agent SDK harness wrapper, model router, prompt-cache manager, auth port, storage port, channel ports, observability ports, hook bus, Flow runtime, critic harness | No |
| L1 — Conversation & Narrative Primitives | Domain-agnostic interaction shape | Chat-first loop, event extraction parameterized over a `DomainSchema`, auto-generated diary, proactive nudge scheduler, shared-access primitive, export/vault primitive | No |
| L2 — Domain Pack | Vertical-specific, pluggable (a Bounded Context in DDD terms) | Event schema, curated KB, domain Skills, domain MCP tools, critic rules, Flow Catalog, Situation Classifier, copy bundle, Ubiquitous Language glossary | Yes |
| L3 — Product Shell | Vertical-specific UI + brand | Brand tokens, screens, flows, product copy, pricing | Yes |

L0 and L1 together are the **kernel** — brand-neutral, reusable across domains. L2 and L3 together are **the vertical** — petstory today, potentially many more tomorrow.

## The dependency rule

Dependencies flow strictly inward: `L3 → L2 → L1 → L0`. No package at L0 or L1 imports from L2 or L3. Enforced in CI via import-boundary linting once the monorepo lands. Violations block merge.

Practically this means:

- No `Pet`, `veterinário`, `Brutus`, or clinical term appears in L0 or L1 source.
- No PT-BR string appears in L0 or L1 source. Copy is pack-owned (L2) or shell-owned (L3).
- No hard-coded "consulte o veterinário" escalation in the kernel critic harness — the pet-health pack registers that rule as a hook.
- External services (Anthropic API, Convex, Clerk, Stripe, PostHog) are only touched through L0 ports. L1, L2, L3 depend on the port interface, never on the vendor SDK.

## Domain Pack contract

A Domain Pack must export these nine artifacts. The kernel validates the contract at boot.

1. **Event schema** — the `DomainSchema` the kernel's event extractor is parameterized over. Event types are **Domain Events** in DDD terms (e.g. `MealRefused`, `SymptomObserved`, `MedicationAdministered` for pet-health). The timeline IS the event log; diary and correlations are read projections over this stream. See [ADR-004](../decisions/ADR-004-ddd-strategic-adoption.md).
2. **Knowledge base** — curated structured data queryable via an MCP tool.
3. **Skills** — markdown prompt assets for pack-specific workflows (`triagem-sintomas`, `correlacao-comportamento`).
4. **MCP tools** — the domain API surface (`record_meal`, `flag_clinical_anomaly`, `query_medical_kb`).
5. **Critic rules** — hooks registered into the kernel's critic harness (no-dosage, red-flag-escalation, tone enforcement).
6. **Flow Catalog** — named Flow definitions. See [flow-catalog.md](flow-catalog.md).
7. **Situation Classifier** — rules and prompts that pick which Flow runs per message.
8. **Copy bundle** — PT-BR (and later EN) user-facing strings keyed by flow + node.
9. **Ubiquitous Language glossary** — `glossary.md` mapping each domain term to: EN technical name, PT-BR user-facing name, PT-BR clinical/domain-specific name, and a one-line definition. The canonical vocabulary for this Bounded Context. Stale glossary is worse than no glossary — updates are required whenever the event schema, MCP tool names, or copy bundle gain or rename a concept.

A pack with any artifact missing is refused at startup.

## DDD mapping (reference)

For readers coming from the DDD literature, the layer model maps as follows (see [ADR-004](../decisions/ADR-004-ddd-strategic-adoption.md) for the full reasoning):

| DDD concept | This project |
|---|---|
| Bounded Context | Domain Pack (L2) |
| Generic Subdomain | Agent Kernel (L0) + Narrative Primitives (L1) |
| Core Subdomain | Domain Pack (L2) |
| Supporting Subdomain | Pack-internal modules that serve the core |
| Anti-Corruption Layer | L0 ports (auth, storage, channel, LLM adapters) |
| Ubiquitous Language | `glossary.md` per pack (artifact 9 above) |
| Domain Event | Event types in the pack's event schema (artifact 1) |
| Context Map | The Domain Pack contract itself + inter-pack mapping (authored when ≥ 2 packs exist) |

We explicitly reject tactical DDD patterns (aggregates, repositories, domain-service DI classes, factories) — see ADR-004 for reasoning.

## Naming rule

Generic packages have generic names. `conversation`, `diary`, `nudges`, `kernel` — never `pet-conversation` or `petstory-kernel`. Domain Packs are named after the vertical: `pet-health`, `human-health`, `tripstory-trips`.

The kernel's public name is open — see [open-questions.md Q2](../open-questions.md) (what should the kernel be called publicly).

## Reference repo layout (target)

Not built yet. When the monorepo lands (pnpm + Turborepo per 2026 consensus):

```
apps/
  petstory-mobile/           # L3
  petstory-web/              # L3
packages/
  kernel/                    # L0 — agent runtime, ports, flow engine
  conversation/              # L1
  diary/                     # L1
  nudges/                    # L1
  shared-access/             # L1
  packs/
    pet-health/              # L2
  ui/                        # L3 primitives (brand-aware, vertical-swappable)
```

## Anti-patterns that block merge

A proposal violates this architecture if any hold:

- A kernel file references a pet, a symptom name, or any clinical concept.
- A pack-level file bypasses the kernel and talks directly to Anthropic, Convex, Clerk, or Stripe.
- A Flow defined in a pack reaches into another pack's state.
- A PT-BR string appears in a kernel or primitive package.
- An L1 package imports from an L2 pack to "get a pet field."
- A critic rule is hard-coded in the kernel instead of registered by a pack.
- A new vendor SDK is imported outside L0.

## Enforcement

Sub-agent `architecture-guardian` flags any proposal that leaks L2/L3 concerns into L0/L1. Invoke with `use architecture-guardian` on any new code, schema, or design doc before committing.
