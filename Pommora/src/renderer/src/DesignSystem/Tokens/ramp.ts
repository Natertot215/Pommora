// Kept in a PLAIN module (not a *.css.ts) so it can export functions — same constraint as tint.ts.
import {
  PINK,
  RAMP_FAMILIES,
  RAMP_STEPS,
  type SPECTRUM,
  type CellKey,
  type RampFamily,
  type RampStep,
} from '@shared/theme'

export { RAMP_FAMILIES, RAMP_STEPS, type CellKey, type RampFamily, type RampStep }
import { vars as colorVars } from './color.css'
import { TINT_STEPS, mixAt, tint, tintAt } from './tint'

const c = colorVars.color
const WHITE = c.system.white
const BLACK = c.system.black

/** One family's ramp, dark → light. Fixed length, so a short recipe is a compile error. */
type Row = readonly [string, string, string, string, string, string, string, string]

/** The shading knob — each step moves this far from the anchor. */
const RAMP_STEP = 15
const shade = (i: number): number => 100 - RAMP_STEP * i

/** Single-anchor ramp: three darkened steps, the anchor, four lightened. */
const single = (hex: string): Row => [
  mixAt(hex, shade(3), BLACK),
  mixAt(hex, shade(2), BLACK),
  mixAt(hex, shade(1), BLACK),
  hex,
  mixAt(hex, shade(1), WHITE),
  mixAt(hex, shade(2), WHITE),
  mixAt(hex, shade(3), WHITE),
  mixAt(hex, shade(4), WHITE),
]

/** Crossing steps mix in oklch so the passage between two anchors keeps its chroma
 *  instead of greying out through the middle. */
const blend = (light: string, pct: number, dark: string): string => mixAt(light, pct, dark, 'oklch')

/** Two-anchor ramp: darken past the dark anchor, cross in even quarters, lighten past the light one.
 *  Both anchors land on exact cells. */
const pair = (dark: string, light: string): Row => [
  mixAt(dark, shade(1), BLACK),
  dark,
  blend(light, 25, dark),
  blend(light, 50, dark),
  blend(light, 75, dark),
  light,
  mixAt(light, shade(1), WHITE),
  mixAt(light, shade(2), WHITE),
]

/** Three seats — purple → lavender → pink — bridged by oklch blends. Its shading amounts were
 *  settled by eye rather than by `shade`, so the row states them. */
const purpleRow: Row = [
  mixAt(c.solid.purple, 70, BLACK),
  c.solid.purple,
  blend(c.solid.lavender, 50, c.solid.purple),
  c.solid.lavender,
  blend(PINK, 50, c.solid.lavender),
  PINK,
  mixAt(PINK, 80, WHITE),
  mixAt(PINK, 60, WHITE),
]

/** The app's own grey tokens, window substrate up to system white — a token ladder, never computed. */
const greyRow: Row = [
  c.background.window,
  c.surface.primary,
  c.surface.secondary,
  c.surface.tertiary,
  c.solid.greyDefault,
  c.system.grey,
  c.solid.grey,
  c.system.white,
]

const RAMP: Record<RampFamily, Row> = {
  red: single(c.solid.red),
  orange: single(c.solid.orange),
  yellow: single(c.solid.yellow),
  green: single(c.solid.green),
  cyan: single(c.solid.cyan),
  blue: pair(c.solid.blue, c.solid.lightBlue),
  purple: purpleRow,
  grey: greyRow,
}

/** Where each spectrum solid sits in the grid. The back-compat seam: a bare `red` on disk resolves
 *  through here instead of being migrated. */
export const ANCHOR_CELLS: Record<keyof typeof SPECTRUM, CellKey> = {
  red: 'red-3',
  orange: 'orange-3',
  yellow: 'yellow-3',
  green: 'green-3',
  cyan: 'cyan-3',
  blue: 'blue-1',
  lightBlue: 'blue-5',
  purple: 'purple-1',
  lavender: 'purple-3',
  grey: 'grey-6',
}

const parse = (key: CellKey): { family: RampFamily; step: RampStep } => {
  const cut = key.lastIndexOf('-')
  return {
    family: key.slice(0, cut) as RampFamily,
    step: Number(key.slice(cut + 1)) as RampStep,
  }
}

/** The raw color a cell paints — the picker swatch, and every consumer wanting the solid over a tint. */
export const cellColor = (key: CellKey): string => {
  const { family, step } = parse(key)
  return RAMP[family][step]
}

/** The brightest greyscale chips tint from a darkness-offset base so their wash dims enough to carry
 *  the standard light text. A separate knob from RAMP_STEP: the two retune on different axes. */
const DARKNESS_STEP = 15

/** Greyscale borders ride label-tertiary — the row has no chroma of its own to outline with. */
const GREY_OUTLINES = [35, 45, 55, 65, 75, 85, 95, 100].map((pct) => tintAt(c.label.tertiary, pct))

/** A cell as a chip wears it. The greyscale row is the exception the rest of the grid doesn't need. */
export const cellTint = (key: CellKey): ReturnType<typeof tint> => {
  const { family, step } = parse(key)
  const color = RAMP[family][step]
  if (family !== 'grey') return tint(color)
  const base = step >= 6 ? mixAt(color, 100 - (step - 5) * DARKNESS_STEP, BLACK) : color
  return { ...tint(base), borderColor: GREY_OUTLINES[step] }
}

/** A cell as the task checkbox wears it. The box is a chip at a smaller size, so it takes the chip's
 *  recipe whole — including the greyscale row's darkness offset and its borrowed outline, which is
 *  what lets a grey checkbox read at all — and softens the border by one tint step, the one thing a
 *  box the size of a glyph wants differently from a chip. */
export const checkboxTint = (key: CellKey): ReturnType<typeof tint> => {
  const chip = cellTint(key)
  if (parse(key).family === 'grey') return chip
  return { ...chip, borderColor: tintAt(cellColor(key), TINT_STEPS.tertiary) }
}

/** The picker's selection ring. On the grey row the ring and the chip's border are one thing by
 *  construction, so it reads the recipe; every other row rings with the solid at tint-primary. */
export const cellRing = (key: CellKey): string =>
  parse(key).family === 'grey'
    ? cellTint(key).borderColor
    : tintAt(cellColor(key), TINT_STEPS.primary)
