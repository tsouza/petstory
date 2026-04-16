# PetStory — User Story Guidelines

> Format adopted: **Job Stories** (Intercom/JTBD) + hybrid **Acceptance Criteria**
> Last updated: 2026-04-16

Rules in this doc use the `WR` prefix (Writing Rule) to stay distinct from Engineering Rules (R1–R19 in [`docs/engineering-rules.md`](docs/engineering-rules.md)) and Data Humanism rules (DH1–DH10 in [`docs/data-humanism.md`](docs/data-humanism.md)). See [`docs/user-stories.md`](docs/user-stories.md) for the project-level summary.

---

## Why Job Stories instead of "As a user, I want…"

The classic format focuses on the persona ("as a pet owner"). The problem: personas are abstractions — we already know the owner is an owner. What we don't know is **what situation they're in and what motivated them to act**. Job Stories force that answer.

PetStory is an app driven by **everyday situations** — the owner doesn't wake up thinking "I want to log food"; they think "Brutus didn't eat again and I'm worried." The situational trigger is what matters for design.

---

## Anatomy of a Job Story

```
When [situation/trigger],
I want to [motivation/action],
So I can [expected outcome].
```

Each part serves a specific role:

**When** — describes the context and the trigger that creates the need. It's not a feature, it's a real circumstance. Should include emotion, urgency, or environmental context when relevant.

**I want to** — the desired motivation or action. Focuses on *what* the user wants to achieve, not *how* the system implements it. Never prescribe UI here.

**So I can** — the functional or emotional outcome. Answers "so what?" — why this matters for the owner's life or the pet's health.

---

## Writing Rules

### WR1 — Real situation, not a feature in disguise

The "When" clause describes something that happens in the owner's life, not an action inside the app.

```
❌ When I open the food logging screen,
   I want to enter the food type,
   So I can track my pet's diet.

✅ When my dog refuses breakfast for the second day in a row,
   I want to quickly record this pattern,
   So I can show the vet exactly when it started.
```

The bad version describes navigation; the good one describes a real concern.

### WR2 — Include emotional context when relevant

Pets involve emotion. If the situation carries emotional weight, include it. This guides design decisions (tone, urgency, simplicity).

```
✅ When my elderly cat has a seizure and I'm panicking,
   I want to record what happened with minimal steps,
   So I can give the emergency vet an accurate timeline.
```

### WR3 — One motivation per story

If the "I want to" contains "and", it's probably two stories.

```
❌ I want to log the meal and set a reminder for the next one.

✅ Story A: I want to log what he ate (or didn't).
✅ Story B: I want to be reminded when the next meal is due.
```

### WR4 — Measurable or observable outcome

The "So I can" must be verifiable. If it's too vague, it won't guide design.

```
❌ So I can be a better pet parent.
✅ So I can detect if the new food is causing digestive issues.
```

### WR5 — Don't prescribe UI in the story

The story describes the problem. The solution lives in design and implementation.

```
❌ I want to tap a button to add a photo.
✅ I want to capture what I'm seeing right now.
```

### WR6 — Include multi-actor context when applicable

If the story involves more than one person, make it explicit in the situation.

```
✅ When my partner already fed the dog but didn't tell me,
   I want to see if today's meals are logged,
   So I can avoid double-feeding.
```

### WR7 — Name the anxiety (when it exists)

Inspired by the Forces of Progress (JTBD): push, pull, anxiety, habit. If there's fear or hesitation, naming it helps design address the barrier.

```
✅ When my vet asks for my dog's medical history and I'm afraid
   I'll forget something important,
   I want to share a complete timeline instantly,
   So I can feel confident that nothing was left out.
```

### WR8 — Different contexts become separate stories

The same action in different contexts may require different UIs or flows.

```
Story A: When I'm home and notice my dog vomited,
         I want to record details calmly with photos and notes.

Story B: When I'm at work and the pet sitter tells me my dog vomited,
         I want to see what was recorded and ask follow-up questions.
```

---

## Acceptance Criteria

Each story has acceptance criteria that define "done." We use two formats depending on complexity:

### Format 1 — Checklist (default)

For most stories. Short, verifiable phrases written as conditions that are true when the story is complete.

```
Story: When my dog refuses breakfast for the second day in a row…

Acceptance Criteria:
- [ ] User can log a "refused meal" event in ≤ 2 taps
- [ ] Refused meals appear visually distinct from normal meals on the timeline
- [ ] If 2+ refused meals in 48h, system highlights the pattern
- [ ] Entry includes optional fields: which food was offered, pet's behavior
- [ ] Works offline and syncs when connection returns
```

Checklist rules:
- Each item is independent and testable
- No ambiguity ("fast" → "≤ 2 taps" or "< 3 seconds")
- Cover the happy path AND at least one edge case
- Include performance/accessibility criteria when relevant

### Format 2 — Given-When-Then (for complex behavior)

Use when the logic involves conditions, states, or multiple paths. Don't use for everything — reserve it for scenarios where behavioral clarity matters.

```
Story: When my partner already fed the dog but didn't tell me…

Scenario: Meal already logged by co-owner
  Given the dog "Brutus" has a meal logged today at 08:15 by "Ana"
  When I open the daily feed view
  Then I see a card showing "Ana fed Brutus at 08:15"
  And the "Log meal" button shows "Already fed today — log another?"

Scenario: No meals logged yet
  Given no meals are logged for "Brutus" today
  When I open the daily feed view
  Then I see an empty state with "Brutus hasn't eaten yet today"
  And the "Log meal" button is prominently displayed
```

### When to use each format

| Situation | Format |
|---|---|
| Simple story, linear path | Checklist |
| Conditional logic, multiple states | Given-When-Then |
| Business rule with edge cases | Given-When-Then |
| UI/performance requirements | Checklist |
| Story that will be automated in tests | Given-When-Then |

---

## Optional Fields

In addition to the story body and acceptance criteria, the following fields can be added when useful:

**Trigger type** — classifies the event origin:
- `user-reported` — owner logs manually
- `co-owner-reported` — another caretaker logs
- `system-detected` — AI or system detects a pattern
- `calendar` — scheduled event or reminder
- `environmental` — external factor (weather, travel, relocation)
- `lifecycle` — pet lifecycle milestone

**Emotional load** — `low` | `medium` | `high`
Guides decisions about tone, urgency, and flow complexity. A story about "pet having a seizure" (high) needs a radically simpler flow than "logging a walk" (low).

**Actors** — who is involved (owner, co-owner, temp-guest, vet, system)

**Related stories** — links to stories that interact or depend on each other

---

## Full Example

```yaml
id: US-IA-054
title: Food brand × vomiting correlation
cluster: AI & Insights
trigger_type: system-detected
emotional_load: medium
actors: [owner, system]

story: |
  When my dog has vomited three times in the week after I switched
  his food brand,
  I want the app to surface this correlation for me,
  So I can decide whether to revert to the old food before the
  next vet visit.

acceptance_criteria:
  - [ ] System detects co-occurrence of "food change" event + "vomit"
        events within a configurable window (default: 14 days)
  - [ ] Correlation is shown as a plain-language insight card, not a chart
  - [ ] Card includes: what changed, when, how many incidents since
  - [ ] User can dismiss the insight or mark it as "useful"
  - [ ] Insight links to the relevant timeline entries
  - [ ] System does not surface correlations with fewer than 2 incidents

notes: |
  Per viz guidelines: text-first, no charts. Use traffic-light color
  (gold = attention) for the insight card. Follows Data Humanism
  rule of making data feel personal and human.

related: [US-AN-011, US-AN-017, US-IA-045]
```

---

## Anti-patterns

**"Feature as situation"** — When I click the add button → this is UI, not a situation.

**"Generic so-that"** — So I can track things → track what? Why? The outcome must be concrete.

**"Epic story"** — If the story needs 15+ acceptance criteria, it's probably an epic in disguise. Break it down.

**"Acceptance criteria as design spec"** — "Button should be blue, 44px" is not AC. AC describes behavior, not visual implementation.

**"Given-When-Then for everything"** — GWT is powerful but verbose. Checklist is sufficient for 80% of stories. Reserve GWT for conditional logic.

**"Emotionless story in an emotional context"** — If the owner is panicking (emergency, loss of pet), the story needs to reflect that. The design will be different.

---

## Quality Checklist (INVEST+)

Before considering a story ready for refinement, verify:

- [ ] **Independent** — can be developed without depending on another story
- [ ] **Negotiable** — describes the problem, doesn't prescribe the solution
- [ ] **Valuable** — delivers clear value for the owner or for the pet's health
- [ ] **Estimable** — the team can estimate the effort
- [ ] **Small** — fits in a sprint (if not, break it down)
- [ ] **Testable** — acceptance criteria are verifiable
- [ ] **Situational** — the "When" describes a real circumstance, not a feature
- [ ] **Emotionally calibrated** — emotional load is consistent with the proposed flow

---

## References

- [Designing Features Using Job Stories — Intercom](https://www.intercom.com/blog/using-job-stories-design-features-ui-ux/)
- [Job Stories Revisited — JTBD Toolkit](https://jtbdtoolkit.medium.com/job-stories-revisited-13ad0b54eb3c)
- [Forces of Progress — JTBD.info](https://jtbd.info/may-the-forces-diagram-be-with-you-always-applying-jtbd-everywhere-b1b325b50df3)
- [Acceptance Criteria Best Practices — AltexSoft](https://www.altexsoft.com/blog/acceptance-criteria-purposes-formats-and-best-practices/)
- [Given-When-Then — Agile Alliance](https://agilealliance.org/glossary/given-when-then/)
- [Gherkin Acceptance Criteria Guide 2026 — TestQuality](https://testquality.com/gherkin-user-stories-acceptance-criteria-guide/)
