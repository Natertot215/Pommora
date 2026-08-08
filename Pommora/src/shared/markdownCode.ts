// Where code lives in a Markdown body — fenced blocks and inline `spans`. THE mask both processes
// read: the editor refuses to tokenize a construct inside code, and the write side refuses to
// rewrite one, so a `[[Title]]` shown in a code sample survives a rename of the page it names.
// Pure: no fs, no React.

// A fence's marker-run LENGTH is part of its identity — it's what lets a longer fence hold shorter ones
// as literal text.
// Unanchored at the end on purpose: `.` excludes `\r`, so `(.*)` already stops at a CRLF line's carriage
// return, while a trailing `$` would fail to match past it and blank every fence in the document.
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
  // A backtick fence's info string may hold no backtick — the run would be ambiguous with an inline
  // span, so the line is prose. Tilde fences carry no such restriction.
  if (m[2][0] === '`' && m[3].includes('`')) return null
  return {
    depth: quoteDepthOf(line),
    marker: m[2][0],
    length: m[2].length,
    info: m[3].trim(),
    markerEnd: m[1].length + m[2].length,
  }
}

/** An opener's language word — the first token of its info string (```` ``` json extra ```` types as
 *  json). Bare fences and every closer return ''. */
export function fenceLang(f: Fence): string {
  return /^[^`~\s]*/.exec(f.info)?.[0] ?? ''
}

/** Anything shorter, differently marked, or carrying an info word of its own is content, not a close —
 *  which is how a ````` block holds ``` lines verbatim instead of ending at the first one. */
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

/** Inline-span interiors on ONE line, as line-relative half-open ranges. A span opens with a run of
 *  N backticks and closes with a matching run; the marker positions are boundaries, NOT interior —
 *  so the closing backtick of `code|` still type-overs. An UNCLOSED opener claims the rest of the
 *  line: while a span is being typed it is always unclosed, and that is exactly when transforms
 *  must already stay out. */
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

/** The body's code ranges, resolved in ONE pass, as a membership test. Build it once per body and
 *  query it per match — the per-offset form re-walks the whole document, which is O(doc × matches)
 *  over a scan or a rename cascade.
 *
 *  An offset on a fence line counts as inside (the fence is part of the construct). Pairing is
 *  `fenceSpans`' — the same pass the editor renders from, so the two can never disagree about which
 *  bytes a rename is allowed to touch. */
export function codeMask(text: string): (offset: number) => boolean {
  const lines = text.split('\n')
  const starts = lineOffsetsOf(lines)
  const ranges: [number, number][] = []
  const fenced = new Uint8Array(lines.length)
  for (const span of fenceSpans(lines)) {
    for (let k = span.open; k <= span.close; k++) fenced[k] = 1
    ranges.push([starts[span.open], starts[span.close] + lines[span.close].length + 1])
  }
  for (let i = 0; i < lines.length; i++) {
    if (fenced[i]) continue
    for (const [a, b] of inlineSpans(lines[i])) ranges.push([starts[i] + a, starts[i] + b])
  }
  return (offset) => ranges.some(([a, b]) => offset >= a && offset < b)
}

/** Single-offset form, for callers holding one position rather than a run of matches. Fence pairing
 *  has to start from the document's first line — a line cannot know it sits in a block without them —
 *  but inline spans are a line-local question, so only the offset's own line is scanned for them.
 *  Answers exactly what `codeMask` answers; a caller with a run of offsets still wants that instead. */
export function isInsideCode(offset: number, text: string): boolean {
  if (offset < 0) return false
  const lines = text.split('\n')
  const fenced = fencedLineMask(lines)
  for (let i = 0, start = 0; i < lines.length; i++) {
    const next = start + lines[i].length + 1
    if (offset < next) {
      if (fenced[i]) return true
      const rel = offset - start
      return inlineSpans(lines[i]).some(([a, b]) => rel >= a && rel < b)
    }
    start = next
  }
  return false
}
