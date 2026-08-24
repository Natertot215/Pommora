import {
  EDITOR_SCALE_DEFAULT,
  EMBED_SCALE_DEFAULT,
  type Personalization,
  coerceScale,
  embedZoom,
  viewEmbedZoom,
} from '@shared/types'
import type { CellKey } from '@shared/theme'
import { labelColorFor } from '../Tokens/colorMap'
import { cellColor, checkboxTint } from '../Tokens/ramp'

/** The ramp cell a color setting names, or null when it defers. Every sentinel — `accent`,
 *  `system`, `default` — and the absent key alike read as no cell, which `labelColorFor` already
 *  answers for: naming them again here would be a second roster to keep in step with the first. */
function settingCell(setting: unknown): CellKey | null {
  const key = typeof setting === 'string' ? labelColorFor(setting) : 'default'
  return key === 'default' ? null : key
}

/** A color setting as CSS: its own cell, or whatever it inherits — `null` for a setting whose
 *  deferral is the var's ABSENCE rather than a copy of what it would inherit. */
function settingColorCss<I extends string | null>(setting: unknown, inherit: I): string | I {
  const key = settingCell(setting)
  return key === null ? inherit : cellColor(key)
}

/** What one key writes to the root element. A `null` REMOVES the var rather than setting it, for a
 *  cleared value whose stylesheet fallback is the live answer — writing a copy of that answer would
 *  freeze it where it stood. */
type VarWriter = (value: unknown) => Record<string, string | null>

/** The task checkbox's three parts, resolved through the chip's own recipe so the greyscale row
 *  arrives with the darkness offset that keeps it dark enough and the outline it borrows — a grey
 *  cell has no chroma to draw one from, and painted raw its dark end is the page it sits on. */
const checkboxVars: VarWriter = (value) => {
  const key = settingCell(value)
  if (key === null)
    return { '--checkbox-fill': null, '--checkbox-border': null, '--checkbox-mark': null }
  const { background, borderColor, color } = checkboxTint(key)
  return {
    '--checkbox-fill': background,
    '--checkbox-border': borderColor,
    '--checkbox-mark': color,
  }
}

/** The knobs that render as root vars — a scale, a color, or a family of either. */
const ROOT_VARS: Partial<Record<keyof Personalization, VarWriter>> = {
  embedScale: (v) => {
    const scale = coerceScale(v, EMBED_SCALE_DEFAULT)
    return {
      '--embed-zoom': String(embedZoom(scale)),
      '--view-embed-zoom': String(viewEmbedZoom(scale)),
    }
  },
  editorScale: (v) => ({ '--editor-scale': String(coerceScale(v, EDITOR_SCALE_DEFAULT)) }),
  connectionColor: (v) => ({ '--connection': settingColorCss(v, 'var(--accent)') }),
  externalLinkColor: (v) => ({ '--link': settingColorCss(v, 'var(--system-accent)') }),
  checkboxColor: checkboxVars,
  highlightColor: (v) => ({ '--highlight': settingColorCss(v, 'var(--accent)') }),
  // Cleared REMOVES `--code` rather than restating the theme's red: the stylesheet declares it at
  // :root, so an absent inline var is what lets the theme keep answering as it moves.
  codeColor: (v) => ({ '--code': settingColorCss(v, null) }),
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

/** The three tables are the whole roster: a key with a DOM effect belongs to exactly one, and the
 *  sweep below reads them rather than a second list naming the same keys — which is what lets a new
 *  setting be an entry rather than an entry and a line someone has to remember. */
const TABLES = [ROOT_VARS, ROOT_CLASSES, ROOT_VALUE_CLASSES] as const

export function applyPersonalizationKey<K extends keyof Personalization>(
  key: K,
  value: Personalization[K],
): void {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  const vars = ROOT_VARS[key]?.(value)
  if (vars) {
    for (const [name, v] of Object.entries(vars))
      if (v === null) el.style.removeProperty(name)
      else el.style.setProperty(name, v)
    return
  }
  // Anything in no table has no DOM effect at this seam: accent → applyAccent;
  // defaultIcons → resolved per-render.
  const cls = ROOT_CLASSES[key]
  if (cls) el.classList.toggle(cls, value === true)
  const valued = ROOT_VALUE_CLASSES[key]
  if (valued) el.classList.toggle(valued.cls, value === valued.value)
}

export function applyPersonalization(p: Personalization): void {
  for (const table of TABLES)
    for (const key of Object.keys(table) as (keyof Personalization)[])
      applyPersonalizationKey(key, p[key])
}
