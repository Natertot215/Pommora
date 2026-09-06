// Every color value the app declares; nothing else in Core, UIX or Desktop states one. A PLAIN module (not a *.css.ts) both so it can export functions and so the main process — which reads neither renderer CSS vars nor a vanilla-extract token — shares the constants the tokens are built from.

/** The base system palette: the single source for every derived tone. */
export const SYSTEM = {
  grey: '#71717A',
  white: '#E8E8E8',
  black: '#010101',
} as const

export const SURFACE = {
  primary: '#202022',
  secondary: '#2A2A2E',
  tertiary: '#3A3A3E',
} as const

/** The app substrate — main's BrowserWindow backgroundColor and the `background.window` token. */
export const WINDOW_BG = '#1A1A1C'

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

/** Raw sRGB white, brighter than system-white on purpose: a glass tier's specular edge is lit, not painted. */
export const PURE_WHITE = '#FFFFFF'

/** Published as `--shadow-base` / `--shadow-strong`; consume through `shadowStandardVar` / `shadowLiftVar`. */
export const SHADOW_BASE = '0 8px 25px #00000040'
export const SHADOW_STRONG = '0 12px 30px #00000065'

/** The tint ladder. Retuning a step here re-tints every surface that names it. */
export const TINT_STEPS = {
  primary: 60,
  secondary: 40,
  tertiary: 20,
  quaternary: 15,
  solid: 100,
} as const

export type TintStep = keyof typeof TINT_STEPS

/** `base` at `amount` over `into`. A named step routes through its var so the ladder stays live at
 *  runtime; a raw number is an amount no step names. */
export const mixAt = (
  base: string,
  amount: TintStep | number,
  into: string,
  space: 'srgb' | 'oklch' = 'srgb',
): string => {
  if (typeof amount === 'number' && amount >= 100) return base
  const at = typeof amount === 'number' ? `${amount}%` : `var(--tint-${amount})`
  return `color-mix(in ${space}, ${base} ${at}, ${into})`
}

export const tintAt = (base: string, amount: TintStep | number): string =>
  mixAt(base, amount, 'transparent')

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

// greyDefault is absent by construction: it lives beside SPECTRUM, not in it.
export const SOLID_COLORS = Object.keys(SPECTRUM) as SolidColor[]
type SolidColor = keyof typeof SPECTRUM

/** A ramp cell, a legacy solid name still on disk, or the sentinel naming what it inherits. */
export type ColorSetting<Inherit extends string> = CellKey | SolidColor | Inherit

/** The `accent` value in .nexus/settings.json. `'system'` follows the OS accent. */
export type AccentSetting = ColorSetting<'system'>

/** Default when settings.json omits or has an invalid `accent` — never `system`, so it always resolves. */
export const DEFAULT_ACCENT: SolidColor = 'cyan'

/** `'accent'` (default) tracks the app accent live via `--connection`; a ramp cell pins it. */
export type ConnectionColorSetting = ColorSetting<'accent'>

/** `'system'` (default) tracks the OS accent live via `--link`; a ramp cell pins it. */
export type ExternalLinkColorSetting = ColorSetting<'system'>
export type CheckboxColorSetting = ColorSetting<'accent'>
export type HighlightColorSetting = ColorSetting<'accent'>
export type CodeColorSetting = ColorSetting<'default'>
