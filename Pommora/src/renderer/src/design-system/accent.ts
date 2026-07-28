import { DEFAULT_ACCENT, type AccentSetting } from '@shared/types'
import { vars } from './tokens'

/** There is no separate "accent" color — it's always one of the spectrum solids. */
export function accentValue(setting: AccentSetting, systemColor: string | null): string {
  if (setting === 'system') return systemColor ?? vars.color.solid[DEFAULT_ACCENT]
  return vars.color.solid[setting]
}

/** `--accent-fill` / `--accent-text` are color-mix derivations of `--accent` (theme-vars.css.ts), so setting this one property recolors every accented surface. */
export function applyAccent(setting: AccentSetting, systemColor: string | null): void {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty('--accent', accentValue(setting, systemColor))
}

/** Independent of the Pommora `--accent` setting. External `[text](url)` links bind to `--system-accent`; internal connections bind to `--accent`. */
export function applySystemAccent(systemColor: string | null): void {
  if (typeof document === 'undefined') return
  const value = systemColor ?? readCssAccentColor() ?? vars.color.solid[DEFAULT_ACCENT]
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
