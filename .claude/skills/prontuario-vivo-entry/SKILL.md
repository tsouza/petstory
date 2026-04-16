---
name: prontuario-vivo-entry
description: Format a diary entry for PetStory's "prontuário vivo" — the auto-generated narrative that builds from chat. Use when the agent needs to write a new diary entry from raw events, or when generating a weekly/monthly summary for the Diário do Brutus screen.
---

# prontuario-vivo-entry

Turn raw events into a warm, personal diary entry that feels like a friend noticing alongside the tutor.

## Prerequisites

- [docs/data-humanism.md](../../../docs/data-humanism.md) (DH1, DH2, DH5, DH9, DH10 especially)
- [docs/ux-concept.md](../../../docs/ux-concept.md)

## Input shape

- Pet name, species, age
- A list of events from the timeline (meals, symptoms, walks, moods, etc.) for a given window
- Optional: prior diary entries for continuity

## Entry format

```
[header]
<Pet name> — <dia da semana>, <data curta>

[opening sentence — THE insight, plain language]
<One warm sentence that captures the main story of the period.>

[body — micro-stories, not aggregates]
<2–4 short observations written in first-person-observer voice.>
<Each observation ties a concrete moment to a small meaning.>
<Gaps are mentioned honestly when they matter.>

[pattern note — optional, only if a real correlation exists]
<Hedged, non-diagnostic: "Esse padrão pode indicar... pode valer conversar com o vet.">

[next nudge — what the agent will watch for, if anything]
<"Vou ficar de olho se isso se repetir amanhã.">
```

## Writing rules

- **DH1** — The opening sentence IS the insight. Never "Alimentação semanal" — always "O Brutus comeu bem 5 de 7 dias."
- **DH2** — Use the pet's name. Every entry.
- **DH5** — Context over counts. "3 coceiras" is wrong. "3 coceiras em 2 semanas, sempre depois do parque" is right.
- **DH8** — Preserve individual moments. "Ontem o Brutus não quis brincar" > "atividade 72%".
- **DH9** — Suggest, never diagnose. "Pode indicar…"
- **DH10** — Warm voice. "Você e o Brutus" not "o usuário."

## Never

- Health scores as numbers ("Score: 82/100") — rejected by UX concept
- Clinical terminology in tutor-facing text
- Diagnostic phrasing
- Smoothed gaps (say "não temos dados de quarta a sexta")
- Generic filler ("tenha um ótimo dia!")

## Example

Input: Brutus, Yorkshire, 4kg, 3yo. Window: last 7 days. Events: 12 meals eaten, 2 skipped (Mon dinner, Wed breakfast). 5 walks. 1 ear scratch episode (Thu). 1 playful mood note (Sat).

Output:

```
Brutus — semana de 6 a 12 de abril

O Brutus teve uma semana tranquila — comeu bem na maioria dos dias e voltou cheio de energia no fim de semana.

Na segunda à noite e quarta de manhã ele pulou a refeição. Em ambos os casos ele comeu normalmente na refeição seguinte, então nada fora do comum — mas vale lembrar caso vire padrão.

Na quinta você comentou que ele coçou a orelha um pouco. Só vi esse relato uma vez, então por enquanto é uma observação, não um padrão.

Sábado foi o dia mais animado da semana. Vocês passearam duas vezes e ele veio brincar sozinho com o brinquedo de corda — bom sinal depois da terça mais calma.

Vou ficar de olho se a coceira voltar nos próximos dias.
```

## Verification

Run `use clinical-safety-reviewer on <entry>` before persisting. If the entry mentions any red-flag symptom (seizure, blood, repeated vomiting, lethargy, breathing trouble, poisoning), the review MUST return SAFE — otherwise rewrite with an escalation cue.
