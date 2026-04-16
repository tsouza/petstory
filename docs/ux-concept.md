# UX concept

Validated 2026-04-16. North star for every UX, copy, and feature decision.

## Architecture

**Chat-first** — the tutor talks naturally about the pet's day. The AI extracts structured data (meals, symptoms, meds, behavior, events) from the conversation and registers everything automatically. No forms. No manual logging.

**"Diário do Brutus"** (was called Health Vault) — a dashboard/diary that builds itself from chat conversations. The tutor visits when they want; doesn't have to. Contains:

- Pet summary as warm text (NOT a health-score number)
- Weekly streaks with emoji / color dots
- AI insights as narrative text
- Timeline of micro-stories
- "Levar ao vet" button → export to vet

**Proactive nudges** — the AI initiates conversations: morning check-ins ("Como o Brutus amanheceu?"), follow-ups on symptoms, gentle reminders when gaps occur. Labeled *"Lembrete carinhoso."* Calibrated to not annoy.

## Key UX decisions

| Decision | Rationale |
|---|---|
| No traditional charts for basic users | See [viz-rules.md](viz-rules.md). Charts only in progressive disclosure for power users (R6). |
| Text first, always | Every data display opens with a sentence that IS the insight. |
| Gaps shown honestly | Missing days = `?` + dashed border + warm note ("tudo bem, acontece!"). |
| Titles = insights | "O Brutus comeu bem 5 de 7 dias" not "Alimentação semanal." |
| Warm tone, about the pet | Pet's name. "Você e o Brutus." Never clinical language. |
| AI suggests, never diagnoses | "Pode indicar…", "pode valer conversar com o vet." |
| Progressive disclosure | Layer 1: chat. Layer 2: diary. Layer 3: vet export. |
| Header button label | "Diário" (not "Vault" or "Dashboard"). Notification badge for new insights. |

## Design rules

All UI follows the 10 Data Humanism rules in [data-humanism.md](data-humanism.md).

## Mockup reference

Interactive React mockup at `mockup-chat-dashboard.jsx` (repo root) — animated chat flow + diary screen with all patterns applied.

## Why this concept was chosen

Solves the core retention problem of health-tracking apps (median 3.9% retention at 15 days).

- Chat-as-input eliminates logging friction
- Auto-generated diary creates accumulating value
- Proactive nudges maintain engagement without forms

## Decision litmus test

For any new screen or feature: *"Does this feel like a conversation with a caring friend, or like filling out a medical form?"*

If the answer is "medical form," go back.

## Enforcement

Sub-agent `ux-concept-keeper` applies this concept to any feature/screen proposal. Invoke with `use ux-concept-keeper`.
