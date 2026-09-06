// The palette grid and everything that reads it: a stored color string resolves through here to the
// cell it names and the CSS that cell paints. Every seat is a token from color.css, never a value.
import {
  type AccentSetting,
  type CellKey,
  DEFAULT_ACCENT,
  PINK,
  RAMP_FAMILIES,
  RAMP_STEPS,
  type RampFamily,
  type RampStep,
  type SPECTRUM,
  isColorKey,
  mixAt,
  tintAt,
} from './colors'
import { vars as colorVars } from './color.css'
import type { LabelColorName } from '../Labels/label-base.css'

export { RAMP_FAMILIES, RAMP_STEPS, type CellKey, type RampFamily, type RampStep }

const c = colorVars.color
const WHITE = c.system.white
const BLACK = c.system.black

type Row = readonly [string, string, string, string, string, string, string, string]

/** The shading knob — each step moves this far from the anchor. */
const RAMP_STEP = 15
const shade = (i: number): number => 100 - RAMP_STEP * i

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

/** oklch, so the passage between two anchors keeps its chroma instead of greying out. */
const blend = (light: string, pct: number, dark: string): string => mixAt(light, pct, dark, 'oklch')

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

/** Three seats — purple → lavender → pink. Its amounts were settled by eye, so the row states them. */
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

/** The back-compat seam: a bare `red` on disk resolves through here instead of being migrated. */
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

export const cellColor = (key: CellKey): string => {
  const { family, step } = parse(key)
  return RAMP[family][step]
}

/** The brightest greys tint from a darkness offset so their wash still carries the light text. A separate knob from RAMP_STEP: the two retune on different axes. */
const DARKNESS_STEP = 15

/** Greyscale borders ride label-tertiary — the row has no chroma of its own to outline with. */
const GREY_OUTLINES = [35, 45, 55, 65, 75, 85, 95, 100].map((pct) => tintAt(c.label.tertiary, pct))

export const cellPaint = (key: CellKey): { base: string; outline?: string } => {
  const { family, step } = parse(key)
  const color = RAMP[family][step]
  if (family !== 'grey') return { base: color }
  return {
    base: step >= 6 ? mixAt(color, 100 - (step - 5) * DARKNESS_STEP, BLACK) : color,
    outline: GREY_OUTLINES[step],
  }
}

/** On the grey row the ring and the chip's border are one thing; every other row rings at tint-primary. */
export const cellRing = (key: CellKey): string =>
  cellPaint(key).outline ?? tintAt(cellColor(key), 'primary')

// The one crossing from a stored color string to a render key; it absorbs the legacy vocabulary.
const ANCHORS: Readonly<Record<string, CellKey>> = ANCHOR_CELLS

export function labelColorFor(color: string | undefined): CellKey | 'default' {
  if (!color) return 'default'
  const anchor = ANCHORS[color]
  if (anchor) return anchor
  return isColorKey(color) ? (color as CellKey) : 'default'
}

/** The CSS color a palette key resolves to: its stored cell, or the runtime system accent when unset ("Default"). One source for the link cell/editor AND the checkbox cell/editor. */
export function solidColorCss(color: string | undefined): string {
  if (!color) return 'var(--system-accent)'
  const key = labelColorFor(color)
  return cellColor(key === 'default' ? 'grey-4' : key)
}

/** `fallback` is what an unset color follows and resolves to no cell, so the picker rings nothing and the accent's own cell stays assignable. */
export function resolveColor(
  color: string | undefined,
  fallback: string,
): { name: LabelColorName; css: string } {
  if (!color) return { name: 'accent', css: fallback }
  return { name: labelColorFor(color), css: solidColorCss(color) }
}

/** There is no separate "accent" color — it is always a cell of the ramp, resolved as a chip is. */
const accentCell = (setting: string): string => {
  const key = labelColorFor(setting)
  return cellColor(key === 'default' ? ANCHOR_CELLS[DEFAULT_ACCENT] : key)
}

export function accentValue(setting: AccentSetting, systemColor: string | null): string {
  if (setting === 'system') return systemColor ?? accentCell(DEFAULT_ACCENT)
  return accentCell(setting)
}

/** Every accented surface derives from `--accent`, so this one property recolors all of them. */
export function applyAccent(setting: AccentSetting, systemColor: string | null): void {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty('--accent', accentValue(setting, systemColor))
}

/** Independent of the `--accent` setting. External `[text](url)` links bind to `--system-accent`; internal connections bind to `--accent`. */
export function applySystemAccent(systemColor: string | null): void {
  if (typeof document === 'undefined') return
  const value = systemColor ?? readCssAccentColor() ?? accentCell(DEFAULT_ACCENT)
  document.documentElement.style.setProperty('--system-accent', value)
}

/** Fallback for contexts without Electron's native accent (e.g. the showcase). */
export function readCssAccentColor(): string | null {
  if (typeof document === 'undefined') return null
  const probe = document.createElement('span')
  probe.style.color = 'AccentColor'
  document.body.appendChild(probe)
  const rgb = getComputedStyle(probe).color
  probe.remove()
  return rgb || null
}
