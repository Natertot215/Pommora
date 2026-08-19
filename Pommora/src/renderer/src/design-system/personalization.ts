import type { Personalization } from '@shared/types'
import { chipColorFor } from './tokens/colorMap'
import { cellColor } from './tokens/ramp'

/** A link color resolves to its own cell, or defers to whatever it inherits — the sentinel and the
 *  absent key mean the same thing, so one helper serves both link settings. */
function linkColorCss(setting: string | undefined, inherit: string): string {
  if (!setting || setting === 'accent' || setting === 'system') return inherit
  const key = chipColorFor(setting)
  return key === 'default' ? inherit : cellColor(key)
}

/** The two link vars each setting writes, and what each falls back to. */
const LINK_VARS = {
  connectionColor: { cssVar: '--connection', inherit: 'var(--accent)' },
  externalLinkColor: { cssVar: '--link', inherit: 'var(--system-accent)' },
} as const

/** The knobs that render as a root class toggled by a boolean — a new one is an entry here. */
const ROOT_CLASSES: Partial<Record<keyof Personalization, string>> = {
  hideChevrons: 'hide-chevrons',
  outlinerLines: 'outliner-lines',
  codeblockLineCount: 'cb-line-count',
}

/** The knobs that render as a root class when the key holds one particular value — the
 *  string-valued sibling of ROOT_CLASSES, for a setting whose default writes no key at all. */
const ROOT_VALUE_CLASSES: Partial<Record<keyof Personalization, { value: string; cls: string }>> = {
  pickerSelection: { value: 'checked', cls: 'picker-checked' },
}

export function applyPersonalizationKey<K extends keyof Personalization>(
  key: K,
  value: Personalization[K],
): void {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  const link = LINK_VARS[key as keyof typeof LINK_VARS]
  if (link) {
    el.style.setProperty(link.cssVar, linkColorCss(value as string | undefined, link.inherit))
    return
  }
  // Anything with no class here has no DOM effect at this seam: accent → applyAccent;
  // defaultIcons → resolved per-render.
  const cls = ROOT_CLASSES[key]
  if (cls) el.classList.toggle(cls, value === true)
  const valued = ROOT_VALUE_CLASSES[key]
  if (valued) el.classList.toggle(valued.cls, value === valued.value)
}

export function applyPersonalization(p: Personalization): void {
  for (const key of Object.keys(LINK_VARS) as (keyof typeof LINK_VARS)[])
    applyPersonalizationKey(key, p[key])
  for (const key of Object.keys(ROOT_CLASSES) as (keyof Personalization)[])
    applyPersonalizationKey(key, p[key])
  for (const key of Object.keys(ROOT_VALUE_CLASSES) as (keyof Personalization)[])
    applyPersonalizationKey(key, p[key])
}
