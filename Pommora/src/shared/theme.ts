// Single source for the app substrate color (the window background). The main process can't read renderer CSS vars or vanilla-extract tokens, so this plain constant is the seam both sides share — main's BrowserWindow backgroundColor, color.css.ts's background.window token, and styles.css's --main-bg all trace back here.
export const WINDOW_BG = '#1A1A1C'

// The spectrum solids, for the same reason: main can't read a vanilla-extract token, while
// color.css.ts needs the values to build the :root vars.
export const SPECTRUM = {
  red: '#FF453A',
  orange: '#FF9F0A',
  yellow: '#FFD60A',
  green: '#32D74B',
  lightBlue: '#7EC8E3',
  cyan: '#41959F',
  blue: '#0A84FF',
  purple: '#7852EE',
  lavender: '#A78BCC',
  grey: '#8E8E93',
} as const

/** The chip "Default" neutral. A palette value, never a selectable spectrum color — which is why it sits beside SPECTRUM rather than in it. */
export const GREY_DEFAULT = '#48484A'
export const PINK = '#EF7697'

export const RAMP_FAMILIES = [
  'red',
  'orange',
  'yellow',
  'green',
  'cyan',
  'blue',
  'purple',
  'grey',
] as const
export const RAMP_STEPS = [0, 1, 2, 3, 4, 5, 6, 7] as const

export type RampFamily = (typeof RAMP_FAMILIES)[number]
export type RampStep = (typeof RAMP_STEPS)[number]
export type CellKey = `${RampFamily}-${RampStep}`

const COLOR_KEYS: ReadonlySet<string> = new Set<string>([
  ...RAMP_FAMILIES.flatMap((family) => RAMP_STEPS.map((step) => `${family}-${step}`)),
  ...Object.keys(SPECTRUM),
])

/** A storable color: a ramp cell, or one of the ten bare anchor names already on disk. */
export const isColorKey = (s: string): boolean => COLOR_KEYS.has(s)
