import { createGlobalTheme, globalStyle } from '@vanilla-extract/css'
import { GREY_DEFAULT, SPECTRUM, WINDOW_BG } from '@shared/theme'

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

// base @ alpha — apply an opacity to a primitive. color-mix(… X%, transparent) is
// the project's established opacity mechanism (see tint.ts / theme-vars.css.ts),
// so a derived token references the primitive var rather than baking its hex.
const greyA = (pct: string): string =>
  `color-mix(in srgb, ${primitive.color.system.grey} ${pct}, transparent)`
const whiteA = (pct: string): string =>
  `color-mix(in srgb, ${primitive.color.system.white} ${pct}, transparent)`
const blackA = (pct: string): string =>
  `color-mix(in srgb, ${primitive.color.system.black} ${pct}, transparent)`

// Derived tokens mirrored from the Figma color collection.
const derived = createGlobalTheme(':root', {
  color: {
    solid: { ...SPECTRUM, greyDefault: GREY_DEFAULT },
    // Label tones — system-white at varying opacity steps (separate from the type ramp). `control` is
    // the on-control label worn by control chrome — toolbar / subfield / editor / switches / the
    // table heading — bright but a step under primary.
    label: {
      primary: primitive.color.system.white,
      control: whiteA('80%'),
      secondary: whiteA('65%'),
      tertiary: whiteA('35%'),
      quaternary: whiteA('20%'),
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
      primary: greyA('20%'),
      secondary: greyA('15%'),
      tertiary: greyA('10%'),
      quaternary: greyA('6%'),
      quinary: greyA('4%'),
    },
    // Interaction states — system-grey washes, but for `muted`: a de-emphasis veil that dims a
    // surface a step DARKER, so it derives from system-black rather than the grey the others share.
    state: {
      hover: greyA('2.5%'),
      selected: greyA('5%'),
      muted: blackA('10%'),
    },
    // Hairlines — system-grey. `border` is the one hairline tone; `segment` is the lighter step the
    // outliner rails and segment dividers wear.
    separator: {
      border: greyA('25%'),
      segment: greyA('20%'),
    },
  },
})

// Shadows — the standard glass drop shadow, one source for every frost surface (Surface / dropdowns /
// pickers). Not a color, but this is the design-system's named-token home. Consume via `shadowStandardVar`.
globalStyle(':root', {
  vars: {
    '--shadow-standard': '0 8px 25px #00000040',
    '--shadow-lift': '0 12px 30px #00000066',
  },
})
export const shadowStandardVar = 'var(--shadow-standard)'
export const shadowLiftVar = 'var(--shadow-lift)'

// Opacity dims worn by the element itself, unlike the state washes painted behind it.
export const STATE_OPACITY = { drag: '0.85', ghost: '0.65', inactive: '0.55' } as const
export const BANNER_SHADOW = '#0000008c'

// One token object: primitives under `color.system`, everything else alongside.
export const vars = {
  color: {
    ...derived.color,
    system: primitive.color.system,
  },
}
