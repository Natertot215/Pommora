import type { ListKind } from './gripMenu'

// The editor context-menu contract. The renderer computes the editor's active formatting state
// (from CM6's EditorState — Electron's static menu params can't see it) and pushes it to main;
// main builds the native menu, reading the last pushed state at popup time. A chosen Pommora item
// dispatches a namespaced action back over the `menu:action` channel; the renderer applies the edit.

/** What the menu needs to render checkmarks/radios. Pushed renderer→main on selection/focus change. */
export interface FormatState {
  /** The CM editor (not the title/rename field) holds focus — gates the Pommora formatting submenus. */
  focused: boolean
  hasSelection: boolean
  bold: boolean
  italic: boolean
  strikethrough: boolean
  inlineCode: boolean
  link: boolean
  connection: boolean
  heading: number // 0 = paragraph, 1–6
  list: ListKind | null
  block: 'quote' | null
}

/** Menu-action strings (sent main→renderer), namespaced so other `menu:action` listeners ignore them. */
export const EDITOR_ACTION_PREFIX = 'mdpm:'

/** Turn a selected bare address into a link pointing at itself. Named once, because main decides
 *  whether to offer it and the renderer decides what it writes. */
export const INSERT_LINK_ACTION = 'link:insert'

/** The formatting chords, declared once. A chord is one fact with two spellings: Electron wants
 *  `CmdOrCtrl+Shift+X`, CodeMirror wants `Mod-Shift-x`. Each side formats this map rather than
 *  restating the keys, so the menu can never display a shortcut the editor doesn't bind — the
 *  pattern `bridge.ts` already models for IPC.
 *
 *  A chord is `[modifiers, key]`: `mod` is ⌘ on macOS and Ctrl elsewhere. */
export const FORMAT_CHORDS = {
  'format:bold': { shift: false, key: 'b' },
  'format:italic': { shift: false, key: 'i' },
  'format:strikethrough': { shift: true, key: 'x' },
  'format:inlineCode': { shift: false, key: 'e' },
  'format:link': { shift: false, key: 'k' },
  'format:connection': { shift: true, key: 'k' },
} as const satisfies Record<string, { shift: boolean; key: string }>

export type FormatChordAction = keyof typeof FORMAT_CHORDS

/** The chord as Electron writes an accelerator — display-only in the context menu. */
export function acceleratorFor(action: FormatChordAction): string {
  const { shift, key } = FORMAT_CHORDS[action]
  return `CmdOrCtrl+${shift ? 'Shift+' : ''}${key.toUpperCase()}`
}

/** The chord as CodeMirror writes a key binding — the side that actually binds it. */
export function keyBindingFor(action: FormatChordAction): string {
  const { shift, key } = FORMAT_CHORDS[action]
  return `Mod-${shift ? 'Shift-' : ''}${key}`
}
