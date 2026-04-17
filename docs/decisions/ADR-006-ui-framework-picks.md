# ADR-006 — UI framework picks: NativeWind, React Native Reusables, React Hook Form, Zustand, Expo Router SSR

**Status:** Accepted
**Date:** 2026-04-16
**Deciders:** Thiago
**Supersedes:** —
**Depends on:** [ADR-001](ADR-001-stack.md), [ADR-005](ADR-005-monorepo-structure-and-tooling.md)

## Context

ADR-001 pinned Expo + RN New Arch + RN Web as the client framework and Convex as the backend. R3 (engineering-rules.md) enforced "modern client patterns" (React 19+ concurrent, Reanimated 4, MMKV, Zod), but left the specific picks for five UI concerns open:

1. Styling
2. Component primitives
3. Form handling
4. Non-server state
5. Web/marketing framework (single-stack SSR vs. split to Next.js)

This ADR closes those gaps. Research pass April 2026.

## Decision

### Styling — NativeWind

Tailwind-style utilities compiled AOT for React Native + RN Web. Single styling system across mobile and web surfaces.

### Component primitives — React Native Reusables

shadcn/ui-style copy-paste component library for React Native, built on NativeWind. We own every component source file; the library is a starting point, not a runtime dependency.

### Form handling — React Hook Form + `@hookform/resolvers` + Zod

Uncontrolled forms, minimal re-renders. Zod resolver bridges forms to R5's boundary-validation discipline.

### Non-server state — Zustand

3 KB, minimal API. Convex reactive handles server state; Zustand handles UI-only state (modals, wizards, theme preference, transient flow state).

### Web / marketing framework — Expo Router v55+ with experimental SSR (stay single-stack)

Keep marketing on Expo Router with `expo-server` + data loaders + experimental SSR for SEO. Do not split to Next.js yet. ADR-001 already tracks that split as a follow-up if SEO becomes a real bottleneck.

## Rationale

### Why NativeWind, not Tamagui or Unistyles

- **NativeWind** — ~517k weekly npm vs. Tamagui's 90k and Unistyles' 68k (npm trends, April 2026). Tailwind vocabulary is familiar to anyone from the web; AOT compilation avoids runtime-style-object overhead.
- **Tamagui** — more capable design system but heavier API surface and pulls in its own styling/component coupling. Revisit if complex animation or compiler-optimized cross-platform design becomes a need.
- **Unistyles** — low-level, flexible, best when building fully custom design; niche fit for us.
- **Vanilla `StyleSheet`** — too verbose for a 2026 codebase when AOT-compiled Tailwind utilities exist.

### Why React Native Reusables, not Tamagui or Gluestack

- **React Native Reusables** — shadcn's copy-paste philosophy aligns with R22 (OCP): we own every component; no runtime API we can't customize. Pairs natively with NativeWind.
- **Tamagui components** — tied to the Tamagui styling system; incompatible with the NativeWind pick.
- **Gluestack / NativeBase** — runtime dependencies with less "we own the code" posture; harder to align with our Brand Guardian + Data Humanism rules without upstream hacks.

### Why React Hook Form, not TanStack Form

- **React Hook Form** — most widely adopted; uncontrolled-inputs pattern = minimal re-renders; mature Zod resolver.
- **TanStack Form** — better type-safety and async-validation ergonomics, but pet-tracker forms aren't complex enough to earn the migration cost. Revisit when form complexity actually argues for the upgrade.

### Why Zustand, not Jotai or Redux Toolkit

- **Zustand** — 2026 pragmatic default. 3 KB, single store, React-idiomatic, devtools integration available.
- **Jotai** — atomic model elegant for derived values, but adds conceptual overhead for UI-only state. R0 veto on complexity without concrete pain.
- **Redux Toolkit** — ~15 KB, devtools excellent; overkill at our scale. Revisit if state debugging becomes a bottleneck.

### Why Expo Router SSR (keep single-stack), not split to Next.js

- Expo Router v55+ now ships experimental SSR + `expo-server` + data loaders → SEO works without a separate stack.
- Maintaining one framework across mobile + web is simpler than Next.js for web + Expo for native.
- ADR-001 already tracks the split as a follow-up; that door stays open if SEO proves inadequate.

## Consequences

### Positive

- One styling system (NativeWind) across mobile + web surfaces.
- Copy-paste components we own extend R22's extension-slot philosophy to UI.
- Single framework (Expo Router) eliminates multi-stack hassle.
- Zustand + React Hook Form are each ~3 KB — minimal bundle impact (R7 perf budgets respected).

### Negative / risks

- NativeWind + React Native Reusables is a newer pairing; bugs at the ecosystem interface are possible. Mitigated: styling layer is thin, swapping to Unistyles is ~1 week of codemod if needed.
- Expo Router SSR is marked experimental — SEO validation is part of marketing-site launch testing.
- We've opted out of Tamagui's design-system benefits; if design complexity outgrows Reusables + NativeWind, we revisit.

### Cross-cutting consequences

- **Security.** All picks have clean license posture (MIT / Apache-2.0). NativeWind compiles statically — no runtime style parsing of user data.
- **Observability.** Zustand devtools are available; React Hook Form has built-in debug hooks. Neither pick introduces new LLM-observability concerns beyond R6.

## Follow-ups

Future ADRs (numbers assigned when the work begins):

- Next.js marketing split — if Expo Router SSR SEO proves inadequate post-Beta.
- Design system formalization — when the component library grows beyond ~40 owned components.
- State-management revisit — if Zustand + Convex reactive ratio shifts toward more UI state than expected.
