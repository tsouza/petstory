# User stories

## Where they live

- Index: [`../user-stories/INDEX.md`](../user-stories/INDEX.md)
- Template / writing guidelines: [`../user-story-guidelines.md`](../user-story-guidelines.md)
- Individual files: `../user-stories/US-{CAT}-{NNN}.md` (one per category cluster)

## Current state

**123 stories across 16 categories.** See INDEX for full list with counts by trigger type and emotional load.

## Format

We use **Job Stories (JTBD)** with hybrid acceptance criteria.

```
When [situation/trigger],
I want to [motivation/action],
So I can [expected outcome].
```

Acceptance criteria format: **Checklist by default**, **Given-When-Then for conditional/stateful logic.**

## The writing rules (summary)

Full rules in [`../user-story-guidelines.md`](../user-story-guidelines.md). TL;DR:

- **R1** — Real situation, not a feature in disguise.
- **R2** — Include emotional context when relevant.
- **R3** — One motivation per story (no "and").
- **R4** — Outcome must be measurable/observable.
- **R5** — Don't prescribe UI in the story.
- **R6** — Include multi-actor context when applicable.
- **R7** — Name the anxiety when it exists.
- **R8** — Different contexts → separate stories.

## Enforcement

- Sub-agent `user-story-author` ([.claude/agents/user-story-author.md](../.claude/agents/user-story-author.md)) writes new stories in the correct format.
- Slash command `/new-us` scaffolds a new US-*.md file.
- Skill `.claude/skills/new-user-story/SKILL.md` is the step-by-step workflow.

## Known gap

User stories deliberately don't include interaction flows or screen maps (per R5). That leaves a gap between US and code. See [open-questions.md](open-questions.md).
