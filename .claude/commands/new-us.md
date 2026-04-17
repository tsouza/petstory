---
description: Scaffold a new user story (US-*.md) in the project's Job Stories format.
argument-hint: [cluster-code] [brief description]
---

Create a new user story using the `new-user-story` skill.

If `$ARGUMENTS` is empty, ask the user for:

1. Cluster code (DR, AN, SP, SV, LP, IA, TA, MD, CV, MC, PM, MP, CE, SL, EG, OB)
2. The situation (real circumstance, not an in-app action)
3. The motivation (single — no "and")
4. The outcome (measurable)

Then:

1. Read `.claude/skills/new-user-story/SKILL.md` and follow it step by step.
2. Draft the story.
3. Show the draft to the user and wait for approval before writing to `docs/user-stories/US-<CAT>.md` and updating `docs/user-stories/INDEX.md`.

Never skip the WR1–WR8 self-review or the INVEST+ gate.
