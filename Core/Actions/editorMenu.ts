import { z } from 'zod'
import { capitalize } from '@pommora/uix/Utilities/capitalize'
import { type ActionItem, joinGroups, type LeafItem } from './menuModel'
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
import {
  colorsOf,
  PAINT_COLOR_NAMES,
  PAINTS,
  type Paint,
  type PaintColor,
} from '../MarkdownPM/Engine/paints'

/** What sits under a right-click, sent to the host as the menu is asked for; main cannot see CM6 state. */
export const editorMenuRequest = z.object({
  scope: z.enum(['page', 'cell', 'text']),
  x: z.number(),
  y: z.number(),
  bold: z.boolean(),
  italic: z.boolean(),
  strikethrough: z.boolean(),
  painted: z
    .object({
      paint: z.enum(PAINTS),
      color: z.enum(['accent', ...PAINT_COLOR_NAMES] as ['accent', ...PaintColor[]]),
    })
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
  resting: z.object({ selection: z.string() }).nullable(),
})
export type EditorMenuRequest = z.infer<typeof editorMenuRequest>

export const PASTE_LITERAL_ACTION = 'paste:literal' as const
export const RESTING_EDITS = { cut: 'edit:cut', copy: 'edit:copy', paste: 'edit:paste' } as const

export function restingEditItems(selected: boolean, canPaste: boolean): ActionItem<string>[] {
  return [
    { label: 'Cut', action: RESTING_EDITS.cut, chord: 'cmd+x', disabled: !selected },
    { label: 'Copy', action: RESTING_EDITS.copy, chord: 'cmd+c', disabled: !selected },
    { label: 'Paste', action: RESTING_EDITS.paste, chord: 'cmd+v', disabled: !canPaste },
  ]
}

export type FormatChordAction = Extract<CommandId, `format:${string}`>

type EditorMenuAction =
  | BlockMenuAction
  | FormatChordAction
  | 'heading:0'
  | 'link:insert'
  | `${Paint}:${PaintColor}`

type FormatFlag = Exclude<FormatChordAction extends `format:${infer F}` ? F : never, 'highlight'>

const MARK_ROWS: readonly LeafItem<FormatChordAction>[] = [
  { label: 'Italic', action: 'format:italic' },
  { label: 'Inline Code', action: 'format:inlineCode' },
  { label: 'Bold', action: 'format:bold' },
  { label: 'Strikethrough', action: 'format:strikethrough' },
]
const LINK_ROWS: readonly LeafItem<FormatChordAction>[] = [CONNECTION_ROW, EXTERNAL_LINK_ROW]

/** Each paint's rows, and Change Color's: only a highlight has the accent, the bare `==` on its chord, set apart above the colors. */
function colorRows(
  paint: Paint,
  s: EditorMenuRequest,
  commands: Commands,
): ActionItem<EditorMenuAction>[] {
  const lit = s.painted?.paint === paint ? s.painted.color : null
  const colors = colorsOf(paint).map(
    (color): LeafItem<EditorMenuAction> => ({
      label: capitalize(color),
      action: `${paint}:${color}`,
      checked: lit === color,
    }),
  )
  if (paint === 'textColor') return colors
  return joinGroups([
    [
      {
        label: 'Accent',
        action: 'format:highlight',
        checked: lit === 'accent',
        chord: commands['format:highlight'],
      },
    ],
    colors,
  ])
}

/** Offered over a painted span, with its own paint's rows, seated with the edit items rather than in the formatting block. */
export function changeColorItems(
  s: EditorMenuRequest,
  commands: Commands,
): ActionItem<EditorMenuAction>[] {
  return s.painted
    ? [{ label: 'Change Color', submenu: colorRows(s.painted.paint, s, commands) }]
    : []
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
    ? [{ label: 'Insert Link', action: 'link:insert' }]
    : []
  const insert = { label: 'Insert', submenu: rows(insertRows(s.citeSeat)) }
  const formatRows = (items: readonly LeafItem<FormatChordAction>[]) =>
    items.map((r) => ({ ...r, checked: checkedIn(s, r.action), chord: commands[r.action] }))
  const format = {
    label: 'Format',
    submenu: [
      ...formatRows(MARK_ROWS),
      { label: 'Text Color', submenu: colorRows('textColor', s, commands) },
      { label: 'Highlight', submenu: colorRows('highlight', s, commands) },
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
