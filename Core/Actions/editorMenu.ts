import { z } from 'zod'
import { capitalize } from '@pommora/uix/Utilities/capitalize'
import { type ActionItem, joinGroups, type LeafItem } from './menuModel'
import { HEADING_LEVELS, LIST_KINDS } from './gripMenu'
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
import type { ListKind } from '../MarkdownPM/Engine/detect'

/** What sits under a right-click, sent to the host as the menu is asked for; main cannot see CM6 state. */
export const editorMenuRequest = z.object({
  scope: z.enum(['page', 'lists', 'inline']),
  menu: z.enum(['live', 'resting', 'short']),
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
  block: z.enum(['quote', 'code']).nullable(),
  embedSeat: z.boolean(),
  citeSeat: z.boolean(),
  selection: z.string().nullable(),
})
export type EditorMenuRequest = z.infer<typeof editorMenuRequest>

export const PASTE_LITERAL_ACTION = 'paste:literal' as const
export const SURFACE_EDITS = {
  cut: 'edit:cut',
  copy: 'edit:copy',
  paste: 'edit:paste',
  selectAll: 'edit:selectAll',
} as const

const copyRow = (selected: boolean): ActionItem<string> => ({
  label: 'Copy',
  action: SURFACE_EDITS.copy,
  chord: 'cmd+c',
  disabled: !selected,
})

export const restingRows = (selected: boolean, canPaste: boolean): ActionItem<string>[] => [
  { label: 'Cut', action: SURFACE_EDITS.cut, chord: 'cmd+x', disabled: !selected },
  copyRow(selected),
  { label: 'Paste', action: SURFACE_EDITS.paste, chord: 'cmd+v', disabled: !canPaste },
]

export const shortRows = (selected: boolean): ActionItem<string>[] => [
  copyRow(selected),
  { label: 'Select All', action: SURFACE_EDITS.selectAll, chord: 'cmd+a' },
]

export type FormatChordAction = Extract<CommandId, `format:${string}`>

type EditorMenuAction =
  | BlockMenuAction
  | FormatChordAction
  | 'heading:0'
  | 'link:insert'
  | `${Paint}:${PaintColor}`
  | 'highlight:accent'

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
  const accent: LeafItem<EditorMenuAction> = {
    label: 'Accent',
    action: 'highlight:accent',
    checked: lit === 'accent',
    chord: commands['format:highlight'],
  }
  return joinGroups([paint === 'highlight' ? [accent] : [], colors])
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
    case 'block':
      return value === 'quote' || value === 'code' ? s.block === value : undefined
    default:
      return undefined
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
    case 'lists':
      return [...insertLink, lists, format]
    case 'inline':
      return [...insertLink, format]
  }
}
