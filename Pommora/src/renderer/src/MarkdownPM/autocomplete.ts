import { linkAt, normalizeTitle } from '@shared/connections'
import { lineStartAt, lineEndAt } from './input'
import type { ConnPage, PageIndex } from './connections'
import { useSession } from '../store'

/** What the picker is filling in: a `[[Title]]` connection, a `![[Title]]` embed, or the alias half
 *  of one. It decides both what a row means and what accepting one writes. */
export type ConnectionForm = 'link' | 'embed' | 'alias'

export interface AutocompleteQuery {
  query: string
  /** The span to replace when a candidate is accepted — the whole token, or in the alias form the
   *  alias alone, since retargeting a link and renaming it are different edits. */
  from: number
  to: number
  form: ConnectionForm
  /** The title whose remembered aliases are being offered. Alias form only. */
  title?: string
}

/** What a candidate source is asked for — the query itself, stripped of where it sits. */
export type AcQuery = Pick<AutocompleteQuery, 'query' | 'form' | 'title'>

/** A row the picker offers. `value` is what accepting it writes; `label` is what's drawn. A row that
 *  can be forgotten carries the gesture that forgets it, so the panel itself never has to know what
 *  a page is or where a memory lives. */
export interface AcRow {
  value: string
  label: string
  /** Whether the row names an entity and should be drawn with its glyph. */
  isPage: boolean
  forget?: () => void
}

export function autocompleteQuery(
  doc: string,
  caret: number,
  allowEmbeds = false,
): AutocompleteQuery | null {
  const lineStart = lineStartAt(doc, caret)
  const line = doc.slice(lineStart, lineEndAt(doc, caret))
  const rel = caret - lineStart
  const s = linkAt(line, rel)
  if (s) {
    const title = line.slice(s.title[0], s.title[1])
    // Only the TITLE opens the page picker. Accepting a candidate replaces the whole token, so a
    // caret in the alias would arm a list keyed on the title and discard the alias on Enter —
    // destroying the very text the caret is sitting in. An unaliased link is unaffected: its title
    // ends exactly where the closer begins.
    if (rel >= s.title[0] && rel <= s.title[1])
      return { query: title, from: lineStart + s.full[0], to: lineStart + s.full[1], form: 'link' }
    // The alias half offers what the page named by the title has been called before, and accepting
    // one replaces the alias alone. The title rides along as the key those suggestions are found by.
    if (s.alias && rel >= s.alias[0] && rel <= s.alias[1])
      return {
        query: line.slice(s.alias[0], s.alias[1]),
        from: lineStart + s.alias[0],
        to: lineStart + s.alias[1],
        form: 'alias',
        title,
      }
  }
  // The embed branch is a LOCAL match — the connections pattern excludes `![[` by design (four
  // consumers depend on that), and `[` doesn't auto-pair after `!`, so an in-progress embed is
  // usually unclosed: the span runs to the closer when one exists, else to the line end.
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

export const pageRow = (p: ConnPage): AcRow => ({ value: p.title, label: p.title, isPage: true })

/** The aliases the page named by `title` has been given, prefix-filtered by what's typed so far.
 *  Each row carries its own forget, so the panel never learns where the memory lives — and an
 *  unresolved or ambiguous title offers nothing, since there's no one page to have remembered it. */
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

/** The syntax each form commits. A carried `alias` rides only the link form — `![[ ]]` has no alias
 *  syntax, and an empty one collapses rather than writing a bare pipe. The alias form writes its own
 *  words into a link that already exists, so it brings no syntax with it. */
function formSyntax(value: string, form: ConnectionForm, alias?: string): string {
  switch (form) {
    case 'alias':
      return value
    case 'embed':
      return `![[${value}]]`
    case 'link':
      return alias ? `[[${value}|${alias}]]` : `[[${value}]]`
  }
}

/** The committed text and where it leaves the caret. */
export function connectionInsert(
  value: string,
  from: number,
  form: ConnectionForm = 'link',
  alias?: string,
): { insert: string; caret: number } {
  const insert = formSyntax(value, form, alias)
  return { insert, caret: from + insert.length }
}

// Panel geometry — shared by the main editor and table cells. AC_ROW_H/AC_PADDING track .mdpm-ac in Styles.css.
export const AC_MAX = 6
const AC_ROW_H = 28
const AC_PADDING = 8
const AC_MAX_ROWS = 4
const AC_GAP = 4

// Anchor the panel below the caret; flip above when it would overflow the viewport bottom. Coords are
// viewport-relative (the panel is position:fixed), so this works the same from the main editor or a cell.
export function acPanelTop(caretTop: number, caretBottom: number, count: number): number {
  const h = Math.min(count, AC_MAX_ROWS) * AC_ROW_H + AC_PADDING
  return caretBottom + AC_GAP + h > window.innerHeight
    ? caretTop - h - AC_GAP
    : caretBottom + AC_GAP
}
