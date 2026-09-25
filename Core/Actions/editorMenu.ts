import { z } from 'zod'
import type { ActionItem, LeafItem } from './menuModel'
import { HEADING_LEVELS, LIST_KINDS, type ListKind } from './gripMenu'
import type { CommandId, Commands } from './commands'
import {
  type BlockMenuAction,
  CONNECTION_ROW,
  EMBED_ROWS,
  EXTERNAL_LINK_ROW,
  insertRows,
  LIST_ROWS,
} from './blockMenu'
import { isValidLink } from '../Paths/urlPath'

/** Pushed renderer→main on selection/focus change: main cannot see CM6 state. */
/** The editor's format state as the native menu reads it, off the window. */
export const formatState = z.object({
  focused: z.boolean(),
  hasSelection: z.boolean(),
  bold: z.boolean(),
  italic: z.boolean(),
  strikethrough: z.boolean(),
  highlight: z.boolean(),
  inlineCode: z.boolean(),
  link: z.boolean(),
  connection: z.boolean(),
  // 0 = paragraph, 1–6
  heading: z.number().int().min(0).max(6),
  list: z.enum(LIST_KINDS.map((k) => k.kind) as [ListKind, ...ListKind[]]).nullable(),
  block: z.literal('quote').nullable(),
  embedSeat: z.boolean(),
  citeSeat: z.boolean(),
})
export type FormatState = z.infer<typeof formatState>

/** Menu-action strings (sent main→renderer), namespaced so other `menu:action` listeners ignore them. */
export const EDITOR_ACTION_PREFIX = 'mdpm:'

export const INSERT_LINK_ACTION = 'link:insert' as const

export type FormatChordAction = Extract<CommandId, `format:${string}`>

type EditorMenuAction =
  | BlockMenuAction
  | FormatChordAction
  | 'heading:0'
  | typeof INSERT_LINK_ACTION

type FormatFlag = FormatChordAction extends `format:${infer F}` ? F : never

const FORMAT_ROWS: readonly LeafItem<FormatChordAction>[] = [
  { label: 'Italic', action: 'format:italic' },
  { label: 'Inline Code', action: 'format:inlineCode' },
  { label: 'Bold', action: 'format:bold' },
  { label: 'Strikethrough', action: 'format:strikethrough' },
  { label: 'Highlight', action: 'format:highlight' },
  CONNECTION_ROW,
  EXTERNAL_LINK_ROW,
]

function checkedIn(s: FormatState, action: EditorMenuAction): boolean | undefined {
  const [kind, value] = action.split(':')
  switch (kind) {
    case 'heading':
      return s.heading === Number(value)
    case 'list':
      return s.list === value
    case 'format':
      return s[value as FormatFlag]
    default:
      return action === 'block:quote' ? s.block === 'quote' : undefined
  }
}

/** The editor's own block of the native right-click menu, worded and ordered as the block menu. */
export function editorContextItems(
  s: FormatState,
  commands: Commands,
  selection: string,
): ActionItem<EditorMenuAction>[] {
  const rows = (items: readonly LeafItem<EditorMenuAction>[]): LeafItem<EditorMenuAction>[] =>
    items.map((r) => ({ ...r, checked: checkedIn(s, r.action) }))
  // Offered only when the selection IS an address, which keeps it apart from Format ▸ External Link.
  const insertLink: ActionItem<EditorMenuAction>[] = isValidLink(selection)
    ? [{ label: 'Insert Link', action: INSERT_LINK_ACTION }]
    : []
  return [
    ...insertLink,
    { label: 'Insert', submenu: rows(insertRows(s.citeSeat)) },
    {
      label: 'Format',
      submenu: FORMAT_ROWS.map((r) => ({
        ...r,
        checked: checkedIn(s, r.action),
        chord: commands[r.action],
      })),
    },
    { label: 'Embed', submenu: rows(EMBED_ROWS) },
    {
      label: 'Heading',
      submenu: rows(
        HEADING_LEVELS.map(({ level, label }) => ({ label, action: `heading:${level}` })),
      ),
    },
    { label: 'Lists', submenu: rows(LIST_ROWS) },
  ]
}
