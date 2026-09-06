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

// Each token's share is its own; the named ladder in `colors.ts` is for what a surface tints on purpose.
const { grey, white, black } = primitive.color.system

// Derived tokens mirrored from the Figma color collection.
const derived = createGlobalTheme(':root', {
  color: {
    solid: { ...SPECTRUM, greyDefault: GREY_DEFAULT },
    // Label tones — system-white at varying opacity steps (separate from the type ramp). `control` is
    // the on-control label worn by control chrome — toolbar / subfield / editor / switches / the
    // table heading — bright but a step under primary.
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
    // Overlay fills over a surface.
    fill: {
      primary: tintAt(grey, 20),
      secondary: tintAt(grey, 15),
      tertiary: tintAt(grey, 10),
      quaternary: tintAt(grey, 6),
      quinary: tintAt(grey, 4),
    },
    // Interaction states — system-grey washes, but for `muted`: a de-emphasis veil that dims a
    // surface a step DARKER, so it derives from system-black rather than the grey the others share.
    state: {
      hover: tintAt(grey, 2.5),
      selected: tintAt(grey, 5),
      muted: tintAt(black, 10),
    },
    // Edge colors — standalone and purposefully distinct grey tones for borders, segments, and dividers.
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

// Opacity dims worn by the element itself, unlike the state washes painted behind it.
export const STATE_OPACITY = { ghost: '0.65', inactive: '0.55' } as const

// One token object: primitives under `color.system`, everything else alongside.
export const vars = {
  color: {
    ...derived.color,
    system: primitive.color.system,
  },
}
