import { lineIndexAt, quotePrefix } from './markdownCode'
import { chunksOver, scanDoc, type DocScan } from './docScan'
import { holdsTokens, type Token, tokenize } from './tokens'
import { perText } from './perText'
import { clamp } from '@pommora/uix/Utilities/clamp'
import {
  calloutHeadPrefixLen,
  headingParts,
  isThematicBreakLine,
  loneEmbedTitle,
  loneWebpageEmbed,
  type MarkdownScope,
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

type Hidden = readonly [from: number, to: number, fill: string]

/** What the editor draws in place of a token's source: code as nothing, marks, links, and embeds as their shown text, while citation markers, tags, math, and anything in a page's HTML block stay as written. */
function hiddenOf(tk: Token, scope: MarkdownScope): Hidden[] {
  if (tk.inHtml && scope === 'page') return []
  switch (tk.kind) {
    case 'inlineCode':
      return [[tk.range[0], tk.range[1], GONE]]
    case 'citationRef':
    case 'htmlTag':
    case 'inlineLatex':
    case 'blockLatex':
      return []
    default:
      return tk.markerRanges.map(([a, b]) => [a, b, ''])
  }
}

const NOTHING_HIDDEN: Hidden[] = []

// By chunk text, the editor's own unit: an edit re-tokenizes only the chunk it changed.
const tokenHidden = (scope: MarkdownScope) =>
  perText(
    (text: string) =>
      tokenize(text)
        .flatMap((tk) => hiddenOf(tk, scope))
        .sort((a, b) => a[0] - b[0]),
    8192,
  )
const pageHidden = tokenHidden('page')
const cellHidden = tokenHidden('cell')

const hiddenIn = (text: string, hidden = pageHidden): Hidden[] =>
  holdsTokens(text) ? hidden(text) : NOTHING_HIDDEN

/** `text` from `from` to `to` as drawn; `hidden` is sorted by start and read from `h` on. */
function drawnSlice(
  text: string,
  from: number,
  to: number,
  hidden: readonly Hidden[],
  h = 0,
): string {
  let out = ''
  let at = from
  for (let j = h; j < hidden.length; j++) {
    const [a, b, fill] = hidden[j]
    if (a >= to) break
    if (b <= at) continue
    if (a > at) out += text.slice(at, a)
    out += fill
    at = b
  }
  return out + text.slice(at, Math.max(at, to))
}

/** A block with no chunk cut would otherwise tokenize whole on every keystroke inside it; past this many lines it tokenizes line by line. */
const CHUNK_LINES = 40

/** The line spans a count tokenizes: tables draw their cells, so their lines stay out. */
function proseRuns(scan: DocScan, first: number, last: number): [number, number][] {
  const runs: [number, number][] = []
  let from = first
  for (const region of scan.tables) {
    const top = lineIndexAt(scan, region.from)
    const bottom = lineIndexAt(scan, region.to)
    if (bottom < from) continue
    if (top > last) break
    if (top > from) runs.push([from, top - 1])
    from = bottom + 1
  }
  if (from <= last) runs.push([from, last])
  return runs
}

function tableProse(scan: DocScan): Map<number, string> {
  const drawn = new Map<number, string>()
  for (const region of scan.tables) {
    const last = lineIndexAt(scan, region.to)
    for (let i = lineIndexAt(scan, region.from); i <= last; i++) drawn.set(i, '')
    for (const row of region.rows) {
      const cells = row.cells.map((c) => drawnSlice(c, 0, c.length, hiddenIn(c, cellHidden)))
      drawn.set(lineIndexAt(scan, row.from), cells.join(GONE))
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
  const hidden: Hidden[] = []
  const take = (at: number, text: string): void => {
    for (const [s, e, fill] of hiddenIn(text)) hidden.push([at + s, at + e, fill])
  }
  for (const [a, b] of chunksOver(
    scan,
    proseRuns(scan, first, Math.min(last, cited.firstLine - 1)),
  )) {
    const top = lineIndexAt(scan, a)
    const bottom = lineIndexAt(scan, b)
    if (bottom - top < CHUNK_LINES) take(a, scan.text.slice(a, b))
    else for (let i = top; i <= bottom; i++) take(lineStarts[i], lines[i])
  }
  let h = 0
  const rows: string[] = []
  for (let i = first; i <= last; i++) {
    const shown = fences[i] || i >= cited.firstLine ? GONE : drawn.get(i)
    if (shown !== undefined) {
      rows.push(shown)
      continue
    }
    const ls = lineStarts[i]
    const start = ls + Math.max(proseStart(lines[i]), from - ls)
    while (h < hidden.length && hidden[h][1] <= start) h++
    rows.push(drawnSlice(scan.text, start, clamp(ls + lines[i].length, start, to), hidden, h))
  }
  const prose = rows.join('\n')

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
