---
description: Produce a design → engineering handoff spec for a screen or component.
argument-hint: <screen-or-component-name>
---

Generate a developer handoff spec for `$ARGUMENTS`.

The spec must cover:

1. **Purpose** — which user story or stories this serves (link to `user-stories/US-*.md`)
2. **UX concept alignment** — how it fits the chat-first + diary concept (from `docs/ux-concept.md`)
3. **Layout** — structure, hierarchy, spacing
4. **Design tokens** — colors, typography, radii (from `docs/brand.md` — never invent)
5. **Component props / API** — typed interface
6. **Interaction states** — default, loading, empty, error, pressed, disabled
7. **Responsive breakpoints** — mobile-first, then tablet, then web
8. **Edge cases** — empty data, offline, gaps (shown honestly per Data Humanism R4)
9. **Animation** — entry, transitions, haptics (if any)
10. **Copy** — PT-BR, warm tone, pet-named, hedged if medical (invoke `clinical-safety-reviewer` on any medical string)
11. **Accessibility** — contrast ratios, tap-target size, screen-reader labels

Before finishing:

- Run `use viz-judge` if the screen shows data.
- Run `use brand-guardian` on any color / font choices.
- Run `use ux-concept-keeper` to confirm the feature fits the concept.

Write the spec to `docs/handoffs/<screen-name>.md` and report the path to the user.
