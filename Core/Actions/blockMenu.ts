import type { ActionItem } from './menuModel'
import { HEADING_LEVELS, type ListKind } from './gripMenu'
import type { BlockFormat, InlineFormat } from '../MarkdownPM/Input/format'

export type BlockMenuAction =
  | `heading:${1 | 2 | 3 | 4 | 5}`
  | `list:${Extract<ListKind, 'bullet' | 'ordered' | 'checkbox'>}`
  | `format:${Extract<InlineFormat, 'link' | 'linkText' | 'connection'>}`
  | `block:${BlockFormat}`
  | 'block:citation'
  | 'block:page'
  | 'block:webpage'

interface BlockMenuSection {
  title: string
  rows: readonly ActionItem<BlockMenuAction>[]
}

type BlockMenuRow = ActionItem<BlockMenuAction> & { at: number | null }

export interface BlockMenuMatch {
  title: string
  at: number | null
  rows: readonly BlockMenuRow[]
}

const HEADING_ROWS: readonly ActionItem<BlockMenuAction>[] = HEADING_LEVELS.slice(1).map((h) => ({
  label: h.label,
  action: `heading:${h.level}` as BlockMenuAction,
  icon: `heading-${h.level}`,
}))

const LIST_ROWS: readonly ActionItem<BlockMenuAction>[] = [
  { label: 'Bullet List', action: 'list:bullet', icon: 'list' },
  { label: 'Numbered List', action: 'list:ordered', icon: 'list-ordered' },
  { label: 'Task List', action: 'list:checkbox', icon: 'list-todo' },
]

const LINK_ROWS: readonly ActionItem<BlockMenuAction>[] = [
  { label: 'Connection', action: 'format:connection', icon: 'link' },
  { label: 'Markdown Link', action: 'format:linkText', icon: 'link-2' },
  { label: 'External Link', action: 'format:link', icon: 'external-link' },
]

const INSERT_ROWS: readonly ActionItem<BlockMenuAction>[] = [
  { label: 'Blockquote', action: 'block:quote', icon: 'text-quote' },
  { label: 'Callout', action: 'block:callout', icon: 'message-square-quote' },
  { label: 'Code Block', action: 'block:code', icon: 'square-code' },
  { label: 'Table', action: 'block:table', icon: 'table' },
  { label: 'Divider', action: 'block:hr', icon: 'separator-horizontal' },
]

const FOOTNOTE_ROW: ActionItem<BlockMenuAction> = {
  label: 'Footnote',
  action: 'block:citation',
  icon: 'brackets',
}

const EMBED_ROWS: readonly ActionItem<BlockMenuAction>[] = [
  { label: 'Internal Page', action: 'block:page', icon: 'file-text' },
  { label: 'Webpage', action: 'block:webpage', icon: 'globe' },
]

export function blockMenuSections(citeSeat: boolean): BlockMenuSection[] {
  return [
    { title: 'Headings', rows: HEADING_ROWS },
    { title: 'Lists', rows: LIST_ROWS },
    { title: 'Link', rows: LINK_ROWS },
    { title: 'Insert', rows: citeSeat ? [...INSERT_ROWS, FOOTNOTE_ROW] : INSERT_ROWS },
    { title: 'Embed', rows: EMBED_ROWS },
  ]
}

function matchAt(label: string, query: string): number | null {
  const at = label.toLowerCase().indexOf(query)
  return at === -1 ? null : at
}

export function filterBlockMenu(sections: BlockMenuSection[], query: string): BlockMenuMatch[] {
  const q = query.toLowerCase()
  const out: BlockMenuMatch[] = []
  for (const s of sections) {
    const titleAt = matchAt(s.title, q)
    const rows: BlockMenuRow[] = []
    for (const row of s.rows) {
      const at = matchAt(row.label, q)
      if (titleAt !== null || at !== null) rows.push({ ...row, at })
    }
    if (rows.length > 0) out.push({ title: s.title, at: titleAt, rows })
  }
  return out
}
