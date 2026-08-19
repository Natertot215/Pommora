import { createGlobalTheme } from '@vanilla-extract/css'

/**
 * Size tokens — the single source for icon dimensions and control geometry.
 * Two scales, mirrored from Figma:
 *
 * - `icon.*` — the glyph ladder, named one-to-one with the type ramp in
 *   `typography.css.ts` so a glyph and the text beside it name the same step.
 *   Eleven names over eight values, matching the ramp's own repeats.
 *   `<Icon size="control" />` resolves to the var; `ICON_PX` carries the same
 *   ladder as bare numbers for the few consumers that size an element rather
 *   than a font (a profile photo's width/height).
 * - `control.button.*` — per-component size aliases (`button-small/medium/large`).
 *   Each is a geometry bundle whose `icon` field *references* the icon ladder rather
 *   than restating a dimension. The bundles are drawn values, not a formula: heights
 *   and radii climb with the step, while the divider height and the glyph do not —
 *   medium carries the tallest divider and shares its icon step with large. Large is
 *   exact from Figma (SEGMENTED · SYMBOL, Large/None); Small and Medium are held by
 *   hand until they're pulled.
 */

/** The glyph ladder as bare numbers — the one place the pixel values live. Consumers that set a
 *  font-size read the vars below; the few that size an element (a profile photo's width/height)
 *  read these. */
export const ICON_PX = {
  largeTitle: 26,
  title1: 22,
  title2: 17,
  title3: 15,
  headline: 13,
  body: 13,
  callout: 12,
  control: 12,
  caption: 11,
  footnote: 10,
  subline: 10,
} as const

// The glyph ladder — its own theme so the control bundles can point at its vars.
const iconScale = createGlobalTheme(':root', {
  icon: Object.fromEntries(Object.entries(ICON_PX).map(([k, v]) => [k, `${v}px`])) as {
    [K in keyof typeof ICON_PX]: string
  },
})

// Per-component size aliases. Keyed `button-*` so a call site reads `size="button-large"`;
// `icon` references the ladder above (DRY linkage). Large is exact from Figma.
const controlScale = createGlobalTheme(':root', {
  control: {
    'button-small': {
      height: '24px',
      segmentHeight: '20px',
      paddingX: '4px',
      radius: '8px',
      segmentRadius: '4px',
      dividerHeight: '14px',
      icon: iconScale.icon.body,
    },
    'button-medium': {
      height: '28px',
      segmentHeight: '24px',
      paddingX: '5px',
      radius: '10px',
      segmentRadius: '5px',
      dividerHeight: '18px',
      icon: iconScale.icon.title3,
    },
    'button-large': {
      height: '32px',
      segmentHeight: '28px',
      paddingX: '8px',
      radius: '12px',
      segmentRadius: '6px',
      dividerHeight: '14px',
      icon: iconScale.icon.title3,
    },
  },
})

/** The one per-level inset every disclosure hierarchy steps by — the sidebar tree, table group
 *  nesting, and pane disclosure runs all derive from this single literal (theme-vars bridges it
 *  to `--disclosure-indent` for plain CSS). A number, not a var: drop-line math multiplies it. */
export const DISCLOSURE_INDENT = 14

/** The shared left lane the fold chevron + block grips render in — one lane width agreed on by the
 *  editor, table views, block tiles, and embeds (theme-vars bridges it to `--fold-gutter`; embeds
 *  override with the same base scaled by `--mdpm-scale`). */
export const FOLD_GUTTER = 20

/** Px an insertion line is pulled in from its surface's edges — the third dimension of the
 *  drop-line primitive (`--drop-line-thickness` / `--drop-dot-size` carry the other two). */
export const DROP_LINE_INSET = 2

/** The floor a resizable tile is never dragged below, on either axis — SurfacePM's blocks and
 *  MarkdownPM's embedded page tiles agree on one minimum, so a tile bottoms out the same wherever
 *  it can be grabbed. */
export const TILE_MIN_PX = 64

/** One token object: `size.icon.control`, `size.control['button-large'].height`, … */
export const size = {
  icon: iconScale.icon,
  control: controlScale.control,
}

/** Icon-ladder step names — the values `<Icon size="…" />` accepts. */
export type IconSize = keyof typeof size.icon

/** Button size aliases — the values a segmented control's `size` prop accepts. */
export type ButtonSize = keyof typeof size.control
