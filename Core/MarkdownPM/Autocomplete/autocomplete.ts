import { linkAt, normalizeTitle, pageEmbedText } from '@pommora/core/Connections/connections'
import { decodeLinkTarget, encodeLinkTarget, escapeAlias } from '@pommora/core/Connections/links'
import { codeMask } from '@pommora/core/Connections/markdownCode'
import { lineStartAt, lineEndAt } from '../Input/edits'
import type { ConnPage, PageIndex } from '../Links/connectionsApi'
import { useSession } from '../../Session/store'

export type ConnectionForm = 'link' | 'embed' | 'alias' | 'target'

export interface AutocompleteQuery {
  query: string
  from: number
  to: number
  form: ConnectionForm
  title?: string
  label?: { from: number; to: number }
}

export type AcQuery = Pick<AutocompleteQuery, 'query' | 'form' | 'title'>

/** A row that can be forgotten carries the gesture that forgets it, so the panel never learns what a page is. */
export interface AcRow {
  value: string
  label: string
  pageId?: string
  isPage: boolean
  forget?: () => void
}

function markdownTargetAt(
  line: string,
  rel: number,
): { from: number; to: number; label: [number, number] } | null {
  for (let i = line.indexOf(']('); i !== -1; i = line.indexOf('](', i + 2)) {
    const open = i + 2
    const close = line.indexOf(')', open)
    if (close === -1 || rel < open || rel > close) continue
    const bracket = line.lastIndexOf('[', i)
    return bracket === -1 ? null : { from: open, to: close, label: [bracket + 1, i] }
  }
  return null
}

export function autocompleteQuery(
  doc: string,
  caret: number,
  allowEmbeds = false,
): AutocompleteQuery | null {
  const lineStart = lineStartAt(doc, caret)
  const line = doc.slice(lineStart, lineEndAt(doc, caret))
  const rel = caret - lineStart
  if (codeMask(line)(rel)) return null
  const s = linkAt(line, rel)
  if (s) {
    const title = line.slice(s.title[0], s.title[1])
    // Only the TITLE opens the page picker: accepting replaces the whole token, so a caret in the alias would
    // arm a list keyed on the title and discard the alias on Enter.
    if (rel >= s.title[0] && rel <= s.title[1])
      return { query: title, from: lineStart + s.full[0], to: lineStart + s.full[1], form: 'link' }
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
  const paren = markdownTargetAt(line, rel)
  if (paren)
    return {
      query: decodeLinkTarget(line.slice(paren.from, paren.to)),
      from: lineStart + paren.from,
      to: lineStart + paren.to,
      form: 'target',
      label: { from: lineStart + paren.label[0], to: lineStart + paren.label[1] },
    }
  // A LOCAL match — the connections pattern excludes `![[` by design, and `[` doesn't auto-pair after `!`,
  // so an in-progress embed is usually unclosed.
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

export const pageRow = (p: ConnPage): AcRow => ({
  value: p.title,
  label: p.title,
  isPage: true,
  pageId: p.id,
})

/** An unresolved or ambiguous title offers nothing: there is no one page to have remembered a name. */
export function aliasRows(conn: PageIndex, title: string | undefined, query: string): AcRow[] {
  if (!title) return []
  const res = conn.resolve(title)
  const page = res.status === 'resolved' ? res.page : null
  if (!page) return []
  const q = normalizeTitle(query)
  const { pageAliases, forgetAlias } = useSession.getState()
  return (pageAliases[page.id] ?? [])
    .filter((a) => normalizeTitle(a).startsWith(q))
    .slice(0, AC_MAX)
    .map((a) => ({ value: a, label: a, isPage: false, forget: () => forgetAlias(page.id, a) }))
}

/** A carried `alias` rides only the link form — `![[ ]]` has no alias syntax, and the alias form writes into a link that already exists. */
function formSyntax(value: string, form: ConnectionForm, alias?: string): string {
  switch (form) {
    case 'alias':
      return value
    case 'target':
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

export interface CommitEdit {
  changes: { from: number; to: number; insert: string }[]
  opensAlias?: boolean
  anchor: number
}

/** Pure so the rules can be read and tested without an editor — the part a coordinate-less harness otherwise can't reach. */
export function commitEdit(
  ac: AutocompleteQuery,
  row: AcRow,
  opts: { keepAlias?: string; openAlias?: boolean } = {},
): CommitEdit {
  // Opening the alias slot rather than finishing the link lets the picker hand those names straight back. Governed by `aliasPickerOnCommit`.
  if (ac.form === 'link' && opts.openAlias) {
    const text = `[[${row.value}|]]`
    return {
      changes: [{ from: ac.from, to: ac.to, insert: text }],
      anchor: ac.from + text.length - 2,
      opensAlias: true,
    }
  }
  const { insert, caret } = connectionInsert(row.value, ac.from, ac.form, opts.keepAlias)
  // Accepting an alias finishes the link it belongs to, rather than leaving the caret inside it for a second gesture.
  if (ac.form === 'alias')
    return { changes: [{ from: ac.from, to: ac.to, insert }], anchor: caret + 2 }
  if (ac.form === 'target') {
    const retarget = { from: ac.from, to: ac.to, insert }
    const fill = ac.label && ac.label.from === ac.label.to ? ac.label : null
    const label = fill ? escapeAlias(row.value) : ''
    return {
      changes: fill ? [{ from: fill.from, to: fill.to, insert: label }, retarget] : [retarget],
      anchor: caret + label.length + 1,
    }
  }
  return { changes: [{ from: ac.from, to: ac.to, insert }], anchor: caret }
}

// KNOB — how many suggestions are ranked before the rest are dropped; the pane's own max-height
// decides how many of them are visible at once, and the list scrolls to the rest.
export const AC_MAX = 20
