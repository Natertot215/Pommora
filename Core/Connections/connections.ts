import { normalizeTitle } from '../Paths/caseFold'
import { markdownLinkRegex, namesPage } from './links'
import {
  type CodeMask,
  codeTouches,
  overlaps,
  type Span,
  trimmedRange,
} from '../MarkdownPM/Engine/markdownCode'

// Fresh per call so callers never share `lastIndex`. `]` is content unless it closes the pair; the 255 cap is load-bearing, since an unbounded run backtracks quadratically on an unclosed `[`-run. The page half stops at the first `#`; the heading takes the rest up to the pipe.
export function pageLinkPattern(): RegExp {
  return /\[\[(?<page>(?:[^\]\r\n|#]|\](?!\])){0,255})(?:#(?<heading>(?:[^\]\r\n|]|\](?!\])){0,255}))?(?:\|(?<alias>[^\]\r\n]{0,255}))?\]\]/dg
}

export type LinkStatus = 'resolved' | 'phantom' | 'ambiguous'

/** One link of either syntax, its slots as spans into the text, the same fields in both arms: `title` is a wikilink's page half or a markdown destination up to a page-naming `#` (the whole destination otherwise, trimmed), `heading` what follows that `#`, and `shown` the alias or the label, which a markdown link always has. */
export type LinkOccurrence =
  | { syntax: 'wiki'; full: Span; title: Span; heading: Span | null; shown: Span | null }
  | { syntax: 'markdown'; full: Span; title: Span; heading: Span | null; shown: Span }

/** The three slots a caret can sit in. */
export type LinkPart = 'title' | 'heading' | 'shown'

/** The destination as written, title through heading. */
export const targetSpan = (o: Pick<LinkOccurrence, 'title' | 'heading'>): Span => [
  o.title[0],
  (o.heading ?? o.title)[1],
]

export function mapSpans(o: LinkOccurrence, f: (s: Span) => Span): LinkOccurrence {
  if (o.syntax === 'markdown')
    return {
      ...o,
      full: f(o.full),
      title: f(o.title),
      heading: o.heading && f(o.heading),
      shown: f(o.shown),
    }
  return {
    ...o,
    full: f(o.full),
    title: f(o.title),
    heading: o.heading && f(o.heading),
    shown: o.shown && f(o.shown),
  }
}

function wikiSpans(m: RegExpMatchArray): LinkOccurrence | null {
  const at = m.index
  const g = m.indices?.groups
  if (at == null || !g?.page) return null
  const page = g.page
  const heading = g.heading ?? null
  if (page[1] === page[0] && heading === null) return null
  const alias = g.alias ?? null
  const unescaped = (r: Span): Span =>
    alias !== null && m[0][r[1] - 1 - at] === '\\' ? [r[0], r[1] - 1] : r
  return {
    syntax: 'wiki',
    full: [at, at + m[0].length],
    title: heading === null ? unescaped(page) : page,
    heading: heading === null ? null : unescaped(heading),
    shown: alias,
  }
}

// The destination splits at its first raw `#` only when the half before names a page, so an address keeps one undivided title; it splits before decoding, so `%23` stays inside the title.
function markdownSpans(text: string, [full, label, dest]: [Span, Span, Span]): LinkOccurrence {
  const [from, to] = trimmedRange(text, dest[0], dest[1])
  let hash = from
  while (hash < to && text[hash] !== '#') hash++
  const splits = hash < to && namesPage(text.slice(from, hash))
  return {
    syntax: 'markdown',
    full,
    title: splits ? [from, hash] : [from, to],
    heading: splits ? [hash + 1, to] : null,
    shown: label,
  }
}

/** Every connection and markdown link in `text` that code doesn't touch, in start order, with empty slots kept. A markdown link overlapping a connection yields to it, so `[[Title]](target)` stays a connection trailed by literal parens, as Obsidian reads it. */
export function linkOccurrences(text: string, inCode: CodeMask): LinkOccurrence[] {
  const out: LinkOccurrence[] = []
  for (const m of text.matchAll(pageLinkPattern())) {
    const o = wikiSpans(m)
    if (o && !codeTouches(text, inCode, o.full)) out.push(o)
  }
  for (const m of text.matchAll(markdownLinkRegex())) {
    const spans = m.indices as [Span, Span, Span]
    const [full] = spans
    if (codeTouches(text, inCode, full)) continue
    if (!out.some((o) => o.syntax === 'wiki' && overlaps(o.full, full)))
      out.push(markdownSpans(text, spans))
  }
  return out.sort((a, b) => a.full[0] - b.full[0])
}

const NO_CODE: CodeMask = () => false

export function wholeLink(text: string): LinkOccurrence | null {
  return (
    linkOccurrences(text, NO_CODE).find((o) => o.full[0] === 0 && o.full[1] === text.length) ?? null
  )
}

interface ConnectionParts {
  title: string
  heading?: string
  alias?: string
}

export function parseConnectionText(raw: string): ConnectionParts | null {
  const text = raw.trim()
  const o = wholeLink(text)
  if (o?.syntax !== 'wiki') return null
  const slice = ([s, e]: Span): string => text.slice(s, e).trim()
  const title = slice(o.title)
  const heading = o.heading ? slice(o.heading) : ''
  const alias = o.shown ? slice(o.shown) : ''
  if (!title && !heading) return null
  return { title, ...(heading ? { heading } : {}), ...(alias ? { alias } : {}) }
}

/** A name a page can hold as an alias: one a link's alias slot carries — not blank, within the slot's 255 characters, without `]` or a line break — and never `target` itself. */
export const keepsAlias = (name: string, target: string): boolean =>
  name.trim() !== '' &&
  name.length <= 255 &&
  !/[\]\r\n]/.test(name) &&
  normalizeTitle(name) !== normalizeTitle(target)

/** A present-but-empty heading or alias spells its slot (`[[A#]]`, `[[A|]]`): the picker opens a slot by writing it. */
export function connectionText(title: string, heading?: string, alias?: string): string {
  const target = heading === undefined ? title : `${title}#${heading}`
  const named =
    alias !== undefined && (alias === '' || keepsAlias(alias, target)) ? alias : undefined
  return named === undefined ? `[[${target}]]` : `[[${target}|${named}]]`
}

export function expressibleInLink(text: string): boolean {
  return !/[|#\r\n]/.test(text) && !text.includes(']]') && !text.endsWith(']')
}

export function pageEmbedText(title: string): string {
  return `![[${title}]]`
}
