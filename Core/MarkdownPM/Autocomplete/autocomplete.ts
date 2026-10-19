import {
  CLOSER,
  type LinkPart,
  type PageName,
  pageLinkText,
  spellsAsWiki,
  wholeLink,
} from '../../Connections/connections'
import { matchKey, matchQuery, normalizeTitle, rankMatches } from '../../Paths/caseFold'
import {
  decodeLinkTarget,
  encodeLinkTarget,
  escapeLabel,
  unescapeLabel,
} from '../../Connections/links'
import { namedPage, readOccurrence } from '../../Connections/linkValue'
import type { TrailSegment } from '@pommora/uix/Elements/NavTrail'
import { type DocScan, inCodeAt } from '../Engine/docScan'
import { linkAt, literalOrBracketAt, openLinkAt, partOf } from '../Input/edits'
import { lineIndexAt, type TextEdit } from '../Engine/markdownCode'
import { headingParts } from '../Engine/detect'
import type { ConnPage } from '../../Connections/pageIndex'
import type { PageHeading } from '../../Platform/stores'
import type { EditorHost } from '../api'

type QuerySyntax = 'wiki' | 'markdown' | 'prose'

/** One query, two axes: which syntax holds the caret (`prose` for a bare `§` run, always in its heading) and which part, the grammar's `LinkPart`. `start`..`end` is the whole link, `from`..`to` the part's text, `closed` whether the closer follows the caret, `heading` a title query's written heading, for a pick to keep when the picked page holds it, and `shown` the link's alias or label, read as the query reads its slot, where one is written. */
export interface AutocompleteQuery {
  syntax: QuerySyntax
  part: LinkPart
  start: number
  end: number
  from: number
  to: number
  query: string
  closed: boolean
  embed: boolean
  title?: string
  heading?: string
  shown?: string
}

export type AcRow = { value: string } & (
  | { kind: 'page'; page: ConnPage; location: TrailSegment[] }
  | { kind: 'heading'; level: number }
  | { kind: 'alias' }
)

export type HeadingRow = Extract<AcRow, { kind: 'heading' }>

export function autocompleteQuery(
  scan: DocScan,
  caret: number,
  armed?: number,
): AutocompleteQuery | null {
  if (inCodeAt(scan, caret)) return null
  const i = lineIndexAt(scan, caret)
  const line = scan.lines[i]
  const lineStart = scan.lineStarts[i]
  const rel = caret - lineStart
  const closedLink = linkAt(scan, caret)
  const o = closedLink ?? openLinkAt(scan, caret)
  const part = o && partOf(o, rel)
  if (armed !== undefined && !part) {
    const query = line.slice(armed - lineStart + 1, rel)
    if (
      caret >= armed + 1 &&
      headingParts(line) === null &&
      !literalOrBracketAt(scan, armed + 1) &&
      !/^\s/.test(query)
    )
      return {
        syntax: 'prose',
        part: 'heading',
        start: armed,
        end: caret,
        from: armed + 1,
        to: caret,
        query,
        closed: true,
        embed: false,
        title: '',
      }
  }
  if (!o || !part) return null
  const slot = o[part]!
  // A wikilink's slots read as written; a markdown destination decodes and its label unescapes. A heading or shown slot lists against the written title, and a markdown label lies before its destination, which is why every query carries the link's end.
  const raw = line.slice(slot[0], slot[1])
  const query =
    o.syntax === 'wiki' ? raw : part === 'shown' ? unescapeLabel(raw) : decodeLinkTarget(raw)
  const shown = o.shown ? line.slice(o.shown[0], o.shown[1]).trim() : ''
  const named = namedPage(readOccurrence(line, o))
  return {
    syntax: o.syntax,
    part,
    start: lineStart + o.full[0],
    end: lineStart + o.full[1],
    from: lineStart + slot[0],
    to: lineStart + slot[1],
    query,
    closed: closedLink !== null || o.full[1] > rel,
    embed: line[o.full[0] - 1] === '!',
    ...(part === 'title' ? {} : { title: named?.title ?? '' }),
    ...(part === 'title' && named?.heading ? { heading: named.heading } : {}),
    ...(shown ? { shown: o.syntax === 'wiki' ? shown : unescapeLabel(shown) } : {}),
  }
}

export const pageRow = (p: ConnPage, host: EditorHost): AcRow => ({
  kind: 'page',
  value: p.title,
  page: p,
  location: host.location(p.id),
})

/** Rows in their own order under an empty query, ranked by a typed one. */
const ranked = <R extends AcRow>(rows: R[], query: string): R[] => {
  const q = matchQuery(query)
  return q ? rankMatches(rows, q, (r) => matchKey(r.value)) : rows
}

/** The outline's headings, repeated text listed once. */
export function headingRows(outline: readonly PageHeading[], query: string): HeadingRow[] {
  const seen = new Set<string>()
  const rows = outline
    .filter((h) => {
      const key = normalizeTitle(h.text)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((h): HeadingRow => ({ kind: 'heading', value: h.text, level: h.level }))
  return ranked(rows, query)
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
  aliases: EditorHost['aliases'],
  pageId: string | undefined,
  query: string,
): AcRow[] {
  if (!pageId) return []
  const rows = aliases.list(pageId).map((a): AcRow => ({ kind: 'alias', value: a }))
  return ranked(rows, query)
}

export function commitEdit(
  ac: AutocompleteQuery,
  value: string,
  opts: { kept?: string; heading?: string; openAlias?: boolean; openHeading?: boolean },
): { changes: TextEdit[]; anchor: number } {
  const syntax = ac.syntax === 'markdown' ? 'markdown' : 'wiki'
  const closer = ac.closed || ac.syntax === 'prose' ? '' : CLOSER[ac.syntax]
  // A whole-link write rests past what it wrote, or inside the slot it opened, read back from the written text through the grammar, so a writer falling back to the other syntax still seats the caret right.
  const whole = (
    name: PageName & { shown?: string; embed?: boolean },
    open?: 'heading' | 'shown',
  ) => {
    const text = pageLinkText(name, syntax)
    const slot = open && wholeLink(text)?.[open]
    return {
      changes: [{ from: ac.start, to: ac.end, insert: text }],
      anchor: ac.start + (slot ? slot[0] : text.length),
    }
  }
  const inserted = (written: string) => ({
    changes: [{ from: ac.from, to: ac.to, insert: written + closer }],
    anchor: ac.end + written.length - (ac.to - ac.from) + closer.length,
  })
  switch (ac.part) {
    case 'title': {
      const open = opts.openHeading ? 'heading' : opts.openAlias ? 'shown' : undefined
      // Opening a slot writes it empty; a link written in markdown keeps an empty label when opening its heading, for the heading pick to fill, since the label's default is drawn, not written.
      const heading = open === 'heading' ? '' : opts.heading
      const asMarkdown = !(
        syntax === 'wiki' && spellsAsWiki({ title: value, heading, shown: opts.kept })
      )
      const shown =
        open === 'shown' ? '' : (opts.kept ?? (open === 'heading' && asMarkdown ? '' : undefined))
      return whole({ title: value, heading, shown, embed: ac.embed }, open)
    }
    case 'heading': {
      // A heading pick writes in place; one opening the alias slot finds it empty, since only a link showing nothing opens it, and a wikilink's lone empty pipe gives way to the one it writes. One dropping the shown text it re-aims away from, or a wikilink that can't spell the heading, is written whole, falling to the markdown form with its title as written.
      const title = ac.title ?? ''
      const open = opts.openAlias ? 'shown' : undefined
      if (
        (ac.shown && !opts.kept) ||
        (ac.syntax === 'wiki' && !spellsAsWiki({ title, heading: value, shown: opts.kept }))
      )
        return whole({ title, heading: value, shown: open ? '' : opts.kept }, open)
      const written = ac.syntax === 'markdown' ? encodeLinkTarget(value) : value
      if (!open) return inserted(written)
      if (ac.syntax === 'markdown') return { ...inserted(written), anchor: ac.start + 1 }
      return {
        changes: [
          {
            from: ac.from,
            to: ac.end - (ac.closed ? CLOSER.wiki.length : 0),
            insert: `${written}|${closer}`,
          },
        ],
        anchor: ac.from + written.length + 1,
      }
    }
    case 'shown':
      return inserted(ac.syntax === 'markdown' ? escapeLabel(value) : value)
  }
}

// KNOB — how many suggestions are ranked before the rest are dropped; the pane's own max-height decides how many are visible at once.
export const AC_MAX = 20
