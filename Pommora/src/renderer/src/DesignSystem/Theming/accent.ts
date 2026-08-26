import { DEFAULT_ACCENT, type AccentSetting } from '@shared/types'
import { labelColorFor } from '../Tokens/colorMap'
import { ANCHOR_CELLS, cellColor } from '../Tokens/ramp'

/** There is no separate "accent" color — it's always a cell of the ramp, resolved the same way a
 *  chip resolves one, so a legacy solid name and a stepped key both land on their own color. */
const accentCell = (setting: string): string => {
  const key = labelColorFor(setting)
  return cellColor(key === 'default' ? ANCHOR_CELLS[DEFAULT_ACCENT] : key)
}

export function accentValue(setting: AccentSetting, systemColor: string | null): string {
  if (setting === 'system') return systemColor ?? accentCell(DEFAULT_ACCENT)
  return accentCell(setting)
}

/** `--accent-fill` is a color-mix derivation of `--accent` (theme-vars.css.ts), so setting this one property recolors every accented surface. */
export function applyAccent(setting: AccentSetting, systemColor: string | null): void {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty('--accent', accentValue(setting, systemColor))
}

/** Independent of the `--accent` setting. External `[text](url)` links bind to `--system-accent`; internal connections bind to `--accent`. */
export function applySystemAccent(systemColor: string | null): void {
  if (typeof document === 'undefined') return
  const value = systemColor ?? readCssAccentColor() ?? accentCell(DEFAULT_ACCENT)
  document.documentElement.style.setProperty('--system-accent', value)
}

/** Fallback for contexts without Electron's native accent (e.g. the showcase). */
export function readCssAccentColor(): string | null {
  if (typeof document === 'undefined') return null
  const probe = document.createElement('span')
  probe.style.color = 'AccentColor'
  document.body.appendChild(probe)
  const rgb = getComputedStyle(probe).color
  probe.remove()
  return rgb || null
}
