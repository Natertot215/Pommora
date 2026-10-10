import { normalizeTitle } from '../Paths/caseFold'
import { markdownLinkRegex } from './links'
import { type CodeMask, inlineSpans } from '../MarkdownPM/Engine/markdownCode'

// Fresh per call so callers never share `lastIndex`. `]` is content unless it closes the pair; the 255 cap is load-bearing, since an unbounded run backtracks quadratically on an unclosed `[`-run. The page half stops at the first `#`; the heading takes the rest up to the pipe.
export function pageLinkPattern(): RegExp {
  return /\[\[(?<page>(?:[^\]\r\n|#]|\](?!\])){0,255})(?:#(?<heading>(?:[^\]\r\n|]|\](?!\])){0,255}))?(?:\|(?<alias>[^\]\r\n]{0,255}))?\]\]/dg
}

export type LinkStatus = 'resolved' | 'phantom' | 'ambiguous'

type Span = [number, number]

export interface LinkSpans {
  full: Span
  title: Span
  heading: Span | null
  alias: Span | null
}

export type LinkOccurrence =
  | ({ syntax: 'wiki' } & LinkSpans)
  | { syntax: 'markdown'; full: Span; label: Span; destination: Span }

// A GFM cell escapes `|`, so an aliased connection inside a table arrives as `[[Title\|alias]]` or `[[Title#Heading\|alias]]` — the backslash is the cell's, and it sits on whichever half precedes the pipe.
const titleOf = (rawTitle: string): string =>
  rawTitle.endsWith('\\') ? rawTitle.slice(0, -1) : rawTitle

function linkSpans(m: RegExpMatchArray): LinkSpans | null {
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
    full: [at, at + m[0].length],
    title: heading === null ? unescaped(page) : page,
    heading: heading === null ? null : unescaped(heading),
    alias,
  }
}

const overlaps = (a: Span, b: Span): boolean => a[0] < b[1] && b[0] < a[1]

// Code touches a link when its start sits in code, or a closed inline code span, backticks included, overlaps it; such a link is text.
function codeTouches(text: string, inCode: CodeMask, [from, to]: Span): boolean {
  if (inCode(from)) return true
  const start = text.lastIndexOf('\n', from - 1) + 1
  const end = text.indexOf('\n', from)
  const line = text.slice(start, end === -1 ? text.length : end)
  return inlineSpans(line).some(
    ([a, b, run]) => b <= line.length && overlaps([start + a - run, start + b + run], [from, to]),
  )
}

/** Every connection and markdown link in `text` that code doesn't touch, with empty slots kept. A markdown link overlapping a connection yields to it, so `[[Title]](target)` stays a connection trailed by literal parens, as Obsidian reads it. */
export function linkOccurrences(text: string, inCode: CodeMask): LinkOccurrence[] {
  const out: LinkOccurrence[] = []
  for (const m of text.matchAll(pageLinkPattern())) {
    const s = linkSpans(m)
    if (s && !codeTouches(text, inCode, s.full)) out.push({ syntax: 'wiki', ...s })
  }
  for (const m of text.matchAll(markdownLinkRegex())) {
    const [full, label, destination] = m.indices as [Span, Span, Span]
    if (codeTouches(text, inCode, full)) continue
    if (!out.some((o) => o.syntax === 'wiki' && overlaps(o.full, full)))
      out.push({ syntax: 'markdown', full, label, destination })
  }
  return out
}

const WHOLE_LINK = new RegExp(`^(?:${pageLinkPattern().source})$`, 'd')

interface ConnectionParts {
  title: string
  heading?: string
  alias?: string
}

export function parseConnectionText(raw: string): ConnectionParts | null {
  const m = WHOLE_LINK.exec(raw.trim())
  const g = m?.groups
  if (!g) return null
  const written = g.heading !== undefined
  const title = (written ? g.page : titleOf(g.page)).trim()
  const heading = written ? titleOf(g.heading).trim() : ''
  if (!title && !heading) return null
  return {
    title,
    ...(heading ? { heading } : {}),
    ...(g.alias?.trim() ? { alias: g.alias.trim() } : {}),
  }
}

export function connectionText(title: string, alias?: string, heading?: string): string {
  const target = heading ? `${title}#${heading}` : title
  const named =
    alias && !/[\]\r\n]/.test(alias) && normalizeTitle(alias) !== normalizeTitle(target)
      ? alias
      : undefined
  return named ? `[[${target}|${named}]]` : `[[${target}]]`
}

// A heading the link grammar can write: no pipe, hash, or newline, and no `]]` or a trailing `]` that would close the link early.
export function expressibleHeading(heading: string): boolean {
  return !/[|#\r\n]/.test(heading) && !heading.includes(']]') && !heading.endsWith(']')
}

export function embeddableTitle(title: string): boolean {
  return !/[\]|#\r\n]/.test(title)
}

export function pageEmbedText(title: string): string {
  return `![[${title}]]`
}
