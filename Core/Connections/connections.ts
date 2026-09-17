import { foldKey } from '../Paths/caseFold'

export const titleFromPath = (path: string): string =>
  (path.split('/').pop() ?? path).replace(/\.md$/i, '')

export const pageEmbedPattern = (): RegExp =>
  /!\[\[(?<page>[^\]\r\n#]*)(?:#(?<heading>[^\]\r\n]*))?\]\]/dg

// NFC so an NFD-composed outside write still matches the NFC title it names; `unknown` because a YAML scalar `- 2024` off disk must still match "2024".
export function normalizeTitle(raw: unknown): string {
  return foldKey(String(raw).trim())
}

// Fresh per call so callers never share `lastIndex`. `]` is content unless it closes the pair; the 255 cap is load-bearing, since an unbounded run backtracks quadratically on an unclosed `[`-run. The page half stops at the first `#`; the heading takes the rest up to the pipe.
export function pageLinkPattern(): RegExp {
  return /(?<!!)\[\[(?<page>(?:[^\]\r\n|#]|\](?!\])){0,255})(?:#(?<heading>(?:[^\]\r\n|]|\](?!\])){0,255}))?(?:\|(?<alias>[^\]\r\n]{0,255}))?\]\]/dg
}

export type LinkStatus = 'resolved' | 'phantom' | 'ambiguous'

export interface LinkSpans {
  full: [number, number]
  title: [number, number]
  heading: [number, number] | null
  alias: [number, number] | null
}

// A GFM cell escapes `|`, so an aliased connection inside a table arrives as `[[Title\|alias]]` or `[[Title#Heading\|alias]]` — the backslash is the cell's, and it sits on whichever half precedes the pipe.
export const titleOf = (rawTitle: string): string =>
  rawTitle.endsWith('\\') ? rawTitle.slice(0, -1) : rawTitle

export function linkSpans(m: RegExpMatchArray): LinkSpans | null {
  const at = m.index
  const g = m.indices?.groups
  if (at == null || !g?.page) return null
  const page = g.page
  const heading = g.heading ?? null
  if (page[1] === page[0] && heading === null) return null
  const alias = g.alias ?? null
  const unescaped = (r: [number, number]): [number, number] =>
    alias !== null && m[0][r[1] - 1 - at] === '\\' ? [r[0], r[1] - 1] : r
  return {
    full: [at, at + m[0].length],
    title: heading === null ? unescaped(page) : page,
    heading: heading === null ? null : unescaped(heading),
    alias,
  }
}

export function linkAt(line: string, rel: number): LinkSpans | null {
  for (const m of line.matchAll(pageLinkPattern())) {
    const s = linkSpans(m)
    if (s && rel >= s.full[0] && rel <= s.full[1]) return s
  }
  return null
}

export function aliasSpanAt(line: string, rel: number): [number, number] | null {
  const alias = linkAt(line, rel)?.alias
  return alias && rel >= alias[0] && rel <= alias[1] ? alias : null
}

export function emptyAliasPipeAt(line: string, rel: number): number | null {
  const s = linkAt(line, rel)
  return s?.alias && s.alias[0] === s.alias[1] ? (s.heading ?? s.title)[1] : null
}

// The `#` of an empty heading slot, `[[Page#]]`: like an empty pipe, it goes when the caret leaves it.
export function emptyHeadingHashAt(line: string, rel: number): number | null {
  const s = linkAt(line, rel)
  return s?.heading && s.heading[0] === s.heading[1] && !s.alias ? s.heading[0] - 1 : null
}

const WHOLE_LINK = new RegExp(`^(?:${pageLinkPattern().source})$`, 'd')

export interface ConnectionParts {
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

export function embeddableTitle(title: string): boolean {
  return !/[\]|#\r\n]/.test(title)
}

export function pageEmbedText(title: string): string {
  return `![[${title}]]`
}
