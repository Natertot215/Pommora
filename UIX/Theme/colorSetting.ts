import { SPECTRUM, type CellKey } from './theme'

// greyDefault is absent by construction: it lives beside SPECTRUM, not in it.
export const SOLID_COLORS = Object.keys(SPECTRUM) as SolidColor[]
export type SolidColor = keyof typeof SPECTRUM

/** A deferring color setting: a ramp cell, a legacy solid name still on disk, or the sentinel
 *  naming what it inherits when the user has picked nothing. */
export type ColorSetting<Inherit extends string> = CellKey | SolidColor | Inherit

/** The `accent` value in .nexus/settings.json. `'system'` follows the OS accent. */
export type AccentSetting = ColorSetting<'system'>

/** Default when settings.json omits or has an invalid `accent` — a concrete spectrum color
 *  (never `system`) so it always resolves to a hex. */
export const DEFAULT_ACCENT: SolidColor = 'cyan'

/** The inline [[Title]] connection color. `'accent'` (default) tracks the app accent live via
 *  `--connection: var(--accent)`; a ramp cell pins it. */
export type ConnectionColorSetting = ColorSetting<'accent'>

/** The `[text](url)` color. `'system'` (default) tracks the OS accent live via
 *  `--link: var(--system-accent)`; a ramp cell pins it. */
export type ExternalLinkColorSetting = ColorSetting<'system'>
export type CheckboxColorSetting = ColorSetting<'accent'>
export type HighlightColorSetting = ColorSetting<'accent'>
export type CodeColorSetting = ColorSetting<'default'>
