import type { ListKind } from './gripMenu'
import { type CommandId, type Commands, toKeyBinding } from './commands'

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

export type FormatChordAction = Extract<CommandId, `format:${string}`>

export function keyBindingFor(commands: Commands, action: FormatChordAction): string {
  return toKeyBinding(commands[action])
}
