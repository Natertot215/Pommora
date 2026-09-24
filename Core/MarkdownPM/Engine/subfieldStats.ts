import { markdownLinkRegex } from '@pommora/core/Connections/links'
import { inlineSpans, lineIndexAt, quotePrefix } from './markdownCode'
import { loneWebpageEmbed } from '@pommora/core/MarkdownPM/Embeds/webpageEmbed'
import { scanDoc, type DocScan } from './docScan'
import { perText } from './perText'
import {
  calloutHeadPrefixLen,
  headingParts,
  isThematicBreakLine,
  loneEmbedTitle,
  markerRegex,
  parseListMarker,
} from './detect'

/** `lines` counts source lines the document holds; `words`/`characters` count the prose the editor draws. */
export interface PageStats {
  lines: number
  words: number
  characters: number
  citations: number
}

/** Chrome and widgets are replaced by a NEWLINE rather than a space: newlines are stripped before characters are counted, so a space placeholder was itself counted and made a long fence add a character per line. */
const GONE = '\n'

function proseStart(line: string): number {
  if (loneEmbedTitle(line) !== null || loneWebpageEmbed(line)) return line.length
  const base = calloutHeadPrefixLen(line) ?? quotePrefix(line).length
  const inner = line.slice(base)
  if (isThematicBreakLine(inner)) return line.length
  return base + (headingParts(inner)?.contentStart ?? parseListMarker(inner)?.contentStart ?? 0)
}

/** An inline `![label](url)` keeps its bang: the editor has no image renderer and draws it as prose beside an ordinary link. */
function stripCodeSpans(line: string): string {
  let prose = ''
  let at = 0
  for (const [a, b, run] of inlineSpans(line)) {
    if (b > line.length) break
    prose += line.slice(at, a - run) + GONE
    at = b + run
  }
  return prose + line.slice(at)
}

function stripInline(text: string): string {
  return text
    .split('\n')
    .map(stripCodeSpans)
    .join('\n')
    .replace(/!?\[\[([^\]|\r\n]*)(?:\|([^\]\r\n]*))?\]\]/g, (_m, title, alias) => alias || title)
    .replace(markdownLinkRegex(), (_m, label) => label)
    .replace(/[*_~]/g, '')
}

function tableProse(scan: DocScan): Map<number, string> {
  const drawn = new Map<number, string>()
  for (const region of scan.tables) {
    const last = lineIndexAt(scan, region.to)
    for (let i = lineIndexAt(scan, region.from); i <= last; i++) drawn.set(i, '')
    for (const row of region.rows) {
      drawn.set(lineIndexAt(scan, row.from), row.cells.map((c) => c.text).join(GONE))
    }
  }
  return drawn
}

// The scan the editor runs, over this text, rather than a second, narrower one that could answer a construct differently.
export function computeStats(body: string): PageStats {
  if (!body) return { lines: 0, words: 0, characters: 0, citations: 0 }
  return rangeStats(scanDoc(body), 0, body.length)
}

/** One answer per body string: the footer mounts two items needing the same figures on one render, and the prose pass walks the whole document. */
export const pageStats = perText(computeStats, 4)

/** A range counts as the document reads it: every line keeps the construct the document's own scan gives it, and a prose line the range cuts keeps only its selected part, while a cut table row counts whole. */
export function rangeStats(scan: DocScan, from: number, to: number): PageStats {
  const { lines, lineStarts, fences, citations: cited } = scan
  const first = lineIndexAt(scan, from)
  let last = lineIndexAt(scan, to)
  // A range ending at a line's start ends on the line above, so a single trailing newline is the terminator, not a phantom empty line.
  if (last > first && to === lineStarts[last]) last--
  const drawn = tableProse(scan)
  const rows: string[] = []
  for (let i = first; i <= last; i++) {
    const line = lines[i]
    const shown = fences[i] || i >= cited.firstLine ? GONE : drawn.get(i)
    if (shown !== undefined) {
      rows.push(shown)
      continue
    }
    const start = Math.max(proseStart(line), from - lineStarts[i])
    rows.push(line.slice(start, Math.max(start, to - lineStarts[i])))
  }
  const prose = stripInline(rows.join('\n'))

  const characters = prose.replace(/\n/g, '').length
  // An empty string rather than GONE, so a marker glued to its word (`sentence[^1].`) stays one word.
  const words = (prose.replace(markerRegex(), '').match(/\S+/g) ?? []).length
  return {
    lines: Math.max(0, Math.min(cited.firstLine, last + 1) - first),
    words,
    characters,
    citations: cited.entries.filter((e) => e.line >= first && e.line <= last).length,
  }
}
