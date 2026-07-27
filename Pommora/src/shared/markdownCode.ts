// Where code lives in a Markdown body — fenced blocks and inline `spans`. THE mask both processes
// read: the editor refuses to tokenize a construct inside code, and the write side refuses to
// rewrite one, so a `[[Title]]` shown in a code sample survives a rename of the page it names.
// Pure: no fs, no React.

const FENCE_OPEN = /^\s*(```|~~~)/

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
 *  An offset on a fence line counts as inside (the fence is part of the construct). Fences pair by
 *  marker character, so a ~~~ line inside a ``` block is content and vice versa. */
export function codeMask(text: string): (offset: number) => boolean {
  const ranges: [number, number][] = []
  let pos = 0
  let fence: '`' | '~' | null = null
  for (const line of text.split('\n')) {
    const lineEnd = pos + line.length
    const marker = FENCE_OPEN.exec(line)?.[1][0] as '`' | '~' | undefined
    if (marker && (fence === null || fence === marker)) {
      ranges.push([pos, lineEnd + 1])
      fence = fence === null ? marker : null
    } else if (fence !== null) {
      ranges.push([pos, lineEnd + 1])
    } else {
      for (const [a, b] of inlineSpans(line)) ranges.push([pos + a, pos + b])
    }
    pos = lineEnd + 1
  }
  return (offset) => ranges.some(([a, b]) => offset >= a && offset < b)
}

/** Single-offset form, for callers holding one position rather than a run of matches. */
export function isInsideCode(offset: number, text: string): boolean {
  return codeMask(text)(offset)
}
