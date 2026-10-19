import type { LeafItem } from './menuModel'
import { matchKey, matchQuery, rankMatches } from '../Paths/caseFold'
import { HEADING_LEVELS, LIST_KINDS, type HeadingLevel, type ListKind } from './gripMenu'

export type LinkWrapKind = 'link' | 'linkText' | 'connection'
export type BlockFormat = 'quote' | 'code' | 'hr' | 'callout' | 'table'

export type BlockMenuAction =
  | `heading:${Exclude<HeadingLevel, 0>}`
  | `list:${ListKind}`
  | `format:${LinkWrapKind}`
  | `block:${BlockFormat}`
  | 'block:citation'
  | 'block:page'
  | 'block:webpage'

export interface BlockMenuSection {
  title: string
  rows: readonly LeafItem<BlockMenuAction>[]
}

const HEADING_ROWS: readonly LeafItem<BlockMenuAction>[] = HEADING_LEVELS.flatMap(
  ({ level, label }) =>
    level === 0 ? [] : [{ label, action: `heading:${level}`, icon: `heading-${level}` }],
)

export const LIST_ROWS: readonly LeafItem<BlockMenuAction>[] = LIST_KINDS.map(
  ({ kind, label, icon }) => ({ label, action: `list:${kind}`, icon }),
)

export const CONNECTION_ROW = {
  label: 'Connection',
  action: 'format:connection',
  icon: 'link',
} as const

export const EXTERNAL_LINK_ROW = {
  label: 'External Link',
  action: 'format:link',
  icon: 'external-link',
} as const

const LINK_ROWS: readonly LeafItem<BlockMenuAction>[] = [
  CONNECTION_ROW,
  { label: 'Markdown Link', action: 'format:linkText', icon: 'link-2' },
  EXTERNAL_LINK_ROW,
]

const INSERT_ROWS: readonly LeafItem<BlockMenuAction>[] = [
  { label: 'Blockquote', action: 'block:quote', icon: 'text-quote' },
  { label: 'Callout', action: 'block:callout', icon: 'message-square-quote' },
  { label: 'Code Block', action: 'block:code', icon: 'square-code' },
  { label: 'Table', action: 'block:table', icon: 'view-table' },
  { label: 'Horizontal Rule', action: 'block:hr', icon: 'separator-horizontal' },
]

const FOOTNOTE_ROW: LeafItem<BlockMenuAction> = {
  label: 'Footnote',
  action: 'block:citation',
  icon: 'brackets',
}

export const insertRows = (citeSeat: boolean): readonly LeafItem<BlockMenuAction>[] =>
  citeSeat ? [...INSERT_ROWS, FOOTNOTE_ROW] : INSERT_ROWS

export const EMBED_ROWS: readonly LeafItem<BlockMenuAction>[] = [
  { label: 'Internal Page', action: 'block:page', icon: 'file-text' },
  { label: 'External Link', action: 'block:webpage', icon: 'globe' },
]

const BLOCK_MENU_SECTIONS: readonly BlockMenuSection[] = [
  { title: 'Headings', rows: HEADING_ROWS },
  { title: 'Lists', rows: LIST_ROWS },
  { title: 'Link', rows: LINK_ROWS },
  { title: 'Insert', rows: insertRows(true) },
  { title: 'Embed', rows: EMBED_ROWS },
]

const BLOCK_MENU_ROWS = BLOCK_MENU_SECTIONS.flatMap((s) =>
  s.rows.map((row) => ({ title: s.title, row, key: matchKey(row.label, s.title) })),
)

/** A typed query ranks every row by its match and seats each section where its best row falls, so Enter picks the best match; an empty query lists the menu as it stands. */
export function filterBlockMenu(query: string): readonly BlockMenuSection[] {
  const q = matchQuery(query)
  if (!q) return BLOCK_MENU_SECTIONS
  const out: { title: string; rows: LeafItem<BlockMenuAction>[] }[] = []
  for (const { title, row } of rankMatches(BLOCK_MENU_ROWS, q, (r) => r.key)) {
    const section = out.find((s) => s.title === title)
    if (section) section.rows.push(row)
    else out.push({ title, rows: [row] })
  }
  return out
}
