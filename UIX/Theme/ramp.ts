// The palette grid and everything that reads it: a stored color string resolves here to the cell it names and the CSS that cell paints. Every seat is a token from color.css, never a value.
import {
  type AccentSetting,
  type CellKey,
  DEFAULT_ACCENT,
  type RampFamily,
  type RampStep,
  type SPECTRUM,
  isColorKey,
  mixAt,
  tintAt,
} from './colors'
import { vars as colorVars } from './color.css'
import type { LabelColorName } from '../Labels/label-base.css'

const c = colorVars.color
const WHITE = c.system.white
const BLACK = c.system.black

type Row = readonly [string, string, string, string, string, string, string, string]

/** KNOB — how far each step moves from its anchor. */
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

/** oklch keeps the passage between two anchors chromatic instead of greying out. */
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

/** Purple → lavender → pink; the amounts were settled by eye. */
const purpleRow: Row = [
  mixAt(c.solid.purple, 70, BLACK),
  c.solid.purple,
  blend(c.solid.lavender, 50, c.solid.purple),
  c.solid.lavender,
  blend(c.solid.pink, 50, c.solid.lavender),
  c.solid.pink,
  mixAt(c.solid.pink, 80, WHITE),
  mixAt(c.solid.pink, 60, WHITE),
]

/** The app's own greys, window substrate up to system white. */
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

/** Where each spectrum solid sits on the grid; a bare `red` on disk resolves through here rather than migrating. */
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
  pink: 'purple-5',
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

/** KNOB — how far the two brightest greys darken so their light text still reads. */
const DARKNESS_STEP = 15

/** The grey row has no chroma to outline with, so its borders ride label-tertiary. */
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

/** A checkbox or switch painted in a stored color, through the chip's recipe so a greyscale row keeps its darkness offset and borrowed outline; none for no color, which inherits the Nexus's. */
export function checkboxPaint(
  color: string | undefined,
): { '--checkbox-base': string; '--checkbox-outline': string } | undefined {
  const key = labelColorFor(color)
  if (key === 'default') return undefined
  const { base, outline } = cellPaint(key)
  return { '--checkbox-base': base, '--checkbox-outline': outline ?? tintAt(base, 'tertiary') }
}

export const cellRing = (key: CellKey): string =>
  cellPaint(key).outline ?? tintAt(cellColor(key), 'primary')

export function labelColorFor(color: string | undefined): CellKey | 'default' {
  if (!color || !isColorKey(color)) return 'default'
  return Object.hasOwn(ANCHOR_CELLS, color)
    ? ANCHOR_CELLS[color as keyof typeof SPECTRUM]
    : (color as CellKey)
}

/** A stored cell's CSS, or the External Link Color when unset. */
export function solidColorCss(color: string | undefined): string {
  if (!color) return 'var(--link)'
  const key = labelColorFor(color)
  return cellColor(key === 'default' ? 'grey-4' : key)
}

/** `fallback` resolves to no cell, so the picker rings nothing and the accent's own cell stays assignable. */
export function resolveColor(
  color: string | undefined,
  fallback: string,
): { name: LabelColorName; css: string } {
  if (!color) return { name: 'accent', css: fallback }
  return { name: labelColorFor(color), css: solidColorCss(color) }
}

const accentCell = (setting: string): string => {
  const key = labelColorFor(setting)
  return cellColor(key === 'default' ? ANCHOR_CELLS[DEFAULT_ACCENT] : key)
}

export function accentValue(setting: AccentSetting, systemColor: string | null): string {
  if (setting === 'system') return systemColor ?? accentCell(DEFAULT_ACCENT)
  return accentCell(setting)
}

export function applyAccent(setting: AccentSetting, systemColor: string | null): void {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty('--accent', accentValue(setting, systemColor))
}

/** The OS accent `--link` falls back to, independent of the `--accent` setting. */
export function applySystemAccent(systemColor: string | null): void {
  if (typeof document === 'undefined') return
  const value = systemColor ?? readCssAccentColor() ?? accentCell(DEFAULT_ACCENT)
  document.documentElement.style.setProperty('--system-accent', value)
}

/** For contexts without Electron's native accent, such as the showcase. */
export function readCssAccentColor(): string | null {
  if (typeof document === 'undefined' || !globalThis.CSS?.supports('color', 'AccentColor'))
    return null
  const probe = document.createElement('span')
  probe.style.color = 'AccentColor'
  document.body.appendChild(probe)
  const rgb = getComputedStyle(probe).color
  probe.remove()
  return rgb
}
