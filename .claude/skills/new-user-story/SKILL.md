---
name: new-user-story
description: Scaffold a new user story file (US-*.md) in petstory.co's Job Stories format with correct frontmatter, AC format, and INDEX update. Use when creating any new user story.
---

# new-user-story

Create a new user story without drift from the project's format.

## Prerequisites

- [guidelines.md](../../../docs/user-stories/guidelines.md)
- [docs/user-stories/INDEX.md](../../../docs/user-stories/INDEX.md)
- [docs/user-stories.md](../../../docs/user-stories.md)

## Step-by-step

### 1. Gather

Ask the user (if unclear):

- Cluster / category (see INDEX table for codes: DR, AN, SP, SV, LP, IA, TA, MD, CV, MC, PM, MP, CE, SL, EG, OB)
- The situation / trigger (must be a real circumstance, not an in-app action)
- Motivation (single — no "and")
- Outcome (measurable / observable)
- Emotional load (low / medium / high)
- Trigger type (user-reported / co-owner-reported / system-detected / calendar / environmental / lifecycle / composite)
- Related stories (if known)

### 2. Pick the ID

Read `docs/user-stories/US-<CAT>.md` for that cluster. Find the next free NNN. Use format `US-<CAT>-<NNN>` zero-padded to 3 digits.

### 3. Draft the story

Use this template:

```yaml
id: US-{CAT}-{NNN}
title: <short descriptive title>
cluster: <category name>
trigger_type: <from list>
emotional_load: low | medium | high
actors: [<owner|co-owner|temp-guest|vet|system>]

story: |
  When <situation with context and emotion if relevant>,
  I want to <single motivation>,
  So I can <measurable outcome>.

acceptance_criteria:
  - [ ] <verifiable condition>
  - [ ] <at least one edge case>
  - [ ] <performance or accessibility if relevant>

notes: |
  <optional design/viz/data-humanism notes, related stories>

related: [<US-IDs>]
```

For stories with conditional logic or multi-path behavior, use Given-When-Then scenarios instead of / in addition to the checklist. See [guidelines.md](../../../docs/user-stories/guidelines.md) Format 2.

### 4. Self-review against WR1–WR8

- WR1 — Situation is real, not a feature
- WR2 — Emotional context included when relevant
- WR3 — Single motivation (no "and")
- WR4 — Measurable outcome
- WR5 — No UI prescription
- WR6 — Multi-actor context explicit
- WR7 — Anxiety named when present
- WR8 — Different contexts are different stories

### 5. INVEST+ quality gate

Check every box before appending:

- [ ] Independent
- [ ] Negotiable
- [ ] Valuable
- [ ] Estimable
- [ ] Small
- [ ] Testable
- [ ] Situational
- [ ] Emotionally calibrated

### 6. Write to the cluster file

Append to `docs/user-stories/US-<CAT>.md` following the file's existing structure. Preserve any front-matter of the cluster file.

### 7. Update INDEX

In `docs/user-stories/INDEX.md`:

- If this is the FIRST story in the cluster, convert the `File` column from the placeholder `` `US-<CAT>.md` `` (inline code) to a live link `[US-<CAT>.md](US-<CAT>.md)`
- Bump the count for the cluster
- Bump the `Total: 16 categories · NNN stories` line
- Update the "Last updated" date at the top

### 8. Verify

Run `use user-story-author on <new file>` for a second pass, OR report back to the user with the draft and ask them to confirm before you commit.
