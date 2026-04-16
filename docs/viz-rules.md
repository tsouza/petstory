# Visualization rules

PetStory target: everyday pet owners, not data-literate users. Think Finch, Duolingo, Plant Nanny. NOT clinical dashboards.

## The dimension rule

**Max 1 primary + 1 secondary information per viz.** Never 3, 4, or 5 things at once.

## Approved patterns (validated)

- **Pulso Diário** — emoji + text + simple status chips
- **Streak de Bem-Estar** — colored dot calendar grid
- **Micro-Histórias** — timeline with story cards
- **Marcos da Vida** — path with milestone icons
- **Mood Garden** — plants as metaphor for daily mood/energy
- **Adesão** — dose dots with simple status
- **Mini-tendências inline** — simpler than sparklines. Use arrows (↑↓→) or words ("melhorando"), never line charts.

## Rejected patterns

- Line charts (too technical)
- Multi-variate displays (Retrato Semanal, Constelação, Bolhas de Preocupação)
- Anything with 3+ dimensions simultaneously
- SVG radial / network graphs
- Abstract data art

## What non-technical users actually prefer (research)

1. Simple prominent numbers (Fitbit: +30% engagement after simplifying to steps/calories/sleep)
2. Progress rings/bars (Apple Health gamified model)
3. Color coding (red/yellow/green — intuitive, no chart literacy needed)
4. Streaks (calendar grids, consistency)
5. Emoji/icon indicators (mood faces)
6. Plain-language summaries ("Brutus comeu bem 5 de 7 dias")

Bar charts are the most intuitive traditional chart, but even they require axis interpretation. Pie charts work for simple part-to-whole but fail for ranking.

## Two-second test

Before accepting a viz: *"Can a non-technical person understand this in 2 seconds?"*

If no → replace charts with **text + emoji + color**. Replace sparklines with trend arrows or words.

## Relationship to Data Humanism

This file is the *operational* companion to [data-humanism.md](data-humanism.md):

- R1 (text first) is enforced by the two-second test
- R6 (progressive disclosure) allows charts only in Layer 2/3
- R7 (no chart without a story) — every title must be the insight

## Enforcement

Sub-agent `viz-judge` ([.claude/agents/viz-judge.md](../.claude/agents/viz-judge.md)) applies these rules to any viz proposal. Slash command `/review-viz <file>` runs it over a specific file.
