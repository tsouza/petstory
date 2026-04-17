# PetStory — User Stories Index

> Format: Job Stories (JTBD) · Template: [`guidelines.md`](guidelines.md)
> ID format: `US-{CAT}-{NNN}`
> Last updated: 2026-04-17

---

## ID Convention

```
US - DR - 001
│    │    │
│    │    └── Sequential within category (001–999)
│    └────── Category code (2 letters)
└─────────── Prefix: User Story
```

## Categories

> Stories live under `<CAT>/US-<CAT>-<NNN>.md` (one file per story). Clusters with no authored story yet show a `_NNN planned_` placeholder; clusters with at least one story show a live directory link. Authored via the `new-user-story` skill.

| Code | Category | Directory | Stories | Scope |
|------|----------|-----------|---------|-------|
| DR | Daily Record | [DR/](DR/) | 1 / 10 | Daily logging of meals, exercise, sleep, mood, weight, photos |
| AN | Food & Nutrition | _6 planned_ | 0 / 6 | Food switches, diets, food reactions, natural feeding |
| SP | Symptoms & Concerns | _14 planned_ | 0 / 14 | Vomiting, diarrhea, itching, limping, seizures, lesions, pain signs |
| SV | Health & Veterinary | _16 planned_ | 0 / 16 | Vaccines, medications, lab results, surgeries, physiotherapy, records |
| LP | Reminders & Prevention | _6 planned_ | 0 / 6 | Vaccine, dewormer, medication, and routine checkup reminders |
| IA | AI & Insights | _14 planned_ | 0 / 14 | Correlations, patterns, summaries, nudges, smart alerts |
| TA | Temporary Access | _5 planned_ | 0 / 5 | Temporary invite, permissions, revocation (cross-cutting primitive) |
| MD | Multi-owner (Permanent) | _5 planned_ | 0 / 5 | Co-owners, shared feed, split checklist, notifications |
| CV | Vet Sharing | _5 planned_ | 0 / 5 | Reports, PDF export, shareable link, vet notes |
| MC | Milestones & Lifecycle | _9 planned_ | 0 / 9 | Registration, birthday, neutering, age transitions, achievements |
| PM | Loss & Memorial | _4 planned_ | 0 / 4 | Passing, memorial, affective memories, frozen profile |
| MP | Multiple Pets | _5 planned_ | 0 / 5 | Multi-pet dashboard, adaptation, contagion, separate medications |
| CE | Behavior & Emotional | _7 planned_ | 0 / 7 | Anxiety, aggression, socialization, fears, destructive behavior |
| SL | Life Situations | _8 planned_ | 0 / 8 | Moving house, new baby, lost pet, emergency, terminal illness |
| EG | Engagement | _5 planned_ | 0 / 5 | Streaks, checklists, health milestones, affective memories |
| OB | Onboarding | _4 planned_ | 0 / 4 | Profile, routine, invite, history import |

**Total: 16 categories · 1 / 123 stories authored**

---

## Count by Trigger Type

| Trigger | Count | Main categories |
|---------|-------|-----------------|
| user-reported | ~55 | DR, AN, SP, SV, CE |
| system-detected | ~18 | IA, LP |
| co-owner-reported | ~8 | MD, TA |
| calendar | ~12 | SV, LP, MC |
| environmental | ~6 | SL, CE |
| lifecycle | ~10 | MC, PM, OB |
| composite | ~14 | IA (multiple triggers) |

## Count by Emotional Load

| Load | Count | Examples |
|------|-------|----------|
| low | ~45 | Log meal, walk, weight |
| medium | ~50 | Food switch, mild symptom, correlation |
| high | ~28 | Seizure, emergency, loss, lost pet |

---

## Cross-cutting Primitive: Temporary Access (TA)

Temporary access is a primitive that absorbs multiple scenarios:

```
Pet sitter ──────────┐
Dog walker ──────────┤
Boarding facility ───┤
Groomer ─────────────┤
Trainer ─────────────┼── US-TA (invite + scope + duration)
Vet w/ hospitalized pet ┤
Visiting family ─────┤
Neighbor ────────────┤
Ex in custody transition ┤
Hospitalized owner ──┘
```

Stories that depend on TA: US-MD-003, US-CV-003, US-SL-006, US-SL-008

---

## Key Dependencies

```
US-OB-001 (registration)  ← everything depends on this
US-OB-003 (routine)       ← US-LP-* (reminders depend on configured routine)
US-TA-001 (invite)        ← US-TA-002..005 (all temporary access stories)
US-DR-001 (meal)          ← US-IA-001, US-IA-002 (food insights)
US-SP-*   (symptoms)      ← US-IA-004..005 (symptom correlations)
US-SV-005 (medication)    ← US-LP-004 (medication reminder)
```
