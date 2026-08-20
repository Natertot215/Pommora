import type { PasteAsForm, PASTE_AS_PREFIX } from './PasteAsMenu'
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

// The editor menu's own vocabulary. Each `as const` array drives both the TS type and the runtime
// membership test the renderer resolves an incoming action through — the idiom the view enums
// already follow, and the reason main can no longer name a row the editor has no branch for.

/** Every heading level a document may hold. `gripMenu`'s HEADING_LEVELS is the ladder a menu
 *  OFFERS, which stops at H5 — this is what the format functions accept, and it types that ladder
 *  so the two can't drift apart. */
export const DOC_HEADING_LEVELS = [0, 1, 2, 3, 4, 5, 6] as const
export type HeadingLevel = (typeof DOC_HEADING_LEVELS)[number]

export const BLOCK_FORMATS = ['quote', 'code', 'hr', 'callout', 'table'] as const
export type BlockFormat = (typeof BLOCK_FORMATS)[number]

/** The list kinds the menu offers. A subset of `ListKind` on purpose: an arrow item is reachable by
 *  typing and by the grip, and the menu has never carried it. */
export const EDITOR_LIST_KINDS = [
  'bullet',
  'ordered',
  'checkbox',
] as const satisfies readonly ListKind[]
export type EditorListKind = (typeof EDITOR_LIST_KINDS)[number]

/** The two openers that type a syntax and hand off rather than making a format edit — they share
 *  the `block:` group with the formats above but are not among them, which is why the renderer
 *  intercepts them before it resolves an edit. */
export const EDITOR_EMBED_ACTIONS = ['block:page', 'block:webpage'] as const
export type EditorEmbedAction = (typeof EDITOR_EMBED_ACTIONS)[number]

/** Everything main may dispatch to the editor, after the `mdpm:` prefix. */
export type EditorMenuAction =
  | FormatChordAction
  | `heading:${HeadingLevel}`
  | `block:${BlockFormat}`
  | EditorEmbedAction
  | `list:${EditorListKind}`
  | typeof INSERT_LINK_ACTION
  | `${typeof PASTE_AS_PREFIX}${PasteAsForm}`

/** The inline formats, which are also exactly the actions that carry a chord. */
export const INLINE_FORMATS = [
  'bold',
  'italic',
  'strikethrough',
  'inlineCode',
  'link',
  'connection',
] as const
export type InlineFormat = (typeof INLINE_FORMATS)[number]

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
  // Keyed by the inline formats above, so a format without a chord — or a chord naming a format
  // that doesn't exist — is a compile error rather than a menu row bound to nothing.
} as const satisfies Record<`format:${InlineFormat}`, { shift: boolean; key: string }>

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
