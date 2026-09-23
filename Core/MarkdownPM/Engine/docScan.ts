import { codeAt, fenceAt, lineEndOf, lineIndexAt, type CodeMask } from './markdownCode'
import {
  assembleCitations,
  blockEmbedLines,
  blockMathRanges,
  blockWebpageLines,
  calloutLines,
  fenceRangesOf,
  htmlBlocks,
  isBlockquoteLine,
  isHeadingLine,
  isThematicBreakLine,
  lineRefs,
  scanFencedCode,
  splitWithOffsets,
  type CalloutLine,
  type CitationScan,
  type DocLines,
  type EmbedLine,
  type FenceInfo,
  type LineRef,
  type WebpageLine,
} from './detect'
import { tableRegions, type TableRegion } from './Tables/regions'

// ── Types ───────────────────────────────────────────────────────────────

/** Every whole-document derivation the editor reads, one per document version. */
export interface DocScan extends DocLines {
  fences: (FenceInfo | undefined)[]
  callouts: (CalloutLine | undefined)[]
  headings: boolean[]
  /** A blockquote line that draws quote chrome — a top-level fence owns its bytes outright, so a `>` inside one is code text. */
  quotes: boolean[]
  breaks: boolean[]
  refs: (LineRef[] | undefined)[]
  tables: TableRegion[]
  maths: [number, number][]
  embeds: EmbedLine[]
  webpages: WebpageLine[]
  html: [number, number][]
  fenceLines: number[]
  mathOpen: number
  fresh: [number, number]
  citations: CitationScan
}

type LineScan = Omit<DocScan, 'citations'>

export type Span = readonly [number, number] | { readonly from: number; readonly to: number }

// ── Construction ────────────────────────────────────────────────────────

function scanLines(d: DocLines): LineScan {
  const { lines, lineStarts } = d
  const fences = scanFencedCode(lines, lineStarts)
  const inCode: CodeMask = (p) => inCodeAt({ lines, lineStarts, fences }, p)
  const tables = tableRegions(d, inCode)
  const base: [number, number][] = [
    ...fenceRangesOf(fences),
    ...tables.map((r): [number, number] => [r.from, r.to]),
  ]
  const math = blockMathRanges(d, base)
  const excluded = [...base, ...math.ranges]
  return {
    ...d,
    fences,
    callouts: calloutLines(lines, fences),
    headings: lines.map(isHeadingLine),
    quotes: lines.map((l, i) => isBlockquoteLine(l) && fences[i]?.depth !== 0),
    breaks: lines.map(isThematicBreakLine),
    refs: lines.map((l, i) => lineRefs(l, lineStarts[i], inCode)),
    tables,
    maths: math.ranges,
    embeds: blockEmbedLines(d, excluded),
    webpages: blockWebpageLines(d, excluded),
    html: htmlBlocks(d, fences),
    fenceLines: lines.flatMap((l, i) => (fenceAt(l) ? [i] : [])),
    mathOpen: math.open,
    fresh: [0, lines.length],
  }
}

function withCitations(s: LineScan): DocScan {
  return { ...s, citations: assembleCitations(s, (k) => inSealedBlockAt(s, k), s.refs) }
}

export function scanDoc(text: string): DocScan {
  return withCitations(scanLines(splitWithOffsets(text)))
}

// ── Maintenance ─────────────────────────────────────────────────────────

const LIST_LINE = /^[ \t]*(?:[-+*]|\d{1,9}[.)])[ \t]/

function quietAt(s: LineScan, i: number): boolean {
  if (i === 0) return true
  const k = i - 1
  if (s.fences[k] !== undefined) return false
  const at = s.lineStarts[k]
  if (spanAt(s.maths, at) !== undefined || spanAt(s.html, at) !== undefined) return false
  const line = s.lines[k]
  return line.trim() === '' || s.headings[k] || s.breaks[k] || LIST_LINE.test(line)
}

export function carriedFrom(was: DocScan, scan: DocScan): number {
  return scan.fresh[1] + was.lines.length - scan.lines.length
}

export function rescan(prev: DocScan, from: number, to: number, text: string): DocScan {
  const n = prev.lines.length
  const shift = text.length - prev.text.length
  let a = lineIndexAt(prev, from)
  let b = lineIndexAt(prev, to) + 1
  for (;;) {
    while (!quietAt(prev, a)) a--
    while (b < n && !quietAt(prev, b)) b++
    const start = prev.lineStarts[a]
    const end = b < n ? prev.lineStarts[b] - 1 + shift : text.length
    const w = scanLines(splitWithOffsets(` ${text.slice(start, end)}`.slice(1)))
    const above = loneAbove(prev, w, a)
    if (above < a) a = above
    else if (b === n || (quietAt(w, w.lines.length) && !pairsBelow(prev, w, b)))
      return withCitations(splice(prev, a, b, w, start, shift, text))
    else b = Math.min(n, 2 * b - a)
  }
}

function loneAbove(prev: DocScan, w: LineScan, a: number): number {
  let top = a
  if (w.fenceLines.length > 0)
    for (const k of prev.fenceLines) {
      if (k >= top) break
      if (prev.fences[k] === undefined) top = k
    }
  if ((w.maths.length > 0 || w.mathOpen >= 0) && prev.mathOpen >= 0 && prev.mathOpen < top)
    top = prev.mathOpen
  return top
}

function pairsBelow(prev: DocScan, w: LineScan, b: number): boolean {
  const lone = w.fenceLines.some((k) => w.fences[k] === undefined)
  if (lone && (prev.fenceLines.at(-1) ?? -1) >= b) return true
  const last = prev.maths.at(-1)
  return (
    w.mathOpen >= 0 && (prev.mathOpen >= b || (last !== undefined && last[0] >= prev.lineStarts[b]))
  )
}

function splice(
  prev: DocScan,
  a: number,
  b: number,
  w: LineScan,
  start: number,
  shift: number,
  text: string,
): LineScan {
  const tail = prev.lineStarts[b]
  const perLine = <T>(old: readonly T[], fresh: readonly T[], by?: (v: T, d: number) => T): T[] =>
    old
      .slice(0, a)
      .concat(
        by ? fresh.map((v) => by(v, start)) : fresh,
        by ? old.slice(b).map((v) => by(v, shift)) : old.slice(b),
      )
  const spans = <S extends Span>(
    old: readonly S[],
    fresh: readonly S[],
    by: (s: S, d: number) => S,
  ): S[] => {
    const out: S[] = []
    for (const s of old) if (fromOf(s) < start) out.push(s)
    for (const s of fresh) out.push(by(s, start))
    for (const s of old) if (fromOf(s) >= tail) out.push(by(s, shift))
    return out
  }
  const n = w.lines.length
  const lineStarts = perLine(
    prev.lineStarts.slice(0, prev.lines.length),
    w.lineStarts.slice(0, n),
    (p, d) => p + d,
  )
  lineStarts.push(text.length)
  return {
    text,
    lines: perLine(prev.lines, w.lines),
    lineStarts,
    fences: perLine(prev.fences, w.fences, (f, d) => f && moveLine(f, d)),
    callouts: perLine(prev.callouts, w.callouts),
    headings: perLine(prev.headings, w.headings),
    quotes: perLine(prev.quotes, w.quotes),
    breaks: perLine(prev.breaks, w.breaks),
    refs: perLine(prev.refs, w.refs),
    tables: spans(prev.tables, w.tables, moveTable),
    maths: spans(prev.maths, w.maths, moveRange),
    embeds: spans(prev.embeds, w.embeds, moveLine),
    webpages: spans(prev.webpages, w.webpages, moveLine),
    html: spans(prev.html, w.html, moveRange),
    fenceLines: prev.fenceLines
      .filter((k) => k < a)
      .concat(
        w.fenceLines.map((k) => k + a),
        prev.fenceLines.filter((k) => k >= b).map((k) => k - b + a + n),
      ),
    mathOpen:
      w.mathOpen >= 0
        ? a + w.mathOpen
        : prev.mathOpen >= b
          ? prev.mathOpen - b + a + n
          : prev.mathOpen < a
            ? prev.mathOpen
            : -1,
    fresh: [a, a + n],
  }
}

export const fromOf = (s: Span): number => ('from' in s ? s.from : s[0])
export const toOf = (s: Span): number => ('to' in s ? s.to : s[1])
const moveRange = ([f, t]: [number, number], d: number): [number, number] => [f + d, t + d]
const moveLine = <L extends { from: number; to: number }>(l: L, d: number): L => ({
  ...l,
  from: l.from + d,
  to: l.to + d,
})
const moveTable = (r: TableRegion, d: number): TableRegion => ({
  ...moveLine(r, d),
  rows: r.rows.map((row) => ({
    ...moveLine(row, d),
    segments: row.segments.map((s) => moveRange(s, d)),
  })),
})

// ── Queries ─────────────────────────────────────────────────────────────

const OPENS_FLUSH = /^\S/
const LIST_ITEM = /^(?:[-+*]|\d{1,9}[.)])[ \t]+\S/

function cutAt(s: LineScan, i: number): boolean {
  if (i === 0) return true
  if (!quietAt(s, i) || !OPENS_FLUSH.test(s.lines[i])) return false
  const above = s.lines[i - 1]
  return (
    above.trim() === '' ||
    s.headings[i - 1] ||
    s.breaks[i - 1] ||
    s.headings[i] ||
    s.breaks[i] ||
    LIST_ITEM.test(s.lines[i])
  )
}

const CHUNK_REACH = 50

export function chunksOver(
  s: LineScan,
  spans: readonly (readonly [number, number])[],
): [number, number][] {
  const n = s.lines.length
  const out: [number, number][] = []
  let next = 0
  for (const [first, last] of spans) {
    const top = Math.max(next, first)
    let i = top
    while (i > next && i > top - CHUNK_REACH && !cutAt(s, i)) i--
    if (i > next && !cutAt(s, i)) {
      const math = spanAt(s.maths, s.lineStarts[top])
      i = math !== undefined ? Math.max(next, lineIndexAt(s, math[0])) : top
      while (i > next && /^(?:[ \t]|\r?$)/.test(s.lines[i]) && s.fences[i - 1] === undefined) i--
    }
    if (i === next && out.length > 0 && !cutAt(s, i)) i = lineIndexAt(s, out.pop()![0])
    while (i <= last) {
      const f = s.fences[i]
      if (f !== undefined && spanAt(s.maths, s.lineStarts[i]) === undefined) {
        i = next = lineIndexAt(s, f.to) + 1
        continue
      }
      let j = i + 1
      while (j < n && j <= last + CHUNK_REACH && !cutAt(s, j)) j++
      if (j < n && !cutAt(s, j)) {
        const fence = s.fences[last]
        const math = spanAt(s.maths, s.lineStarts[last])
        j =
          math !== undefined
            ? lineIndexAt(s, math[1]) + 1
            : fence !== undefined
              ? lineIndexAt(s, fence.from)
              : last + 1
      }
      out.push([s.lineStarts[i], j < n ? s.lineStarts[j] - 1 : s.text.length])
      i = next = j
    }
  }
  return out
}

export function spanAt<S extends Span>(spans: readonly S[], pos: number): S | undefined {
  let lo = 0
  let hi = spans.length - 1
  let hit = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (fromOf(spans[mid]) <= pos) {
      hit = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  if (hit < 0) return undefined
  const s = spans[hit]
  return pos <= toOf(s) ? s : undefined
}

export function inJoinedMath(scan: LineScan, i: number, first: number, last: number): boolean {
  const math = spanAt(scan.maths, scan.lineStarts[i])
  return math !== undefined && math[0] >= scan.lineStarts[first] && math[0] <= lineEndOf(scan, last)
}

export const indentWidth = (line: string): number => /^[ \t]*/.exec(line)![0].length

export function quotePrefixWidth(line: string, levels: number): number {
  if (levels === 0) return 0
  let w = indentWidth(line)
  for (let k = 0; k < levels && line[w] === '>'; k++)
    w += line[w + 1] === ' ' || line[w + 1] === '\t' ? 2 : 1
  return w
}

export function codeBlockTextAt(scan: DocScan, pos: number): string {
  const start = lineIndexAt(scan, pos)
  const depth = scan.fences[start]?.depth ?? 0
  const out: string[] = []
  for (let i = start + 1; i < scan.lines.length; i++) {
    if (scan.fences[i]?.role !== 'content') break
    const line = scan.lines[i]
    out.push(line.slice(quotePrefixWidth(line, depth)))
  }
  return out.join('\n')
}

export function inCodeAt(
  scan: Pick<DocScan, 'lines' | 'lineStarts' | 'fences'>,
  pos: number,
): boolean {
  return codeAt(scan, (i) => scan.fences[i] !== undefined, pos)
}

export function inCalloutAt(scan: DocScan, pos: number): boolean {
  if (pos < 0) return false
  return scan.callouts[lineIndexAt(scan, pos)] !== undefined
}

export function inSealedBlockAt(scan: LineScan, i: number): boolean {
  const at = scan.lineStarts[i]
  return (
    scan.fences[i] !== undefined ||
    spanAt(scan.maths, at) !== undefined ||
    spanAt(scan.tables, at) !== undefined
  )
}
