import { createGlobalTheme, globalStyle } from '@vanilla-extract/css'
import {
  GREY_DEFAULT,
  SHADOW_BASE,
  SHADOW_STRONG,
  SPECTRUM,
  SURFACE,
  SYSTEM,
  WINDOW_BG,
  tintAt,
} from './colors'

const primitive = createGlobalTheme(':root', { color: { system: SYSTEM } })
const { grey, white, black } = primitive.color.system

// Derived tokens, mirrored from the Figma color collection; each share is its own rather than a tint step.
const derived = createGlobalTheme(':root', {
  color: {
    solid: { ...SPECTRUM, greyDefault: GREY_DEFAULT },
    label: {
      primary: white,
      control: tintAt(white, 80),
      secondary: tintAt(white, 65),
      tertiary: tintAt(white, 35),
    },
    background: {
      window: WINDOW_BG,
    },
    surface: SURFACE,
    fill: {
      primary: tintAt(grey, 20),
      secondary: tintAt(grey, 15),
      tertiary: tintAt(grey, 10),
      quaternary: tintAt(grey, 6),
      quinary: tintAt(grey, 4),
    },
    // `muted` dims a surface a step darker, so it derives from black rather than the grey the washes share.
    state: {
      hover: tintAt(grey, 2.5),
      selected: tintAt(grey, 5),
      muted: tintAt(black, 10),
    },
    border: {
      base: tintAt(grey, 25),
      light: tintAt(grey, 20),
      faint: tintAt(grey, 15),
    },
  },
})

globalStyle(':root', {
  vars: {
    '--shadow-base': SHADOW_BASE,
    '--shadow-strong': SHADOW_STRONG,
  },
})
export const shadowStandardVar = 'var(--shadow-base)'
export const shadowLiftVar = 'var(--shadow-strong)'

/** Opacity dims the element itself takes, unlike the state washes painted behind it. */
export const STATE_OPACITY = { ghost: '0.65', inactive: '0.55' } as const

export const vars = {
  color: {
    ...derived.color,
    system: primitive.color.system,
  },
}
