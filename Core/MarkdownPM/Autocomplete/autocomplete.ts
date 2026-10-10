import { expressibleHeading, pageEmbedText } from '../../Connections/connections'
import { normalizeTitle } from '../../Paths/caseFold'
import {
  decodeLinkTarget,
  encodeLinkTarget,
  escapeAlias,
  markdownDestinationAt,
  targetTitle,
} from '../../Connections/links'
import { NO_TRAIL, type TrailSegment } from '@pommora/uix/Elements/NavTrail'
import { type DocScan, inCodeAt } from '../Engine/docScan'
import { connectionAt, inBracket } from '../Input/edits'
import { lineIndexAt, type TextEdit } from '../Engine/markdownCode'
import type { ConnPage, PageIndex } from '../../Connections/pageIndex'
import type { OutlineHeading } from '../Engine/headingScan'
import type { EditorHost } from '../api'
import type { ConnectionsApi } from '../Links/connectionsApi'

type ConnectionForm = 'link' | 'embed' | 'alias' | 'target' | 'heading' | 'fragment' | 'section'

export interface AutocompleteQuery {
  query: string
  from: number
  to: number
  form: ConnectionForm
  title?: string
  label?: { from: number; to: number }
}

export type AcQuery = Pick<AutocompleteQuery, 'query' | 'form' | 'title'>

export type AcRow = { value: string } & (
  | { kind: 'page'; pageId: string; location: TrailSegment[] }
  | { kind: 'heading'; level: number }
  | { kind: 'alias'; forget: () => void }
)

export type HeadingRow = Extract<AcRow, { kind: 'heading' }>

/** The forms whose rows are a page's headings: a wikilink's heading half, a markdown link's fragment, and a bare section run. */
export const listsHeadings = (form: ConnectionForm): boolean =>
  form === 'heading' || form === 'fragment' || form === 'section'

export function autocompleteQuery(
  scan: DocScan,
  caret: number,
  allowEmbeds = false,
  armed?: number,
): AutocompleteQuery | null {
  if (inCodeAt(scan, caret)) return null
  const i = lineIndexAt(scan, caret)
  const line = scan.lines[i]
  const lineStart = scan.lineStarts[i]
  const rel = caret - lineStart
  if (armed !== undefined) {
    const armedRel = armed - lineStart
    if (
      armedRel >= 0 &&
      armedRel < line.length &&
      caret >= armed + 1 &&
      !inBracket(line, armedRel) &&
      !/^\s/.test(line.slice(armedRel + 1, rel))
    )
      return {
        query: line.slice(armedRel + 1, rel),
        from: armed + 1,
        to: caret,
        form: 'section',
        title: '',
      }
  }
  const s = connectionAt(scan, caret)
  if (s) {
    const title = line.slice(s.title[0], s.title[1])
    // Only the TITLE opens the page picker: accepting replaces the whole token, so a caret in the alias would arm a list keyed on the title and discard the alias on Enter.
    if (rel >= s.title[0] && rel <= s.title[1])
      return { query: title, from: lineStart + s.full[0], to: lineStart + s.full[1], form: 'link' }
    if (s.heading && rel >= s.heading[0] && rel <= s.heading[1])
      return {
        query: line.slice(s.heading[0], s.heading[1]),
        from: lineStart + s.heading[0],
        to: lineStart + s.heading[1],
        form: 'heading',
        title,
      }
    if (s.alias && rel >= s.alias[0] && rel <= s.alias[1])
      return {
        query: line.slice(s.alias[0], s.alias[1]),
        from: lineStart + s.alias[0],
        to: lineStart + s.alias[1],
        form: 'alias',
        title,
      }
  }
  // An in-progress link has an EMPTY target and the grammar above requires a character, so it can never answer for what ⌘K writes.
  const md = markdownDestinationAt(line, rel)
  if (md) {
    const { dest, fragment } = md
    const label = { from: lineStart + md.label[0], to: lineStart + md.label[1] }
    const pageEnd = fragment ? fragment[0] - 1 : dest[1]
    // As with a wikilink, the page half queries alone, an empty one before a fragment asks nothing, and a retarget replaces the fragment with the rest.
    if (!fragment || (rel <= pageEnd && pageEnd > dest[0]))
      return {
        query: decodeLinkTarget(line.slice(dest[0], pageEnd)),
        from: lineStart + dest[0],
        to: lineStart + dest[1],
        form: 'target',
        label,
      }
    return {
      query: decodeLinkTarget(line.slice(fragment[0], fragment[1])),
      from: lineStart + fragment[0],
      to: lineStart + fragment[1],
      form: 'fragment',
      title: targetTitle(line.slice(dest[0], pageEnd)) ?? '',
      label,
    }
  }
  if (allowEmbeds) {
    for (let idx = line.indexOf('![['); idx !== -1; idx = line.indexOf('![[', idx + 3)) {
      const contentStart = idx + 3
      const closeIdx = line.indexOf(']]', contentStart)
      const contentEnd = closeIdx === -1 ? line.length : closeIdx
      const spanEnd = closeIdx === -1 ? line.length : closeIdx + 2
      if (rel >= contentStart && rel <= contentEnd)
        return {
          query: line.slice(contentStart, contentEnd),
          from: lineStart + idx,
          to: lineStart + spanEnd,
          form: 'embed',
        }
    }
  }
  return null
}

export const pageRow = (p: ConnPage, conn: ConnectionsApi): AcRow => ({
  kind: 'page',
  value: p.title,
  pageId: p.id,
  location: conn.location?.(p.id) ?? NO_TRAIL,
})

export function headingRows(outline: readonly OutlineHeading[], query: string): HeadingRow[] {
  const q = normalizeTitle(query)
  const seen = new Set<string>()
  return outline
    .filter((h) => {
      const key = normalizeTitle(h.text)
      if (!key.startsWith(q) || seen.has(key) || !expressibleHeading(h.text)) return false
      seen.add(key)
      return true
    })
    .map((h): HeadingRow => ({ kind: 'heading', value: h.text, level: h.level }))
}

// The rows a collapsed heading hides: everything deeper than it, up to the next heading at its level or above.
export function openHeadingRows(
  rows: readonly HeadingRow[],
  collapsed: ReadonlySet<string>,
): HeadingRow[] {
  const out: HeadingRow[] = []
  let hiddenBelow: number | null = null
  for (const row of rows) {
    if (hiddenBelow !== null && row.level > hiddenBelow) continue
    hiddenBelow = collapsed.has(row.value) ? row.level : null
    out.push(row)
  }
  return out
}

export function aliasRows(
  conn: PageIndex,
  aliases: EditorHost['aliases'],
  title: string | undefined,
  query: string,
): AcRow[] {
  if (!title) return []
  const res = conn.resolve(title)
  const page = res.status === 'resolved' ? res.page : null
  if (!page) return []
  const q = normalizeTitle(query)
  return aliases
    .list(page.id)
    .filter((a) => normalizeTitle(a).startsWith(q))
    .slice(0, AC_MAX)
    .map(
      (a): AcRow => ({
        kind: 'alias',
        value: a,
        forget: () => aliases.forget(page.id, a),
      }),
    )
}

/** A carried `alias` rides only the link form — `![[ ]]` has no alias syntax, and the alias form writes into a link that already exists. */
function formSyntax(value: string, form: ConnectionForm, alias?: string): string {
  switch (form) {
    case 'alias':
    case 'heading':
    case 'section':
      return value
    case 'target':
    case 'fragment':
      return encodeLinkTarget(value)
    case 'embed':
      return pageEmbedText(value)
    case 'link':
      return alias ? `[[${value}|${alias}]]` : `[[${value}]]`
  }
}

export function connectionInsert(
  value: string,
  from: number,
  form: ConnectionForm = 'link',
  alias?: string,
): { insert: string; caret: number } {
  const insert = formSyntax(value, form, alias)
  return { insert, caret: from + insert.length }
}

interface CommitEdit {
  changes: TextEdit[]
  opensAlias?: boolean
  opensHeading?: boolean
  anchor: number
}

export function commitEdit(
  ac: AutocompleteQuery,
  value: string,
  opts: { keepAlias?: string; openAlias?: boolean; openHeading?: boolean } = {},
): CommitEdit {
  // Opening the heading slot writes an empty fragment and slides the pane in, rather than finishing the link.
  if (ac.form === 'link' && opts.openHeading) {
    const text = `[[${value}#]]`
    return {
      changes: [{ from: ac.from, to: ac.to, insert: text }],
      anchor: ac.from + text.length - 2,
      opensHeading: true,
    }
  }
  // Opening the alias slot rather than finishing the link lets the picker hand those names straight back. Governed by `aliasPickerOnCommit`.
  if (ac.form === 'link' && opts.openAlias) {
    const text = `[[${value}|]]`
    return {
      changes: [{ from: ac.from, to: ac.to, insert: text }],
      anchor: ac.from + text.length - 2,
      opensAlias: true,
    }
  }
  // The heading span is the only text the query owns, so the slot opens by appending the pipe to the heading.
  if (ac.form === 'heading' && opts.openAlias) {
    const text = `${value}|`
    return {
      changes: [{ from: ac.from, to: ac.to, insert: text }],
      anchor: ac.from + text.length,
      opensAlias: true,
    }
  }
  const { insert, caret } = connectionInsert(value, ac.from, ac.form, opts.keepAlias)
  // Bare text, no wrapping syntax to land inside of — the anchor sits right after the heading itself.
  if (ac.form === 'section')
    return { changes: [{ from: ac.from, to: ac.to, insert }], anchor: caret }
  if (ac.form === 'alias' || ac.form === 'heading')
    return { changes: [{ from: ac.from, to: ac.to, insert }], anchor: caret + 2 }
  // The anchor steps one past what was written: the `)` that finishes the link, or the `#` the heading slot opens behind.
  if (ac.form === 'target' || ac.form === 'fragment') {
    const retarget = { from: ac.from, to: ac.to, insert: opts.openHeading ? `${insert}#` : insert }
    const fill = ac.label && ac.label.from === ac.label.to ? ac.label : null
    const label = fill ? escapeAlias(value) : ''
    return {
      changes: fill ? [{ from: fill.from, to: fill.to, insert: label }, retarget] : [retarget],
      anchor: caret + label.length + 1,
      opensHeading: opts.openHeading,
    }
  }
  return { changes: [{ from: ac.from, to: ac.to, insert }], anchor: caret }
}

// KNOB — how many suggestions are ranked before the rest are dropped; the pane's own max-height decides how many are visible at once.
export const AC_MAX = 20
