---
name: data-humanism-viz
description: Guided workflow to design a new data visualization for PetStory that follows Data Humanism (4 pillars + 10 rules) and the project's viz simplicity constraints. Use when the user asks to create or redesign a visualization for pet data.
---

# data-humanism-viz

Design visualizations that feel warm, personal, and story-like — not clinical. Max 1+1 dimensions.

## Prerequisites

Read before designing:

- [docs/data-humanism.md](../../../docs/data-humanism.md)
- [docs/viz-rules.md](../../../docs/viz-rules.md)
- [docs/ux-concept.md](../../../docs/ux-concept.md)

## Step 1 — Start with the story, not the data shape

Ask (or derive from the request):

1. What is the one thing the tutor should feel / understand about their pet?
2. What small moment from the pet's life is being surfaced?
3. Is this Layer 1 (chat/summary), Layer 2 (diary detail), or Layer 3 (vet export)?

If the answer is "show them the aggregate," go back. Data Humanism DH8: small > big.

## Step 2 — Write the insight as a sentence (DH1, DH7)

Draft the plain-language sentence FIRST. It IS the insight. Example:

- ✅ "O Brutus comeu bem 5 de 7 dias."
- ✅ "Coceira na orelha 3× em 14 dias — sempre após passeio no parque."
- ❌ "Alimentação semanal" (label, not insight)

If you can't write a sentence that feels warm and specific, the viz probably shouldn't exist yet.

## Step 3 — Pick a pattern from the approved list

Match the story to:

| Story shape | Pattern |
|---|---|
| Consistency over days | Streak de Bem-Estar (colored dot calendar) |
| Single event + context | Micro-História (story card) |
| Life phase | Marcos da Vida (milestone path) |
| Emotional trajectory | Mood Garden (plants) |
| Medication adherence | Adesão (dose dots) |
| Daily summary | Pulso Diário (emoji + chips) |
| Trend inline | Trend arrow (↑↓→) or word, NOT a sparkline |

If none fit, invent a pattern that still respects the dimension rule (≤ 1+1) and DH3 (color-codes feelings, not magnitudes).

## Step 4 — Check dimension count

Count the distinct pieces of information in the viz. Must be **≤ 2** (1 primary + 1 secondary). If 3+, cut.

## Step 5 — Show gaps honestly (DH4)

If the underlying data has missing days, represent them with `?` + dashed border + warm note ("tudo bem, acontece!"). Do NOT smooth.

## Step 6 — Color = feeling, not magnitude (DH3)

Map palette semantically:

- `teal-400 #2EC4B6` — "tudo bem"
- `gold #F2C94C` — "atenção"
- `danger #E76F51` — "vale investigar"

No gradients, no continuous color scales on magnitude.

## Step 7 — Write the AI framing (DH9, DH10)

Any AI-generated text around the viz must:

- Hedge ("pode indicar", "talvez", "às vezes")
- Use the pet's name
- Use "você e o [pet]" (not "o usuário")
- Never diagnose

## Step 8 — Verify

1. 2-second test — can a non-technical pet owner understand it?
2. Run `use viz-judge on <file>`.
3. Run `use brand-guardian on <file>`.

Ship only after both pass.

## Common failure modes to avoid

- Reaching for a chart library because "it's easy"
- Smoothing gaps to make the viz "look clean"
- Using color to encode magnitude (kills DH3)
- Writing the chart title as a label instead of the insight
- Inventing a health score number that hides real texture
