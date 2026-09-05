import { createGlobalTheme } from '@vanilla-extract/css'

export const ICON_PX = {
  titleLarge: 26,
  titleMedium: 22,
  titleSmall: 17,
  headline: 15,
  body: 13,
  callout: 12,
  control: 12,
  caption: 11,
  footnote: 10,
  subline: 10,
} as const

const iconScale = createGlobalTheme(':root', {
  icon: Object.fromEntries(Object.entries(ICON_PX).map(([k, v]) => [k, `${v}px`])) as {
    [K in keyof typeof ICON_PX]: string
  },
})

export const DISCLOSURE_INDENT = 14

export const RAIL_INSET = 20

export const DROP_LINE_INSET = 2

/** Grid tiles and MarkdownPM's embedded page tiles agree on this one minimum, so a
 *  resizable tile bottoms out the same wherever it can be grabbed. */
export const TILE_MIN_PX = 64

/** KNOB — the height a resizable tile reports and occupies before a persisted one exists.*/
export const TILE_DEFAULT_PX = 320

/** KNOB — the gap a resizable tile floats in, above and below. A margin sits outside the box a block
 *  widget measures, so the value the widget answers CM6 with has to add it back or the height model
 *  runs short by the gap for every tile on the page.*/
export const TILE_GAP_PX = 4

export const RADIUS_FULL = '999px'
export const DROP_LINE_THICKNESS = 2
export const DROP_DOT_SIZE = 7
export const LIST_OUTLINE_WIDTH = 2
export const LIST_OUTLINE_GAP = 3
export const PARK_CLEARANCE = 14

export const size = {
  icon: iconScale.icon,
}

export type IconSize = keyof typeof size.icon

/** The button geometry scale. The names are the public knob (a caller picks `size="button-large"`);
 *  the numbers behind each live with the button, in button-base.css.ts. */
export type ButtonSize = 'button-inline' | 'button-small' | 'button-medium' | 'button-large'
