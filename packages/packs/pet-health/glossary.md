# Ubiquitous Language — pet-health

Per ADR-004 (DDD strategic adoption) and the Domain Pack contract artifact 9 (layers.md). Canonical vocabulary for this Bounded Context. Every pack-level event type, MCP tool, copy string, and classifier keyword should use these terms consistently.

Stale glossary is worse than no glossary — `architecture-guardian` flags pack PRs that change the event schema, MCP tool surface, or copy bundle without updating this file.

## Terms (v1)

| EN technical | PT-BR user-facing | PT-BR clinical / vet | PII class | Definition |
|---|---|---|---|---|
| `Pet` | pet / bichinho | animal | `contact` | The subject of the pack — a cat, dog, or other companion animal. Carries name, species, breed, DOB. |
| `Tutor` | tutor | responsável | `contact` | The human owner / caretaker using the app on behalf of the pet. |
| `Meal` | refeição | refeição | `behavioral` | A feeding event — food given or refused, with quantity and timestamp. |
| `Symptom` | sintoma | manifestação clínica | `health` | An observed sign of possible health concern (vomiting, limping, lethargy, etc.). |
| `Medication` | remédio / medicação | medicamento | `health` | A drug given or prescribed; includes dose, route, schedule, adherence. |
| `Behavior` | comportamento | comportamento | `behavioral` | Mood or activity observation (played, slept, agitated, calm). |
| `Vet visit` | consulta | atendimento veterinário | `health` | A scheduled or completed veterinary appointment. |
| `Vaccine` | vacina | imunização | `health` | A vaccination record — which vaccine, when, next due. |
| `Weight` | peso | peso corporal | `health` | A recorded weight measurement. |
| `Diary entry` | entrada no diário | — | `behavioral` | A narrative summary authored by the AI from chat-extracted events, per the prontuario-vivo skill. |
| `Red-flag` | sinal de alerta | sinal de alarme | `health` | A symptom or pattern requiring immediate escalation to a veterinarian. Triggers the `red-flag-flow`. |

## Notation

- **PII class** matches the Domain Event PII classification per R8 (security baseline) — one of `'none' | 'behavioral' | 'health' | 'contact' | 'payment'`.
- **PT-BR user-facing** is what appears in the app. Clinical-register PT-BR is used only in vet exports or professional-context strings.
- **Definition** is the canonical meaning for this pack. Overloading a term to mean two things is a naming violation (R17).

## Update cadence

Every PR touching the event schema, MCP tools, copy bundle, or Situation Classifier keywords updates this table. `architecture-guardian` enforces.
