// Single source for the app substrate color (the window background). The main
// process can't read renderer CSS vars or vanilla-extract tokens, so this plain
// constant is the seam both sides share:
//   main/index.ts → BrowserWindow backgroundColor: WINDOW_BG
//   color.css.ts  → background.window token = WINDOW_BG → --bg-window bridge var
//   styles.css    → --main-bg: var(--bg-window)
// Change it here and all three follow.
export const WINDOW_BG = '#1A1A1C'

// The spectrum solids, for the same reason: main can't read a vanilla-extract token, while
// color.css.ts needs the values to build the :root vars.
//   color.css.ts → color.solid tokens → every --color-* consumer
//   isColorKey   → the legacy half of the storable-color vocabulary, beside the ramp cells
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

/** The chip "Default" neutral. A palette value, never a selectable spectrum color — which is why
 *  it sits beside SPECTRUM rather than in it. */
export const GREY_DEFAULT = '#48484A'

/** The purple row's light seat. A palette value beside SPECTRUM rather than inside it — pink is a
 *  ramp cell, never a selectable accent or Space color. */
export const PINK = '#EF7697'

// The color-ramp vocabulary: the grammar a stored color key is written in. Main validates a stored
// Space color against these keys and cannot read a renderer token, so the KEY SET lives here while
// every cell's VALUE stays renderer-side (they are color-mix strings over CSS vars main can't resolve).
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
