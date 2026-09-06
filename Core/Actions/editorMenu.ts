import type { ListKind } from './gripMenu'

/** Pushed renderer→main on selection/focus change: main cannot see CM6 state. */
export interface FormatState {
  focused: boolean
  hasSelection: boolean
  bold: boolean
  italic: boolean
  strikethrough: boolean
  highlight: boolean
  inlineCode: boolean
  link: boolean
  connection: boolean
  heading: number // 0 = paragraph, 1–6
  list: ListKind | null
  block: 'quote' | null
  embedSeat: boolean
  citeSeat: boolean
}

/** Menu-action strings (sent main→renderer), namespaced so other `menu:action` listeners ignore them. */
export const EDITOR_ACTION_PREFIX = 'mdpm:'

export const INSERT_LINK_ACTION = 'link:insert'

/** Both sides format this map rather than restating keys, so the menu can't show a chord the editor doesn't bind. */
export const FORMAT_CHORDS = {
  'format:bold': { shift: false, key: 'b' },
  'format:italic': { shift: false, key: 'i' },
  'format:strikethrough': { shift: true, key: 'x' },
  'format:highlight': { shift: false, key: 'l' },
  'format:inlineCode': { shift: false, key: 'e' },
  'format:link': { shift: false, key: 'k' },
  'format:connection': { shift: true, key: 'k' },
} as const satisfies Record<string, { shift: boolean; key: string }>

export type FormatChordAction = keyof typeof FORMAT_CHORDS

export function keyBindingFor(action: FormatChordAction): string {
  const { shift, key } = FORMAT_CHORDS[action]
  return `Mod-${shift ? 'Shift-' : ''}${key}`
}
