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

Full rules in [`../user-story-guidelines.md`](../user-story-guidelines.md). Prefixed `WR` (Writing Rule) to stay distinct from Engineering Rules (R1–R19 in [engineering-rules.md](engineering-rules.md)) and Data Humanism rules (DH1–DH10 in [data-humanism.md](data-humanism.md)). TL;DR:

- **WR1** — Real situation, not a feature in disguise.
- **WR2** — Include emotional context when relevant.
- **WR3** — One motivation per story (no "and").
- **WR4** — Outcome must be measurable/observable.
- **WR5** — Don't prescribe UI in the story.
- **WR6** — Include multi-actor context when applicable.
- **WR7** — Name the anxiety when it exists.
- **WR8** — Different contexts → separate stories.

## Enforcement

- Sub-agent `user-story-author` ([.claude/agents/user-story-author.md](../.claude/agents/user-story-author.md)) writes new stories in the correct format.
- Slash command `/new-us` scaffolds a new US-*.md file.
- Skill `.claude/skills/new-user-story/SKILL.md` is the step-by-step workflow.

## Kernel vs. pack categorization

Per [ADR-002](decisions/ADR-002-layered-architecture.md), petstory is the first vertical on a brand-neutral kernel. User stories should be mentally tagged at one of three levels:

- **Kernel primitive (L0/L1)** — describes interaction shape that applies to any future vertical (chat-first logging, diary as narrative, shared access, export/vault, proactive nudges as a class). Examples likely sit in onboarding (OB), chat (CH), diary (DI), temporary access (TA), export (EX).
- **Pack-specific (L2)** — describes something only the pet-health vertical cares about (symptom triage, vet export structure, medication adherence loops, species-specific nudges). Examples likely sit in symptom (SP), vet (VET), medication (MED), pet-profile (PT).
- **Shell-specific (L3)** — describes UI affordances unique to the petstory app (brand surfaces, specific screens). Usually emerges during handoff, not at story-writing time.

The tagging is a thinking aid, not a rename. It informs which packages the story gets implemented in when the monorepo lands, and it surfaces early which stories are reusable across future domains.

## Known gap

User stories deliberately don't include interaction flows or screen maps (per WR5). That leaves a gap between US and code. See [open-questions.md](open-questions.md).
