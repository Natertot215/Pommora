import { createGlobalTheme } from '@vanilla-extract/css'

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
    'button-inline': {
      height: '20px',
      segmentHeight: '18px',
      paddingX: '2px',
      labelPaddingX: '4px',
      radius: '5px',
      segmentRadius: '4px',
      dividerHeight: '12px',
      icon: iconScale.icon.control,
    },
    'button-small': {
      height: '24px',
      segmentHeight: '20px',
      paddingX: '4px',
      labelPaddingX: '12px',
      radius: '8px',
      segmentRadius: '4px',
      dividerHeight: '14px',
      icon: iconScale.icon.body,
    },
    'button-medium': {
      height: '28px',
      segmentHeight: '24px',
      paddingX: '5px',
      labelPaddingX: '12px',
      radius: '10px',
      segmentRadius: '5px',
      dividerHeight: '18px',
      icon: iconScale.icon.title3,
    },
    'button-large': {
      height: '32px',
      segmentHeight: '28px',
      paddingX: '8px',
      labelPaddingX: '12px',
      radius: '12px',
      segmentRadius: '6px',
      dividerHeight: '14px',
      icon: iconScale.icon.title3,
    },
  },
})

/** The one per-level inset every disclosure hierarchy steps by — the sidebar tree, table group
 *  nesting, and pane disclosure runs all derive from this single literal (theme-vars bridges it
 *  to `--disclosure-indent` for plain CSS).*/
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

/** KNOB — the height a resizable tile reports and occupies before a persisted one exists.*/
export const TILE_DEFAULT_PX = 320

/** KNOB — the gap a resizable tile floats in, above and below. A margin sits outside the box a block
 *  widget measures, so the value the widget answers CM6 with has to add it back or the height model
 *  runs short by the gap for every tile on the page.*/
export const TILE_GAP_PX = 4

export const RADIUS_FULL = '999px'
export const CONTAINER_TITLE_SIZE = '20px'
export const DROP_LINE_THICKNESS = 2
export const DROP_DOT_SIZE = 7
export const LIST_OUTLINE_WIDTH = 2
export const LIST_OUTLINE_GAP = 3
export const PARK_CLEARANCE = 14
export const CLOSE_CLEARANCE = 30

/** One token object: `size.icon.control`, `size.control['button-large'].height`, … */
export const size = {
  icon: iconScale.icon,
  control: controlScale.control,
}

/** Icon-ladder step names — the values `<Icon size="…" />` accepts. */
export type IconSize = keyof typeof size.icon

/** Button size aliases — the values a segmented control's `size` prop accepts. */
export type ButtonSize = keyof typeof size.control
