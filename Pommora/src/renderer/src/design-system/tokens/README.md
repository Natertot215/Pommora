## Tokens

The variables. **Edit here → propagates everywhere.** Authored with vanilla-extract; each file is a readable `name: value` list that compiles to real CSS variables and exposes a typed `vars` object, so a mistyped token name is a compile error.

### Tiers

- `primitives.css.ts` — raw values: the palette and the size / weight / line-height scales. The bottom layer; not referenced by components.
- The semantic files — meaningful aliases that point at primitives, grouped by concern:
  - `color.css.ts` — the `solid.*` spectrum, `label.*` tones, `background.window`, `surface.*`, `fill.*`, `state.*`, and `separator.*`. The accent is **not** a token here — it's a runtime `--accent` pointer to one of the solids (see `accent.ts` / `theme-vars.css.ts`).
  - `typography.css.ts` — `font` scale primitives + `text.<style>.{standard,emphasized}` composed classes (`mono` to follow).
  - `chip.css.ts` — the unified chip tint: one `color-mix` formula over the solids for fill, stroke, and label, mirroring Figma's Tint set.
  - `space.css.ts` — the spacing scale.
  - `radius.css.ts` · `shadow.css.ts` · `motion.css.ts` (durations + easings) · `z.css.ts`.

### Color format

Authored colors are **hex** — `#RRGGBB`, or `#RRGGBBAA` when an alpha is needed. Never `rgb()` / `rgba()` in token values or component styles; the spectrum, fills, states, and separators all follow this. The lone exception is a color the *platform* returns (`getComputedStyle` in `accent.ts` hands back an `rgb(…)` string): that value is read, not authored.

### One import everywhere

`index.ts` exposes a single `vars` object plus `text`. Every consumer does `import { vars, text } from '@renderer/design-system/tokens'` — read scalars as `vars.color.solid.blue` / `vars.font.weight.semibold` / `vars.font.scale.body.size`, and apply a whole text style with `className={text.headline.emphasized}`.

A live showcase renders the set — `npm run showcase`.
