import { z } from 'zod'
import { capitalize } from '@pommora/uix/Utilities/capitalize'
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
import { HIGHLIGHT_COLOR_NAMES, type HighlightColor } from '../MarkdownPM/Engine/highlightColors'

/** What sits under a right-click, sent to the host as the menu is asked for; main cannot see CM6 state. */
export const editorMenuRequest = z.object({
  scope: z.enum(['page', 'cell', 'text']),
  x: z.number(),
  y: z.number(),
  bold: z.boolean(),
  italic: z.boolean(),
  strikethrough: z.boolean(),
  highlight: z
    .enum(['accent', ...HIGHLIGHT_COLOR_NAMES] as ['accent', ...HighlightColor[]])
    .nullable(),
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
export type EditorMenuRequest = z.infer<typeof editorMenuRequest>

export const INSERT_LINK_ACTION = 'link:insert' as const
export const PASTE_PLAIN_ACTION = 'paste:plain' as const

export type FormatChordAction = Extract<CommandId, `format:${string}`>

type EditorMenuAction =
  | BlockMenuAction
  | FormatChordAction
  | 'heading:0'
  | typeof INSERT_LINK_ACTION
  | `highlight:${HighlightColor}`

type FormatFlag = Exclude<FormatChordAction extends `format:${infer F}` ? F : never, 'highlight'>

const MARK_ROWS: readonly LeafItem<FormatChordAction>[] = [
  { label: 'Italic', action: 'format:italic' },
  { label: 'Inline Code', action: 'format:inlineCode' },
  { label: 'Bold', action: 'format:bold' },
  { label: 'Strikethrough', action: 'format:strikethrough' },
]
const LINK_ROWS: readonly LeafItem<FormatChordAction>[] = [CONNECTION_ROW, EXTERNAL_LINK_ROW]

/** The accent is the bare `==`, so it carries the highlight chord; a checked row clicked again removes the highlight. */
function highlightRows(s: EditorMenuRequest, commands: Commands): LeafItem<EditorMenuAction>[] {
  return [
    {
      label: 'Accent',
      action: 'format:highlight',
      checked: s.highlight === 'accent',
      chord: commands['format:highlight'],
    },
    ...HIGHLIGHT_COLOR_NAMES.map(
      (color, i): LeafItem<EditorMenuAction> => ({
        label: capitalize(color),
        action: `highlight:${color}`,
        checked: s.highlight === color,
        separatorBefore: i === 0,
      }),
    ),
  ]
}

/** Offered only over a highlight, seated with the edit items rather than in the formatting block. */
export function changeColorItems(
  s: EditorMenuRequest,
  commands: Commands,
): ActionItem<EditorMenuAction>[] {
  return s.highlight ? [{ label: 'Change Color', submenu: highlightRows(s, commands) }] : []
}

function checkedIn(s: EditorMenuRequest, action: EditorMenuAction): boolean | undefined {
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
  s: EditorMenuRequest,
  commands: Commands,
  selection: string,
): ActionItem<EditorMenuAction>[] {
  const rows = (items: readonly LeafItem<EditorMenuAction>[]): LeafItem<EditorMenuAction>[] =>
    items.map((r) => ({ ...r, checked: checkedIn(s, r.action) }))
  // Offered only when the selection IS an address, which keeps it apart from Format ▸ External Link.
  const insertLink: ActionItem<EditorMenuAction>[] = isValidLink(selection)
    ? [{ label: 'Insert Link', action: INSERT_LINK_ACTION }]
    : []
  const insert = { label: 'Insert', submenu: rows(insertRows(s.citeSeat)) }
  const formatRows = (items: readonly LeafItem<FormatChordAction>[]) =>
    items.map((r) => ({ ...r, checked: checkedIn(s, r.action), chord: commands[r.action] }))
  const format = {
    label: 'Format',
    submenu: [
      ...formatRows(MARK_ROWS),
      { label: 'Highlight', submenu: highlightRows(s, commands) },
      ...formatRows(LINK_ROWS),
    ],
  }
  const embed = { label: 'Embed', submenu: rows(EMBED_ROWS) }
  const heading = {
    label: 'Heading',
    submenu: rows(
      HEADING_LEVELS.map(({ level, label }) => ({ label, action: `heading:${level}` })),
    ),
  }
  const lists = { label: 'Lists', submenu: rows(LIST_ROWS) }
  switch (s.scope) {
    case 'page':
      return [...insertLink, lists, insert, format, embed, heading]
    case 'cell':
      return [...insertLink, lists, format]
    case 'text':
      return [...insertLink, format]
  }
}
