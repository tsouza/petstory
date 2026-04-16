# Market & financing

## Sector

Pet health tech.

- TAM: ~$4.4B
- CAGR: ~17%

Detailed financing analysis: [`../financing-petstory.md`](../financing-petstory.md).

## Business model

Freemium.

- **Free** — daily logging, auto-generated diary, basic reminders, single pet, single owner.
- **Premium (PRO)** — contextual AI (deep correlations, long-horizon reasoning), longitudinal health reports, multi-pet, shared access (co-owners, temporary access, vet sharing), full data export.

Premium signals use the `gold #F2C94C` token (see [brand.md](brand.md)).

## Competitive context

Traditional pet-tracking apps fail on retention (median 3.9% at 15 days). The reason: they all lean on manual logging as a form-fill chore.

PetStory's differentiator — "prontuário vivo" built from natural chat — removes the logging friction and creates accumulating value (the diary).

## Go-to-market

- Domain: **petstory.co**
- Primary audience: everyday pet owners (not pro breeders, not vets)
- Secondary: shared access to pro caretakers (vets, sitters, trainers) via the Temporary Access primitive (see [`../user-stories/US-TA.md`](../user-stories/US-TA.md))
- Language: PT-BR launch; EN expansion post-MVP

## Liability surface

Medical advice is a legal risk. Mitigations:

- AI suggests, never diagnoses (Data Humanism DH9)
- Medical KB is curated from vetted sources only (AAHA, AVMA, licensed vet content)
- Any mention of a red-flag symptom must escalate to "consulte um veterinário"
- Sub-agent `clinical-safety-reviewer` gates user-facing medical text
