---
name: brand-apply
description: Apply petstory.co brand tokens (colors, typography, logo coloring, warm/cool bg) to a new or existing file. Use when creating a new visual asset, migrating a file that uses ad-hoc values, or asked to "apply the brand" to something.
---

# brand-apply

Apply petstory.co brand correctly on first try.

## Inputs

- Target file or asset (the user tells you what to apply to)
- Context: marketing surface OR app UI OR logo variant

## Step-by-step

### 1. Load the source of truth

Read [docs/brand.md](../../../docs/brand.md) fully. Never invent values.

### 2. Decide the background tier

- Marketing site / landing / emotional surfaces → **warm** (`#f6f1e7`, `#ece5d4`)
- App UI (chat, diary, forms, settings) → **cool** (`#F7F9FB`, `#FFFFFF`, `#EEF3F8`)
- App dark mode → (`#0B1622`, `#121E2D`, `#182838`)

### 3. Apply colors

Replace any ad-hoc hex with the nearest token:

| Use | Token | Hex |
|---|---|---|
| Primary brand | `teal-600` | `#148a9c` |
| Primary text | `ink-900` | `#0D1B2A` |
| Secondary text | `ink-500` | `#3D5A73` |
| Muted | `ink-300` | `#8A9BB0` |
| Success | `teal-400` | `#2EC4B6` |
| Attention | `gold` | `#F2C94C` |
| Danger | `danger` | `#E76F51` |

Hover/pressed → `teal-800 #0D5C6A`.

### 4. Apply typography

- Headings → `font-family: "Space Grotesk", system-ui, sans-serif;` (weights 500 / 700)
- Body → `font-family: "Inter", system-ui, sans-serif;` (weights 400 / 500 / 600)
- Never `-apple-system` as primary.

### 5. Logo coloring

Pick by context:

- Light app UI → toes `#148a9c`, body `#1B4965`, text `#0D1B2A`
- Warm landing → toes `#148a9c`, body `#0D1B2A`, text `#0D1B2A`
- Dark mode → toes `#2EC4B6`, body `#5FA8D3`, text `#E4EAF0`

Paw must have transparent background.

### 6. Verify

Run the `brand-guardian` sub-agent over the result:

```
use brand-guardian on <file>
```

If any violations come back, fix them. Then re-run.

## Output

A clean diff + a note saying "brand-guardian passes" once verified.
