import {
  HEADING_SIZE_KEYS,
  SETTING_DEFAULTS,
  type Personalization,
  coerceHeadingSize,
  coerceScale,
  embedZoom,
  viewEmbedZoom,
} from '@pommora/core/Settings/personalization'
import { cellColor, checkboxPaint, colorNameFor } from '@pommora/uix/Theme/ramp'

/** Every sentinel — `accent`, `system`, `default` — reads as no cell, which `colorNameFor` already answers for. */
function settingColorCss(setting: unknown): string | null {
  const key = typeof setting === 'string' ? colorNameFor(setting) : 'default'
  return key === 'default' ? null : cellColor(key)
}

/** A `null` REMOVES the var rather than setting it, for a cleared value whose stylesheet fallback is the live answer — writing a copy of that answer would freeze it where it stood. */
type VarWriter = (value: unknown) => Record<string, string | null>

// A size lands in em of the page text.
const headingVars: Partial<Record<keyof Personalization, VarWriter>> = {}
HEADING_SIZE_KEYS.forEach((key, i) => {
  headingVars[key] = (v) => ({
    [`--h${i + 1}-size`]: `${coerceHeadingSize(v, SETTING_DEFAULTS[key])}em`,
  })
})

const ROOT_VARS: Partial<Record<keyof Personalization, VarWriter>> = {
  embedScale: (v) => {
    const scale = coerceScale(v, SETTING_DEFAULTS.embedScale)
    return {
      '--embed-scale': String(scale),
      '--embed-zoom': String(embedZoom(scale)),
      '--view-embed-zoom': String(viewEmbedZoom(scale)),
    }
  },
  editorScale: (v) => ({ '--editor-scale': String(coerceScale(v, SETTING_DEFAULTS.editorScale)) }),
  connectionColor: (v) => ({ '--connection': settingColorCss(v) }),
  externalLinkColor: (v) => ({ '--link': settingColorCss(v) }),
  checkboxColor: (v) =>
    checkboxPaint(typeof v === 'string' ? v : undefined) ?? {
      '--checkbox-base': null,
      '--checkbox-outline': null,
    },
  highlightColor: (v) => ({ '--highlight': settingColorCss(v) }),
  codeColor: (v) => ({ '--code': settingColorCss(v) }),
  ...headingVars,
  tabMinWidth: (v) => ({ '--tab-min-user': v == null ? null : `${v}px` }),
  tabMaxWidth: (v) => ({ '--tab-max-user': v == null ? null : `${v}px` }),
}

const ROOT_CLASSES: Partial<Record<keyof Personalization, string>> = {
  hideChevrons: 'hide-chevrons',
  outlinerLines: 'outline-lines',
  codeblockLineCount: 'codeblock-line-count',
  plainUnresolvedLinks: 'plain-unresolved',
  nativeHighlight: 'native-highlight',
  muteCheckedItems: 'mute-checked',
}

/** The two tables are the whole roster: a key with a DOM effect belongs to exactly one, so a new setting is only ever an entry, never a second list to keep in step. */
const TABLES = [ROOT_VARS, ROOT_CLASSES] as const

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
  // Anything in no table has no DOM effect at this seam: accent → applyAccent; defaultIcons → resolved per-render.
  const cls = ROOT_CLASSES[key]
  if (cls) el.classList.toggle(cls, value === true)
}

export function applyPersonalization(p: Personalization): void {
  for (const table of TABLES)
    for (const key of Object.keys(table) as (keyof Personalization)[])
      applyPersonalizationKey(key, p[key])
}
