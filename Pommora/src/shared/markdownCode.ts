// Where code lives in a Markdown body — fenced blocks and inline `spans`. THE mask both the editor
// (tokenizing) and the write side (rewriting) read, so a `[[Title]]` shown in a code sample survives
// a rename of the page it names.

// Unanchored at the end on purpose: `.` excludes `\r`, so `(.*)` already stops at a CRLF line's
// carriage return, while a trailing `$` would fail to match past it and blank every fence.
const FENCE_RE = /^([ \t]*(?:>[ \t]?)*)(`{3,}|~{3,})[ \t]*(.*)/
const QUOTE_PREFIX_RE = /^[ \t]*(?:>[ \t]?)*/

export interface Fence {
  /** The `>` levels the line sits behind — a block pairs at one depth, so a quoted fence and a bare
   *  one never close each other. */
  depth: number
  /** '`' or '~' — a block pairs by marker too, so a ~~~ line inside a ``` block is content. */
  marker: string
  /** A closer needs a run at least this long. */
  length: number
  /** Everything after the run. An opener's info string; a closer is not allowed to carry one. */
  info: string
  /** Line-relative end of the quote prefix plus the marker run — where the info string begins,
   *  wherever the fence is indented and however long its run. */
  markerEnd: number
}

/** Each line's absolute start offset. */
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
  // A backtick fence's info string can't hold a backtick — ambiguous with an inline span — so the
  // line is prose instead. Tilde fences have no such restriction.
  if (m[2][0] === '`' && m[3].includes('`')) return null
  return {
    depth: quoteDepthOf(line),
    marker: m[2][0],
    length: m[2].length,
    info: m[3].trim(),
    markerEnd: m[1].length + m[2].length,
  }
}

/** An opener's language word — the first token of its info string. Bare fences and closers return ''. */
export function fenceLang(f: Fence): string {
  return /^[^`~\s]*/.exec(f.info)?.[0] ?? ''
}

/** Anything shorter, differently marked, or carrying an info word of its own is content, not a close —
 *  how a longer-fenced block holds shorter fence lines verbatim instead of ending at the first one. */
function fenceCloses(open: Fence, candidate: Fence): boolean {
  return (
    candidate.marker === open.marker &&
    candidate.depth === open.depth &&
    candidate.length >= open.length &&
    candidate.info === ''
  )
}

/** A line's quote depth: how many `>` levels it sits under, ignoring list indent. */
export function quoteDepthOf(line: string): number {
  return QUOTE_PREFIX_RE.exec(line)?.[0].match(/>/g)?.length ?? 0
}

/** A fenced block as line indices, `open`..`close` inclusive. An unclosed block runs to the document's
 *  end (or to where its surrounding blockquote stops, which a quoted fence cannot outlive). */
export interface FenceSpan {
  open: number
  close: number
  closed: boolean
  fence: Fence
}

/** THE fence pairing pass. Every layer that needs to know where code blocks are reads this one — a
 *  layer pairing fences for itself is how two of them come to disagree about the same document. */
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

/** Per-line membership: 1 where the line belongs to a fenced block, its own fence lines included.
 *  The shape a layer walking lines wants, so none of them re-derives it from the spans. */
export function fencedLineMask(lines: string[]): Uint8Array {
  const mask = new Uint8Array(lines.length)
  for (const span of fenceSpans(lines)) for (let k = span.open; k <= span.close; k++) mask[k] = 1
  return mask
}

/** Inline-span interiors on ONE line, as line-relative half-open ranges. Marker positions are
 *  boundaries, not interior, so the closing backtick still type-overs. An unclosed opener claims the
 *  rest of the line — while a span is being typed it's always unclosed, exactly when transforms must
 *  stay out. */
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

/** The body's code ranges, resolved in ONE pass, as a membership test. Build once per body and query
 *  per match — the per-offset form re-walks the whole document, O(doc × matches) over a scan or
 *  rename cascade. Pairing reuses `fenceSpans`, the same pass the editor renders from, so the two can
 *  never disagree about which bytes a rename may touch. */
export type CodeMask = (offset: number) => boolean

export function codeMask(text: string): CodeMask {
  const lines = text.split('\n')
  const fenced = fencedLineMask(lines)
  return codeMaskOf(lines, lineOffsetsOf(lines), (i) => fenced[i] === 1)
}

/** The same mask over a document already split and paired. For a caller holding the whole-document
 *  scan — pairing every fence again is the cost that makes a per-keystroke reader scale with
 *  document length. */
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
    // A run of fenced lines is one range; adjacent blocks merging is harmless since both sides of
    // the seam are code either way.
    const open = i
    while (i < lines.length && fencedLine(i)) i++
    const close = i - 1
    ranges.push([starts[open], starts[close] + lines[close].length + 1])
  }
  return (offset) => ranges.some(([a, b]) => offset >= a && offset < b)
}

/** Single-offset form, for callers holding one position rather than a run of matches. Fence pairing
 *  still has to start from the document's first line, but inline spans are line-local, so only the
 *  offset's own line is scanned for them. A caller with a run of offsets still wants `codeMask`. */
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

/** The inline half of `isInsideCode`, line-local — for a caller already holding a cached fence answer
 *  for the line, avoiding the whole-document form's per-document split-and-pair cost. */
export function isInsideInlineCode(line: string, offset: number): boolean {
  return inlineSpans(line).some(([a, b]) => offset >= a && offset < b)
}
