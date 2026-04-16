# Brand

Established 2026-04-09. This file is the single source of truth — never invent values.

Visual reference: `brand_audit.png` in repo root.

## Brand Teal

| Token | Hex | Use |
|---|---|---|
| `teal-800` | `#0D5C6A` | Hover, pressed states |
| `teal-600` | `#148a9c` | **PRIMARY brand teal** — accent everywhere |
| `teal-400` | `#2EC4B6` | Success, health score, positive states |
| `teal-100` | `#B4EDE8` | Success backgrounds, light accent |

## Ink scale (text & navy)

| Token | Hex | Use |
|---|---|---|
| `ink-900` | `#0D1B2A` | Primary text (NOT `#04121f`) |
| `ink-700` | `#1B4965` | Headings, logo body |
| `ink-500` | `#3D5A73` | Secondary text |
| `ink-300` | `#8A9BB0` | Muted text |

## Semantic colors

| Token | Hex | Use |
|---|---|---|
| `danger` | `#E76F51` | Alerts, warnings |
| `gold` | `#F2C94C` | Premium, accent CTAs, PRO badge |
| `success` | `#2EC4B6` | Same as teal-400 |

## Backgrounds — warm/cool strategy

**Marketing site (warm)** — sells emotion and trust.
- `bg` `#f6f1e7`
- `bg-alt` `#ece5d4`

**App light mode (cool)** — sells precision and clinical data.
- `bg` `#F7F9FB`
- `bg-card` `#FFFFFF`
- `bg-elevated` `#EEF3F8`

**App dark mode**
- `bg` `#0B1622`
- `bg-card` `#121E2D`
- `bg-elevated` `#182838`

## Typography

- **Headings** — Space Grotesk (500 medium, 700 bold)
- **Body** — Inter (400, 500, 600)
- **Logo wordmark** — Space Grotesk. "pet" weight 500, "story" weight 700.
- **Casing** — lowercase "petstory" always (not "Petstory" or "PetStory" in product copy; the latter appears in internal docs for readability).

## Logo coloring

| Context | Toes | Body | Text | Background |
|---|---|---|---|---|
| Light mode primary | `#148a9c` (teal-600) | `#1B4965` (ink-700) | `#0D1B2A` / `#1B4965` | cool `#F7F9FB` |
| Warm landing | `#148a9c` (teal-600) | `#0D1B2A` (ink-900) | `#0D1B2A` | warm `#f6f1e7` |
| Dark mode | `#2EC4B6` (teal-400) | `#5FA8D3` (light blue) | `#E4EAF0` | `#0B1622` |

Paw must have transparent background (no white rect) for dark-mode compatibility.

## Logo assets

- `paw_outline.svg` / `paw_no_outline.svg` — raw icon marks
- Horizontal layout: paw ~1.35× cap height, side by side, vertically centered
- Vertical layout: paw on top, "petstory" centered below

## Known pending fixes

- [ ] Replace header circle-paw SVG with the circuit-paw logo
- [ ] Unify phone mockup fonts to Inter (remove `-apple-system`)
- [ ] Use `gold #F2C94C` for premium CTAs (some files still use teal)
- [ ] Standardize `ink-900` to `#0D1B2A` (some files have `#04121f`)

## Enforcement

Any new UI, marketing, or design asset must use tokens above. Sub-agent `brand-guardian` is configured to flag violations — invoke it with `use brand-guardian` before committing any visual work.
