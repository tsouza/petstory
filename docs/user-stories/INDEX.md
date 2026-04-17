# PetStory — User Stories Index

> Format: Job Stories (JTBD) · Template: [`guidelines.md`](guidelines.md)
> ID format: `US-{CAT}-{NNN}`
> Last updated: 2026-04-16

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

> Story files are authored on demand via the `new-user-story` skill. Filenames below are placeholders until the first story in each cluster lands — the `File` column becomes a live link at that point.

| Code | Category | File | Stories | Scope |
|------|----------|------|---------|-------|
| DR | Daily Record | `US-DR.md` | 10 | Daily logging of meals, exercise, sleep, mood, weight, photos |
| AN | Food & Nutrition | `US-AN.md` | 6 | Food switches, diets, food reactions, natural feeding |
| SP | Symptoms & Concerns | `US-SP.md` | 14 | Vomiting, diarrhea, itching, limping, seizures, lesions, pain signs |
| SV | Health & Veterinary | `US-SV.md` | 16 | Vaccines, medications, lab results, surgeries, physiotherapy, records |
| LP | Reminders & Prevention | `US-LP.md` | 6 | Vaccine, dewormer, medication, and routine checkup reminders |
| IA | AI & Insights | `US-IA.md` | 14 | Correlations, patterns, summaries, nudges, smart alerts |
| TA | Temporary Access | `US-TA.md` | 5 | Temporary invite, permissions, revocation (cross-cutting primitive) |
| MD | Multi-owner (Permanent) | `US-MD.md` | 5 | Co-owners, shared feed, split checklist, notifications |
| CV | Vet Sharing | `US-CV.md` | 5 | Reports, PDF export, shareable link, vet notes |
| MC | Milestones & Lifecycle | `US-MC.md` | 9 | Registration, birthday, neutering, age transitions, achievements |
| PM | Loss & Memorial | `US-PM.md` | 4 | Passing, memorial, affective memories, frozen profile |
| MP | Multiple Pets | `US-MP.md` | 5 | Multi-pet dashboard, adaptation, contagion, separate medications |
| CE | Behavior & Emotional | `US-CE.md` | 7 | Anxiety, aggression, socialization, fears, destructive behavior |
| SL | Life Situations | `US-SL.md` | 8 | Moving house, new baby, lost pet, emergency, terminal illness |
| EG | Engagement | `US-EG.md` | 5 | Streaks, checklists, health milestones, affective memories |
| OB | Onboarding | `US-OB.md` | 4 | Profile, routine, invite, history import |

**Total: 16 categories · 123 stories**

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
