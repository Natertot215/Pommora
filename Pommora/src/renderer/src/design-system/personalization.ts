import type { ConnectionColorSetting, Personalization } from '@shared/types'
import { vars } from './tokens'

function connectionColorCss(setting: ConnectionColorSetting | undefined): string {
  return !setting || setting === 'accent' ? 'var(--accent)' : vars.color.solid[setting]
}

export function applyPersonalizationKey<K extends keyof Personalization>(
  key: K,
  value: Personalization[K],
): void {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  switch (key) {
    case 'connectionColor':
      el.style.setProperty(
        '--connection',
        connectionColorCss(value as ConnectionColorSetting | undefined),
      )
      return
    case 'hideChevrons':
      el.classList.toggle('hide-chevrons', value === true)
      return
    case 'outlinerLines':
      el.classList.toggle('outliner-lines', value === true)
      return
    case 'codeblockLineCount':
      el.classList.toggle('cb-line-count', value === true)
      return
    default: // accent → applyAccent; defaultIcons → resolved per-render — no DOM effect here.
      return
  }
}

export function applyPersonalization(p: Personalization): void {
  applyPersonalizationKey('connectionColor', p.connectionColor)
  applyPersonalizationKey('hideChevrons', p.hideChevrons)
  applyPersonalizationKey('outlinerLines', p.outlinerLines)
  applyPersonalizationKey('codeblockLineCount', p.codeblockLineCount)
}
