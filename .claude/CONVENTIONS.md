# How to collaborate on this project

Project-level conventions distilled from direct feedback. These apply to every tool call, edit, and response.

## Respect literal scope

When the user specifies a scope in singular or with a qualifier ("the pad", "just the header", "apenas X"), act on exactly that element — never extend the operation to sibling elements even if they look structurally similar.

**Why:** on 2026-04-05, a request to replace "o pad central" (palm pad) of a paw SVG was over-interpreted and all 5 pads were modified. The correction: "mas que bagunça é essa? eu não era para mexer nos dedos, apenas no pad central."

**How to apply:** before acting on a scoped instruction, restate the scope literally and confirm it matches exactly one element. If the user says "the X," default to the narrowest reasonable interpretation. When in doubt between narrow and broad scope, *ask*, don't assume broad.

## Trust hand-crafted references over algorithms

During iterative visual work, if Thiago provides a hand-crafted mockup (SVG, JSX, manual coordinates), extract his exact values and use them verbatim. Do NOT try to reverse-engineer an algorithm to approximate his intent.

**Why:** on 2026-04-05, during paw logo iteration, three rounds of random-circle-packing parameter tuning missed the target. The right move once the hand-crafted SVG arrived was to adopt his coordinates directly.

**How to apply:** for visual work with a small number of elements (~<20), position matters more than algorithm. If a reference mockup shows up mid-iteration, parse it, extract the literal values, use them. Fall back to algorithmic generation only for high counts or when he explicitly asks for procedural.

## Prose > bullets

Avoid bulleted walls. Lists only when the content is genuinely list-shaped (tokens, menu options, discrete rules). Narrative prose for explanations, rationale, summaries.

## Language

- Code: English
- Internal docs: English (this file, docs/, ADRs, agent definitions)
- Product copy and UX text: PT-BR
- User-facing AI responses in the app: PT-BR

PT/EN code-mixing in conversation is fine.

## Avoid certain words

Don't use "genuinely," "honestly," or "straightforward" in explanations or product copy.

## Verification step

For any non-trivial task, end with a verification pass. Read back the diff, run the tests, take a screenshot, or spawn a sub-agent to review. Cowork's TodoList makes this explicit — use it.

## Tone in product copy

See [docs/data-humanism.md](../docs/data-humanism.md) DH10 — conversational, warm, about the pet. Never clinical. Use "você e o Brutus," never "o usuário."

## On disagreement

Push back when the choice is wrong. Constructive pushback > submissive agreement. Senior engineer; wants honest review, not validation theater.

## Status updates via ntfy.sh

Keep Thiago posted on project events via **[`ntfy.sh/petstory-dev`](https://ntfy.sh/petstory-dev)**. This is a one-way push channel — Claude posts, Thiago reads when convenient.

**Post on:**

- A commit lands on `main` (hash + one-line summary).
- A multi-step task completes (audit pass, ADR lands, seeding phase done, etc.).
- A blocker surfaces or a decision is needed — use `Priority: high` so it notifies immediately.
- A milestone hits (first package green in CI, first Flow passing evals, etc.).

**Don't post on:**

- Every tool call, every file edit, or mid-task intermediate state.
- Research-phase findings — those are part of the conversation, not the status stream.
- Anything involving secrets, raw user data, or internal credentials (R8 applies — ntfy topics are public to anyone who subscribes).

**How (manual posting for now):**

```bash
curl -s \
  -H "Title: <one-line title>" \
  -H "Tags: <emoji-tag>" \
  -H "Priority: default|high" \
  -d "<body>" \
  https://ntfy.sh/petstory-dev
```

Tags follow ntfy's emoji-shortcode vocabulary (`white_check_mark` for done, `rocket` for ship, `warning` for blocker, `hammer_and_wrench` for in-progress, `loudspeaker` for decision needed).

**Reliable automation is a future upgrade.** When manual posting proves unreliable, a PostToolUse hook in `.claude/settings.json` can fire automatically on `git commit` Bash calls. Not set up now per R0 — start with the convention, automate when pain earns it.
