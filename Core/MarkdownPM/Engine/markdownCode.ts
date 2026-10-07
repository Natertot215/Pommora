// Unanchored at the end on purpose: `.` excludes `\r`, so `(.*)` stops at a CRLF line's carriage return, while a trailing `$` would fail past it and blank every fence.
const FENCE_RE = /^([ \t]*)(`{3,}|~{3,})[ \t]*(.*)/
// A quote marker is a run of `>` followed by whitespace or the line's end, so `>a` is prose at any depth.
const QUOTE_MARKERS = String.raw`(?:>+(?:[ \t]|(?=\r?$)))+`
// Four columns of indent make a line indented code rather than a quote.
const QUOTE_PREFIX_RE = new RegExp(`^ {0,3}${QUOTE_MARKERS}`)
// The fence grammar takes any indent, so a quote nested under an indented list item still quotes its fence.
const FENCE_QUOTE_RE = new RegExp(String.raw`^[ \t]*${QUOTE_MARKERS}`)

export interface TextEdit {
  from: number
  to: number
  insert: string
}

export function applyEdits(
  text: string,
  edits: readonly TextEdit[],
  from = 0,
  to = text.length,
): string {
  let out = ''
  let at = from
  for (const e of [...edits].sort((a, b) => a.from - b.from)) {
    out += text.slice(at, e.from) + e.insert
    at = e.to
  }
  return out + text.slice(at, to)
}

interface Fence {
  depth: number
  marker: string
  length: number
  info: string
  indent: number
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

export const quotePrefix = (line: string): string => QUOTE_PREFIX_RE.exec(line)?.[0] ?? ''

export const isBlockquoteLine = (line: string): boolean => QUOTE_PREFIX_RE.test(line)

const fenceQuote = (line: string): string => FENCE_QUOTE_RE.exec(line)?.[0] ?? ''

const depthOf = (quote: string): number => quote.split('>').length - 1

export const quoteDepthOf = (line: string): number => depthOf(fenceQuote(line))

export function quotePrefixWidth(line: string, levels: number): number {
  if (levels === 0) return 0
  const quote = fenceQuote(line)
  let w = quote.length - quote.trimStart().length
  for (let k = 0; k < levels && quote[w] === '>'; k++)
    w += quote[w + 1] === ' ' || quote[w + 1] === '\t' ? 2 : 1
  return w
}

export function fenceAt(line: string): Fence | null {
  const quote = fenceQuote(line)
  const m = FENCE_RE.exec(line.slice(quote.length))
  if (!m) return null
  // A backtick fence's info string can't hold a backtick (ambiguous with an inline span).
  if (m[2][0] === '`' && m[3].includes('`')) return null
  return {
    depth: depthOf(quote),
    marker: m[2][0],
    length: m[2].length,
    info: m[3].trim(),
    indent: m[1].length,
    markerEnd: quote.length + m[1].length + m[2].length,
  }
}

function fenceCloses(open: Fence, candidate: Fence): boolean {
  return (
    candidate.marker === open.marker &&
    candidate.depth === open.depth &&
    candidate.length >= open.length &&
    candidate.info === ''
  )
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
export function inlineSpans(line: string): [number, number, number][] {
  const spans: [number, number, number][] = []
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
      spans.push([contentStart, line.length + 1, openLen])
      return spans
    }
    spans.push([contentStart, closeStart, openLen])
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

export const lineStartAt = (doc: string, pos: number): number =>
  pos <= 0 ? 0 : doc.lastIndexOf('\n', pos - 1) + 1
export const lineEndAt = (doc: string, pos: number): number => {
  const i = doc.indexOf('\n', pos)
  return i === -1 ? doc.length : i
}

export const trimmedRange = (doc: string, from: number, to: number): [number, number] => {
  let f = from
  let t = to
  while (f < t && /\s/.test(doc[f])) f++
  while (t > f && /\s/.test(doc[t - 1])) t--
  return f === t ? [from, to] : [f, t]
}

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
