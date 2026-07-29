// Single source for the app substrate colour (the window background). The main
// process can't read renderer CSS vars or vanilla-extract tokens, so this plain
// constant is the seam both sides share:
//   main/index.ts → BrowserWindow backgroundColor: WINDOW_BG
//   color.css.ts  → background.window token = WINDOW_BG → --bg-window bridge var
//   styles.css    → --main-bg: var(--bg-window)
// Change it here and all three follow.
export const WINDOW_BG = '#1A1A1C'

// The spectrum solids, for the same reason: main validates a stored accent and a stored Space
// color against these keys and cannot read a vanilla-extract token, while color.css.ts needs the
// values to build the :root vars. Written once here, mirrored from the Figma color collection.
//   color.css.ts → color.solid tokens → every --color-* consumer
//   types.ts     → SOLID_COLORS, the key vocabulary both processes validate against
export const SPECTRUM = {
  red: '#FF453A',
  orange: '#FF9F0A',
  yellow: '#FFD60A',
  green: '#32D74B',
  lightBlue: '#7EC8E3',
  cyan: '#41959F',
  blue: '#0A84FF',
  purple: '#BF5AF2',
  lavender: '#A78BCC',
  grey: '#8E8E93',
} as const

/** The chip "Default" neutral. A palette value, never a selectable spectrum color — which is why
 *  it sits beside SPECTRUM rather than in it. */
export const GREY_DEFAULT = '#48484A'
