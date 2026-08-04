import type { ConnectionColorSetting, Personalization } from '@shared/types'
import { vars } from './tokens'

function connectionColorCss(setting: ConnectionColorSetting | undefined): string {
  return !setting || setting === 'accent' ? 'var(--accent)' : vars.color.solid[setting]
}

/** The knobs that render as a root class toggled by a boolean — a new one is an entry here. */
const ROOT_CLASSES: Partial<Record<keyof Personalization, string>> = {
  hideChevrons: 'hide-chevrons',
  outlinerLines: 'outliner-lines',
  codeblockLineCount: 'cb-line-count',
}

export function applyPersonalizationKey<K extends keyof Personalization>(
  key: K,
  value: Personalization[K],
): void {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  if (key === 'connectionColor') {
    el.style.setProperty(
      '--connection',
      connectionColorCss(value as ConnectionColorSetting | undefined),
    )
    return
  }
  // Anything with no class here has no DOM effect at this seam: accent → applyAccent;
  // defaultIcons → resolved per-render.
  const cls = ROOT_CLASSES[key]
  if (cls) el.classList.toggle(cls, value === true)
}

export function applyPersonalization(p: Personalization): void {
  applyPersonalizationKey('connectionColor', p.connectionColor)
  for (const key of Object.keys(ROOT_CLASSES) as (keyof Personalization)[])
    applyPersonalizationKey(key, p[key])
}
