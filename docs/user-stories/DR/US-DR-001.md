# US-DR-001 — Log a meal in the daily record

```yaml
id: US-DR-001
title: Log a meal in the daily record
cluster: Daily Record
trigger_type: user-reported
emotional_load: low
actors: [owner]

story: |
  When I've just fed my dog,
  I want to record what he ate without breaking stride,
  So the feeding log stays complete and the vet sees the meal pattern
  at a glance.

acceptance_criteria:
  - [ ] Owner can log a meal from the chat in natural language
        (e.g. "ração agora", "meia xícara de frango cozido")
  - [ ] The log completes in ≤ 2 interactions (type + send, or one
        proactive nudge reply) — no form, no required fields
  - [ ] The system captures at least: time, food (free text), quantity
        (free text). Any of the three can be inferred as "not stated."
  - [ ] The logged meal renders in the chat as a distinct meal card
        separate from the user's original text
  - [ ] The same meal appears in the diary timeline without a second
        action from the owner
  - [ ] If the owner's message is ambiguous ("já comeu"), the AI asks
        one clarifying question before logging
  - [ ] Works offline — the meal is queued and syncs when connection
        returns
  - [ ] PT-BR copy on the card, the diary entry, and any AI clarification

notes: |
  This is the foundational happy-path meal log. Refused meals are
  US-DR-002 (separate story — different trigger, different emotional
  load, different downstream insights).

  Per ADR-004, a successful log emits a `MealLogged` Domain Event
  with PII class `health`. The pet-health pack's meal card renders the
  structured payload in the chat; the same event drives the diary's
  meal timeline entry.

  Per WR5, this story stays UI-free. The visual + interaction shape
  for the meal card goes in the flow spec at
  `docs/user-stories/flows/US-DR-001.md` at implementation time (WR9).

  Per R8, the meal card's payload fields are tagged `health` so log
  redactors in Sentry + observability dashboards strip them before
  emit.

related: [US-DR-002, US-IA-001, US-SV-005]
```
