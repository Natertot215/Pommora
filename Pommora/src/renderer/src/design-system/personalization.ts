import {
  EDITOR_SCALE_DEFAULT,
  EMBED_SCALE_DEFAULT,
  type Personalization,
  coerceScale,
  embedZoom,
  viewEmbedZoom,
} from '@shared/types'
import { chipColorFor } from './tokens/colorMap'
import { cellColor, checkboxTint } from './tokens/ramp'

/** A color setting resolves to its own cell, or defers to whatever it inherits — the sentinel and
 *  the absent key mean the same thing, so one helper serves every one of them. */
function settingColorCss(setting: string | undefined, inherit: string): string {
  if (!setting || setting === 'accent' || setting === 'system') return inherit
  const key = chipColorFor(setting)
  return key === 'default' ? inherit : cellColor(key)
}

/** The var each color setting writes, and what it falls back to when nothing is chosen. A setting
 *  resolving to ONE color belongs here; the checkbox resolves to three and is applied below. */
const COLOR_VARS = {
  connectionColor: { cssVar: '--connection', inherit: 'var(--accent)' },
  externalLinkColor: { cssVar: '--link', inherit: 'var(--system-accent)' },
} as const

/** The three vars a chosen checkbox cell writes. Cleared, all three are REMOVED rather than set to
 *  an accent copy — the stylesheet's own fallbacks are the accent recipe, so an unset var is what
 *  keeps the box following the accent as it changes. */
const CHECKBOX_VARS = ['--checkbox-fill', '--checkbox-border', '--checkbox-mark'] as const

function applyCheckboxColor(el: HTMLElement, value: unknown): void {
  const setting = value as string | undefined
  const key = setting && setting !== 'accent' ? chipColorFor(setting) : 'default'
  if (key === 'default') {
    for (const v of CHECKBOX_VARS) el.style.removeProperty(v)
    return
  }
  // The chip's own resolution, greyscale row included — a grey cell has no chroma to outline itself
  // with, and painting its raw color would leave the dark end invisible against the page.
  const { background, borderColor, color } = checkboxTint(key)
  el.style.setProperty('--checkbox-fill', background)
  el.style.setProperty('--checkbox-border', borderColor)
  el.style.setProperty('--checkbox-mark', color)
}

/** The knobs that render as a root class toggled by a boolean — a new one is an entry here. */
const ROOT_CLASSES: Partial<Record<keyof Personalization, string>> = {
  hideChevrons: 'hide-chevrons',
  outlinerLines: 'outliner-lines',
  codeblockLineCount: 'cb-line-count',
  plainUnresolvedLinks: 'plain-unresolved',
  muteCheckedItems: 'mute-checked',
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
  if (key === 'embedScale') {
    const scale = coerceScale(value, EMBED_SCALE_DEFAULT)
    el.style.setProperty('--embed-zoom', String(embedZoom(scale)))
    el.style.setProperty('--view-embed-zoom', String(viewEmbedZoom(scale)))
    return
  }
  if (key === 'editorScale') {
    el.style.setProperty('--editor-scale', String(coerceScale(value, EDITOR_SCALE_DEFAULT)))
    return
  }
  if (key === 'checkboxColor') {
    applyCheckboxColor(el, value)
    return
  }
  const color = COLOR_VARS[key as keyof typeof COLOR_VARS]
  if (color) {
    el.style.setProperty(color.cssVar, settingColorCss(value as string | undefined, color.inherit))
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
  applyPersonalizationKey('embedScale', p.embedScale)
  applyPersonalizationKey('editorScale', p.editorScale)
  applyPersonalizationKey('checkboxColor', p.checkboxColor)
  for (const table of [COLOR_VARS, ROOT_CLASSES, ROOT_VALUE_CLASSES])
    for (const key of Object.keys(table) as (keyof Personalization)[])
      applyPersonalizationKey(key, p[key])
}
