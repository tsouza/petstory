# Architecture

Canonical architectural rules for petstory.co. Non-negotiable.

## Documents

- [layers.md](layers.md) — the four-layer kernel / primitives / Domain Pack / shell model. The core architectural rule that petstory is the first vertical on a brand-neutral kernel.
- [flow-catalog.md](flow-catalog.md) — the three-level agent framework: universal Execution Spine + per-pack Flow Catalog + per-pack Situation Classifier. Defines the Flow DSL.

## Decision records

- [ADR-002 — Layered architecture](../decisions/ADR-002-layered-architecture.md)
- [ADR-003 — Three-level agent framework](../decisions/ADR-003-three-level-agent-framework.md)

## Enforcement

- `architecture-guardian` sub-agent — flags cross-layer leaks.
- `flow-catalog-reviewer` sub-agent — reviews any proposed new Flow before registration.
