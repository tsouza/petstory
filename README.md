# petstory.co — Claude Code scaffold

Staging folder. Contents here are meant to be moved into the repo root once reviewed:

```
claude-scaffold/CLAUDE.md      →  <repo>/CLAUDE.md
claude-scaffold/.claude/       →  <repo>/.claude/
claude-scaffold/.mcp.json      →  <repo>/.mcp.json
claude-scaffold/docs/          →  <repo>/docs/
```

## What this is

All the project knowledge that used to live in Cowork memory + our conversations, migrated into files Claude Code can load automatically. A fresh Claude Code session in the repo root will pick up `CLAUDE.md`, which indexes everything else.

## Layout

- `CLAUDE.md` — always-loaded root index. Keep short.
- `docs/` — canonical project knowledge (vision, stack, brand, UX concept, viz rules, data humanism, user stories, market, ADRs, open questions).
- `.claude/agents/` — sub-agents that enforce project rules when invoked.
- `.claude/skills/` — reusable workflows (SKILL.md per folder).
- `.claude/commands/` — slash commands (`/review-viz`, `/new-us`, `/handoff`).
- `.claude/CONVENTIONS.md` — how Thiago likes to collaborate (ways of working).
- `.claude/settings.json` — tool permissions + project-scoped settings.
- `.mcp.json` — MCP servers contributors should install (Expo, Convex when scaffolded).

## After moving into the repo

1. Open the repo in Claude Code.
2. Run `/review-viz some-file.jsx` to validate a visualization proposal.
3. Run `/new-us` to scaffold a user story in the correct format.
4. Use sub-agents explicitly: `use brand-guardian`, `use clinical-safety-reviewer`.

## Memory migration

After this scaffold is merged, the following Cowork memory entries should be deleted (their content now lives in `docs/`):

- `project_brand_guidelines.md` → `docs/brand.md`
- `project_data_humanism_rules.md` → `docs/data-humanism.md`
- `project_ux_concept.md` → `docs/ux-concept.md`
- `project_dataviz_lay_users.md` → merged into `docs/viz-rules.md`
- `feedback_viz_simplicity.md` → merged into `docs/viz-rules.md`
- `project_pending_interaction_specs.md` → `docs/open-questions.md`

Memory entries to keep (they describe *how to collaborate*, not project truth):

- `feedback_literal_scope.md` — still valuable across all projects
- `feedback_visual_iteration.md` — still valuable across all projects

Those also get mirrored into `.claude/CONVENTIONS.md` so Claude Code picks them up inside this repo.
