## Tokens

The variables. **Edit here → propagates everywhere.** Authored with vanilla-extract; each file is a readable `name: value` list that compiles to real CSS variables and exposes a typed `vars` object, so a mistyped token name is a compile error. The full atlas — every family with its literal values — lives in the project docs at `.claude/Features/DesignSystemPM.md` and the SOURCE-tagged tables it charters; `node ../../../../scripts/check-atlas.mjs` verifies the tables against these files.

### The Files

- `color.css.ts` — primitives (`system.*`), the `solid.*` spectrum, `label.*` tones, `background.window`, `surface.*`, `fill.*`, `state.*`, `separator.*`, and the two shadow vars. The accent is **not** a token here — it's a runtime `--accent` pointer to one of the solids (see `accent.ts` / `theme-vars.css.ts`).
- `theme-vars.css.ts` — the bridge: one `globalStyle(':root')` block republishing the hashed tokens under stable `--name` handles for plain CSS, plus the var-only families (drag chrome, list outline, glyph masks, states' opacity dims).
- `typography.css.ts` — `font` primitives + `text.<style>.<weight>` composed classes across four weights.
- `chip.css.ts` / `colorMap.ts` — the unified chip tint over the solids, its shapes, and the palette accessor.
- `tint.ts` — `TINT_STEPS` and `tintAt`, the one opacity ladder colored things mix at.
- `size.css.ts` — the icon ladder, control bundles, and the bare layout constants.
- `motion.ts` — durations and easings. `stack.ts` — the three z ladders.

### Color format

Authored colors are **hex** — `#RRGGBB`, or `#RRGGBBAA` when an alpha is needed. Never `rgb()` / `rgba()` in token values or component styles; the spectrum, fills, states, and separators all follow this. The lone exception is a color the *platform* returns (`getComputedStyle` in `accent.ts` hands back an `rgb(…)` string): that value is read, not authored.

### One import everywhere

`index.ts` exposes a single `vars` object plus `text`. Every consumer does `import { vars, text } from '@renderer/design-system/tokens'` — read scalars as `vars.color.solid.blue` / `vars.font.weight.semibold`, and apply a whole text style with `className={text.headline.emphasized}`. Plain `.css` reads the bridged `--name` handles; both resolve the same source of truth.

A live showcase renders the set — `npm run showcase`.
