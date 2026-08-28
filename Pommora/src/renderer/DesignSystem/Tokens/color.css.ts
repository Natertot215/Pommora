import { createGlobalTheme, globalStyle } from '@vanilla-extract/css'
import { GREY_DEFAULT, SPECTRUM, WINDOW_BG } from '@shared/theme'
import { tintAt } from './tint'

// Primitives — the base system palette. Grey/white/black are the single source for
// every derived tone: labels are system-white at an opacity, fills and separators are
// system-grey at one, and the states are grey washes but for the muted veil, which
// darkens from system-black.
const primitive = createGlobalTheme(':root', {
  color: {
    system: {
      grey: '#71717A',
      white: '#E8E8E8',
      black: '#010101',
    },
  },
})

// Each token's share is its own; the named ladder in `tint.ts` is for what a surface tints on purpose.
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
    // The app substrate — the base background's single source: @shared/theme WINDOW_BG, so the Electron window + this token never drift.
    background: {
      window: WINDOW_BG,
    },
    // Content surfaces layered on the window.
    surface: {
      primary: '#202022',
      secondary: '#2A2A2E',
      tertiary: '#3A3A3E',
    },
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

// Shadows — the standard glass drop shadow, one source for every frost surface (Surface / dropdowns /
// pickers). Not a color, but this is the design-system's named-token home. Consume via `shadowStandardVar`.
globalStyle(':root', {
  vars: {
    '--shadow-base': '0 8px 25px #00000040',
    '--shadow-strong': '0 12px 30px #00000065',
  },
})
export const shadowStandardVar = 'var(--shadow-base)'
export const shadowLiftVar = 'var(--shadow-strong)'

// Opacity dims worn by the element itself, unlike the state washes painted behind it.
export const STATE_OPACITY = { drag: '0.85', ghost: '0.65', inactive: '0.55' } as const

// One token object: primitives under `color.system`, everything else alongside.
export const vars = {
  color: {
    ...derived.color,
    system: primitive.color.system,
  },
}
