# Data Humanism

Every screen, component, and AI response in PetStory follows these rules.

Based on Giorgia Lupi's *Data Humanism — a manifesto for a new data world* (giorgialupi.com/data-humanism-my-manifesto-for-a-new-data-wold) and its academic operationalization (Alhazwani et al., *Data Humanism Decoded*, IEEE VIS 2025, arxiv.org/abs/2509.00440).

## The 4 pillars

### 1. Embrace complexity

- Don't dumb data down into a single number when reality is richer.
- Layer information: a main narrative as entry point, secondary stories on deeper levels.
- Nonlinear storytelling — let users explore at their own pace.
- **Applied to PetStory:** the chat IS the complexity layer (rich, contextual, messy); the diary distills without oversimplifying.

### 2. Move beyond standards

- Never default to bar/pie/line charts because they're easy to code.
- "Blindly throwing technology at the problem" is the failure mode.
- Sketch the visual metaphor first, reach for the chart library last.
- **Applied to PetStory:** each data type deserves its own visual language (streaks for consistency, color dots for symptoms, simple counts for meals — not generic charts for everything).

### 3. Sneak context in (always)

- Numbers are placeholders for something else — always show what they represent.
- Context is as important as the data: when, why, what was happening around it.
- **Applied to PetStory:** never "3 episodes." Instead: "Coceira na orelha 3× em 14 dias — sempre após passeio no parque." The AI's job is to correlate and narrate, not count.

### 4. Remember that data is imperfect (as we are)

- Data-driven does not mean unmistakably true.
- Data is human-made; it reflects choices about what to measure.
- Embrace uncertainty, gaps, approximation — don't hide them.
- **Applied to PetStory:** if the tutor didn't log for 3 days, show the gap. "Não temos dados de Qua–Sex" > interpolation. Honesty builds trust.

## The 10 rules

These rules use the `DH` prefix to stay distinct from Engineering Rules (R1–R19 in [engineering-rules.md](engineering-rules.md)) and User Story writing rules (WR1–WR8 in [user-stories.md](user-stories.md)).

**DH1 — Text first, visuals second.**
Lead every data display with a plain-language sentence that IS the insight. "O Brutus comeu bem 5 de 7 dias." Then (if useful) the visual.

**DH2 — Data is about Brutus, not about numbers.**
Every metric must connect to the pet's story. Not "feeding: 85%" but "O Brutus tá comendo bem, só pulou o jantar de segunda."

**DH3 — Color-code feelings, not magnitudes.**
Use the palette semantically: `teal-400` = "tudo bem", `gold` = "atenção", `danger` = "vale investigar." Users read emotion from color without interpreting scales.

**DH4 — Show gaps honestly.**
Missing data is information. Blank days appear as "?" with dashed border + warm note ("tudo bem, acontece!"). No smoothing.

**DH5 — Context over counts.**
When the AI detects a pattern, it narrates the context: what else was happening, what might be related, what changed. Raw frequency alone is never enough.

**DH6 — Progressive disclosure, not progressive complexity.**
Layer 1: text + color + icons. Layer 2 (on tap): richer detail, mini-visualizations. Layer 3 (optional): full data, exportable to vet. Never force users past Layer 1.

**DH7 — No chart without a story.**
If we use a chart, the title IS the insight ("Brutus come menos nas segundas"), not a label ("Alimentação semanal"). The chart illustrates the story, not vice versa.

**DH8 — Small data > Big data.**
Individual moments matter more than aggregates. "Ontem o Brutus não quis brincar" is more valuable than "atividade média: 72%." Preserve the small, personal observations.

**DH9 — Invite interpretation, don't dictate.**
The AI suggests, doesn't diagnose. "Isso pode indicar…" not "Isso é…" Respect the tutor's knowledge of their own pet.

**DH10 — Make data feel warm.**
Conversational, never clinical. Use the pet's name. "Você e o Brutus" not "o usuário." Data should feel like a caring friend observing alongside you, not a medical report.

## Decision litmus test

When in doubt, ask: *"Would Giorgia Lupi show it this way, or would she tell a story instead?"*

## Enforcement

Sub-agent `viz-judge` applies DH1–DH10 to any visualization proposal. Sub-agent `clinical-safety-reviewer` applies DH9 (and medical guardrails) to any AI-generated user-facing text.
