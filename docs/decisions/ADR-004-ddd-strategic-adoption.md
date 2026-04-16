# ADR-004 — Domain-Driven Design: adopt strategic, reject tactical

**Status:** Accepted
**Date:** 2026-04-16
**Deciders:** Thiago
**Supersedes:** —
**Depends on:** [ADR-002](ADR-002-layered-architecture.md), [ADR-003](ADR-003-three-level-agent-framework.md)

## Context

ADR-002 established a layered architecture. ADR-003 established the agent framework. Both drew on Domain-Driven Design influences without naming DDD explicitly. This ADR makes the influence explicit, names the concepts we adopt, and — equally important — names the DDD patterns we deliberately reject to prevent drift.

Relevant DDD dimensions:

- **Strategic DDD** — Bounded Contexts, Subdomains (Core/Supporting/Generic), Ubiquitous Language, Context Mapping, Anti-Corruption Layer. About boundaries, language, and relationships.
- **Tactical DDD** — Aggregates, Entities, Value Objects, Repositories, Domain Services, Factories. About code-level patterns, historically OO-heavy.

The honest assessment: ADR-002's four-layer model already maps to strategic DDD concepts under different names. Our Domain Pack ≈ Bounded Context. L0 ports ≈ Anti-Corruption Layer. L0+L1 ≈ Generic Subdomain. L2 ≈ Core Subdomain. The Domain Pack contract (eight exports) is a Context Map in all but name. Strategic DDD is where the payoff is; tactical DDD's OO patterns fight our TS + Convex + Zod + Mastra stack.

## Decision

**Adopt strategically:**

1. **Bounded Context** — name the concept explicitly. Each Domain Pack is a Bounded Context. Terminology added to [layers.md](../architecture/layers.md).
2. **Ubiquitous Language** — every Domain Pack exports a `glossary.md` mapping each domain term to its EN technical name, PT-BR user-facing name, PT-BR clinical/domain-specific name, and a one-line definition. Becomes the ninth artifact in the Domain Pack contract.
3. **Domain Event** — promote events to a first-class primitive in the pack's event schema. The chat extracts Domain Events (`MealRefused`, `SymptomObserved`); the timeline is the event log; diary and correlations are read projections over the same stream. CQRS-style separation of write model (events) and read models (projections) aligns cleanly with Convex's reactive queries.
4. **Anti-Corruption Layer** — already implemented as L0 ports; adopt the ACL name in docs for industry alignment.
5. **Context Map** — when ≥ 2 packs exist, author a Context Map doc describing how packs relate. Not required for a single-pack repo.

**Reject:**

- **Tactical aggregate / entity / value-object class hierarchies.** TS + functional-ish + Convex documents + Zod schemas already express these invariants more cheaply.
- **Repository pattern** over Convex. Convex IS the persistence layer and provides reactive typed queries; layering repositories duplicates what we have.
- **Domain Services as DI-registered classes.** Mastra workflow nodes + kernel ports + pack-registered hooks cover this without a DI container.
- **Pure event sourcing with replay.** Convex mutations are idempotent and reactive; treat Domain Events as the logical write model without committing to replay infrastructure. Revisit if audit-trail compliance becomes a hard requirement.
- **The full DDD vocabulary as cargo-cult.** "Aggregate root," "value object," "factory" do not appear in our codebase — these terms slow readers without adding clarity in our idiom.

## Rationale

### Why Ubiquitous Language is load-bearing

Three languages cross every domain surface: EN in code, PT-BR in user-facing copy, clinical/domain-specific terminology. Without a canonical glossary per pack, drift is guaranteed — a `symptom` field in Convex, `sintoma` in UI, `manifestação clínica` in vet export, and suddenly the schema field doesn't mean what the copy thinks it means. `glossary.md` is cheap to author and directly serves:

- R9 (i18n) — the translation keys' intent.
- `clinical-safety-reviewer` — the canonical hedging vocabulary.
- Situation Classifier keyword triggers — aligned with actual domain terms.
- Brand consistency — PR reviews catch term drift early.

### Why Domain Events as first-class

The chat-first + auto-extraction + timeline + diary + correlations pipeline is already event-driven. Making it explicit:

- Flow nodes produce typed events instead of opaque mutations — clearer semantics.
- Timeline is a projection of the event log; diary is another; cross-correlation is a third. One write model, many read models.
- Event types can graduate from pack-specific (`MealRefused` in pet-health) to kernel-generic (`PeriodicCheckpointDue` in L1) under R18's rule of three.
- Ties naturally to Braintrust evals — the golden path of a Flow is "these events get produced in this order."

### Why reject tactical DDD

- **Convex duplication.** Repositories, unit-of-work, identity maps — Convex provides these reactively. Layering them on top is pure overhead.
- **TS/functional grain.** Zod schemas + structural types + immutable records express value-object and entity invariants more cheaply than OO class hierarchies.
- **Mastra/Flow coverage.** Workflow nodes + kernel ports + pack-registered hooks already cover domain-service responsibilities without a DI container.
- **Startup cost.** Tactical DDD takes months to get right and years to stop fighting. Strategic DDD pays off in a weekend of doc work.

### Alternatives rejected

- **Full DDD adoption (strategic + tactical).** Too heavy for our stack and team size.
- **No explicit DDD reference.** Influence was already there; making it implicit invites drift. "Accidentally DDD-shaped" is worse than "adopted the useful parts intentionally."
- **Functional DDD vocabulary (Wlaschin-style "workflow / state / choice").** Duplicates Mastra's vocabulary. Skip.

## Consequences

### Positive

- Pack-level Ubiquitous Language catches EN/PT-BR/clinical drift early; gives clinical-safety-reviewer and Situation Classifier a canonical reference.
- Domain Events as a first-class primitive makes the Flow DSL semantics cleaner and enables CQRS read projections without a rewrite.
- Strategic DDD terminology in docs helps future contributors (and AI agents) map our vocabulary to the broader industry.
- ACL and Bounded Context names clarify existing patterns with zero code change.

### Negative / risks

- **Glossary upkeep.** A pack's glossary must stay current as schemas evolve. Stale glossary is worse than no glossary. Mitigation: `architecture-guardian` flags pack PRs that change the event schema without touching `glossary.md`.
- **Vocabulary creep.** Three DDD terms (Bounded Context, Ubiquitous Language, Domain Event) expand the terminology surface. Mitigated by the explicit rejection list above — future contributors see "no aggregate, no repository, no tactical DDD" in writing.
- **Confusion with Mastra runtime events.** "Domain Event" (pack-level schema primitive) vs. Mastra workflow events (runtime signals). Docs scope the term clearly: Domain Events live in the pack's event schema; Mastra events stay Mastra's internal concept.

### Cross-cutting consequences

- **Security.** Ubiquitous Language glossary doubles as a PII-classification lens — every term's definition can mark whether it contains sensitive data (pet name = low, vet history = health PII). Domain Events become the canonical audit trail: if "who changed what, when" ever becomes a compliance requirement, the event stream IS the answer.
- **Observability.** Domain Events give Braintrust and PostHog a stable event taxonomy independent of Flow/node names — evals and analytics survive Flow refactors. Glossary terms become the canonical vocabulary for dashboards and alert names.

## Follow-ups

Future ADRs (numbers assigned when the work begins):

- Context Map document — when a second Domain Pack is roadmapped.
- Event catalog per pack — once a pack has ≥10 Domain Event types, document them collectively.
- Stronger event-sourcing posture — revisit if audit-trail compliance becomes a hard requirement.
