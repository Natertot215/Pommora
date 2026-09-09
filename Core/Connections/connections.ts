import { foldKey } from '../Paths/caseFold'

export const titleFromPath = (path: string): string =>
  (path.split('/').pop() ?? path).replace(/\.md$/i, '')

export const pageEmbedPattern = (): RegExp => /!\[\[([^\]\r\n]*)\]\]/dg

// NFC so an NFD-composed outside write still matches the NFC title it names; `unknown` because a YAML scalar `- 2024` off disk must still match "2024".
export function normalizeTitle(raw: unknown): string {
  return foldKey(String(raw).trim())
}

// Fresh per call so callers never share `lastIndex`. `]` is content unless it closes the pair; the 255 cap is load-bearing, since an unbounded run backtracks quadratically on an unclosed `[`-run.
export function pageLinkPattern(): RegExp {
  return /(?<!!)\[\[((?:[^\]\r\n|]|\](?!\])){1,255})(?:\|([^\]\r\n]{0,255}))?\]\]/g
}

export type LinkStatus = 'resolved' | 'phantom' | 'ambiguous'

interface LinkSpans {
  full: [number, number]
  title: [number, number]
  alias: [number, number] | null
}

// A GFM cell escapes `|`, so an aliased connection inside a table arrives as `[[Title\|alias]]` — the backslash is the cell's, not the title's.
export const titleOf = (rawTitle: string): string =>
  rawTitle.endsWith('\\') ? rawTitle.slice(0, -1) : rawTitle

export function linkSpans(m: RegExpMatchArray): LinkSpans | null {
  if (m.index == null) return null
  const full: [number, number] = [m.index, m.index + m[0].length]
  const titleEnd = m.index + 2 + m[1].length
  const aliased = m[2] !== undefined
  return {
    full,
    title: [m.index + 2, aliased && m[1].endsWith('\\') ? titleEnd - 1 : titleEnd],
    alias: aliased ? [titleEnd + 1, full[1] - 2] : null,
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
  return s?.alias && s.alias[0] === s.alias[1] ? s.title[1] : null
}

const WHOLE_LINK = new RegExp(`^(?:${pageLinkPattern().source})$`)

export function parseConnectionText(raw: string): { title: string; alias?: string } | null {
  const m = WHOLE_LINK.exec(raw.trim())
  if (!m) return null
  const title = titleOf(m[1]).trim()
  return title ? { title, alias: m[2]?.trim() || undefined } : null
}

export function connectionText(title: string, alias?: string): string {
  const named =
    alias && !/[\]\r\n]/.test(alias) && normalizeTitle(alias) !== normalizeTitle(title)
      ? alias
      : undefined
  return named ? `[[${title}|${named}]]` : `[[${title}]]`
}

export function embeddableTitle(title: string): boolean {
  return !title.includes(']') && !title.includes('|') && !/[\r\n]/.test(title)
}

export function pageEmbedText(title: string): string {
  return `![[${title}]]`
}
