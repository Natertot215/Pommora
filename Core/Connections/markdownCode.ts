// Unanchored at the end on purpose: `.` excludes `\r`, so `(.*)` stops at a CRLF line's carriage
// return, while a trailing `$` would fail past it and blank every fence.
const FENCE_RE = /^([ \t]*(?:>[ \t]?)*)(`{3,}|~{3,})[ \t]*(.*)/
const QUOTE_PREFIX_RE = /^[ \t]*(?:>[ \t]?)*/

export interface Fence {
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

function fenceAt(line: string): Fence | null {
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

export interface FenceSpan {
  open: number
  close: number
  closed: boolean
  fence: Fence
}

// The one fence-pairing pass; a layer pairing fences for itself is how two of them come to
// disagree about the same document. An unclosed block runs to the document's end or to where
// its surrounding blockquote stops.
export function fenceSpans(lines: string[]): FenceSpan[] {
  const spans: FenceSpan[] = []
  let i = 0
  while (i < lines.length) {
    const open = fenceAt(lines[i])
    if (open === null) {
      i++
      continue
    }
    let j = i + 1
    let closed = false
    while (j < lines.length) {
      const f = fenceAt(lines[j])
      if (f !== null && fenceCloses(open, f)) {
        closed = true
        break
      }
      if (quoteDepthOf(lines[j]) < open.depth) break
      j++
    }
    spans.push({ open: i, close: closed ? j : j - 1, closed, fence: open })
    i = closed ? j + 1 : j
  }
  return spans
}

export function fencedLineMask(lines: string[]): Uint8Array {
  const mask = new Uint8Array(lines.length)
  for (const span of fenceSpans(lines)) for (let k = span.open; k <= span.close; k++) mask[k] = 1
  return mask
}

// Marker positions are boundaries, not interior, so the closing backtick still type-overs. An
// unclosed opener claims the rest of the line, which is exactly when transforms must stay out.
function inlineSpans(line: string): [number, number][] {
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

export function codeMask(text: string): CodeMask {
  const lines = text.split('\n')
  const fenced = fencedLineMask(lines)
  return codeMaskOf(lines, lineOffsetsOf(lines), (i) => fenced[i] === 1)
}

export function codeMaskOf(
  lines: string[],
  starts: number[],
  fencedLine: (i: number) => boolean,
): CodeMask {
  const ranges: [number, number][] = []
  let i = 0
  while (i < lines.length) {
    if (!fencedLine(i)) {
      for (const [a, b] of inlineSpans(lines[i])) ranges.push([starts[i] + a, starts[i] + b])
      i++
      continue
    }
    const open = i
    while (i < lines.length && fencedLine(i)) i++
    const close = i - 1
    ranges.push([starts[open], starts[close] + lines[close].length + 1])
  }
  return (offset) => ranges.some(([a, b]) => offset >= a && offset < b)
}

export function isInsideCode(offset: number, text: string): boolean {
  if (offset < 0) return false
  const lines = text.split('\n')
  const fenced = fencedLineMask(lines)
  for (let i = 0, start = 0; i < lines.length; i++) {
    const next = start + lines[i].length + 1
    if (offset < next) return fenced[i] === 1 || isInsideInlineCode(lines[i], offset - start)
    start = next
  }
  return false
}

export function isInsideInlineCode(line: string, offset: number): boolean {
  return inlineSpans(line).some(([a, b]) => offset >= a && offset < b)
}
