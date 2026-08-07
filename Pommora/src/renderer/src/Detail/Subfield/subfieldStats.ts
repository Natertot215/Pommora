import { fencedLineMask } from '@shared/markdownCode'

/** Page document stats for the Subfield. `lines` counts raw source lines; `words`/`characters`
 *  count Markdown-stripped prose (so `## **Bold**` is one word, "Bold"). */
export interface PageStats {
  lines: number
  words: number
  characters: number
}

/** Fenced blocks blanked line-by-line through the shared pairing pass, so a long fence holding shorter
 *  ones drops as ONE block rather than leaving its inner fences' text counted as prose. */
function stripFences(md: string): string {
  const lines = md.split('\n')
  const fenced = fencedLineMask(lines)
  return lines.map((line, i) => (fenced[i] ? ' ' : line)).join('\n')
}

/** Light Markdown → prose strip, built for counting only — not a general-purpose stripper. */
function stripMarkdown(md: string): string {
  return stripFences(md)
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → text
    .replace(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (_m, a, b) => b || a) // wikilinks → display text
    .replace(/^\s{0,3}(?:#{1,6}|>|[-+])\s+/gm, '') // heading / quote / bullet markers
    .replace(/^\s{0,3}\d+\.\s+/gm, '') // ordered-list markers
    .replace(/^\s*[-=*_]{3,}\s*$/gm, ' ') // hr / setext rule
    .replace(/[*_~]/g, '') // emphasis markers
}

export function computeStats(body: string): PageStats {
  if (!body) return { lines: 0, words: 0, characters: 0 }
  // Raw source lines: a single trailing newline is the terminator, not a phantom empty line.
  const trimmed = body.endsWith('\n') ? body.slice(0, -1) : body
  const lines = trimmed.split('\n').length

  const prose = stripMarkdown(body)
  // Strictly-visible characters: drop the structural newlines, keep everything else.
  const characters = prose.replace(/\n/g, '').length
  const words = (prose.match(/\S+/g) ?? []).length
  return { lines, words, characters }
}
