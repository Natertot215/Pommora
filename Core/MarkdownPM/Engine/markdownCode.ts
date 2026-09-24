// Unanchored at the end on purpose: `.` excludes `\r`, so `(.*)` stops at a CRLF line's carriage return, while a trailing `$` would fail past it and blank every fence.
const FENCE_RE = /^([ \t]*(?:>[ \t]?)*[ \t]*)(`{3,}|~{3,})[ \t]*(.*)/
const QUOTE_PREFIX_RE = /^[ \t]*(?:>[ \t]?)*/

interface Fence {
  depth: number
  marker: string
  length: number
  info: string
  markerEnd: number
}

export function lineOffsetsOf(lines: string[]): number[] {
  const out = new Array<number>(lines.length)
  for (let p = 0, i = 0; i < lines.length; i++) {
    out[i] = p
    p += lines[i].length + 1
  }
  return out
}

export function fenceAt(line: string): Fence | null {
  const m = FENCE_RE.exec(line)
  if (!m) return null
  // A backtick fence's info string can't hold a backtick (ambiguous with an inline span).
  if (m[2][0] === '`' && m[3].includes('`')) return null
  return {
    depth: quoteDepthOf(line),
    marker: m[2][0],
    length: m[2].length,
    info: m[3].trim(),
    markerEnd: m[1].length + m[2].length,
  }
}

export function fenceLang(f: Fence): string {
  return /^[^`~\s]*/.exec(f.info)?.[0] ?? ''
}

function fenceCloses(open: Fence, candidate: Fence): boolean {
  return (
    candidate.marker === open.marker &&
    candidate.depth === open.depth &&
    candidate.length >= open.length &&
    candidate.info === ''
  )
}

export function quoteDepthOf(line: string): number {
  return QUOTE_PREFIX_RE.exec(line)?.[0].match(/>/g)?.length ?? 0
}

interface FenceSpan {
  open: number
  close: number
  fence: Fence
}

// The one fence-pairing pass; a layer pairing fences for itself is how two of them come to disagree about the same document. A block needs its closer: an opener nothing closes before the document or its blockquote ends is a line of prose, where CommonMark would run it to the end.
export function fenceSpans(lines: string[]): FenceSpan[] {
  const spans: FenceSpan[] = []
  for (let i = 0; i < lines.length; i++) {
    const open = fenceAt(lines[i])
    if (open === null) continue
    for (let j = i + 1; j < lines.length && quoteDepthOf(lines[j]) >= open.depth; j++) {
      const f = fenceAt(lines[j])
      if (f === null || !fenceCloses(open, f)) continue
      spans.push({ open: i, close: j, fence: open })
      i = j
      break
    }
  }
  return spans
}

function fencedLineMask(lines: string[]): Uint8Array {
  const mask = new Uint8Array(lines.length)
  for (const span of fenceSpans(lines)) for (let k = span.open; k <= span.close; k++) mask[k] = 1
  return mask
}

// Marker positions are boundaries, not interior, so the closing backtick still type-overs. An unclosed opener claims the rest of the line, which is exactly when transforms must stay out.
export function inlineSpans(line: string): [number, number][] {
  const spans: [number, number][] = []
  let i = 0
  while (i < line.length) {
    if (line[i] !== '`') {
      i++
      continue
    }
    let openLen = 1
    while (line[i + openLen] === '`') openLen++
    const contentStart = i + openLen
    let j = contentStart
    let closeStart = -1
    while (j < line.length) {
      if (line[j] !== '`') {
        j++
        continue
      }
      let runLen = 1
      while (line[j + runLen] === '`') runLen++
      if (runLen === openLen) {
        closeStart = j
        break
      }
      j += runLen
    }
    if (closeStart === -1) {
      spans.push([contentStart, line.length + 1])
      return spans
    }
    spans.push([contentStart, closeStart])
    i = closeStart + openLen
  }
  return spans
}

export type CodeMask = (offset: number) => boolean

type LineTable = { readonly lines: readonly string[]; readonly lineStarts: readonly number[] }

export function lineIndexAt(d: LineTable, pos: number): number {
  const { lines, lineStarts } = d
  let lo = 0
  let hi = lines.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (lineStarts[mid] <= pos) lo = mid
    else hi = mid - 1
  }
  return lo
}

export const lineEndOf = (d: LineTable, line: number): number =>
  d.lineStarts[line] + d.lines[line].length

export function codeAt(d: LineTable, fenced: (line: number) => boolean, offset: number): boolean {
  if (offset < 0 || offset > lineEndOf(d, d.lines.length - 1)) return false
  const i = lineIndexAt(d, offset)
  return fenced(i) || isInsideInlineCode(d.lines[i], offset - d.lineStarts[i])
}

export function codeMask(text: string): CodeMask {
  const lines = text.split('\n')
  const d = { lines, lineStarts: lineOffsetsOf(lines) }
  const fenced = fencedLineMask(lines)
  return (offset) => codeAt(d, (i) => fenced[i] === 1, offset)
}

function isInsideInlineCode(line: string, offset: number): boolean {
  return inlineSpans(line).some(([a, b]) => offset >= a && offset < b)
}
