// THE heading scan: what counts as a heading, what its foldable section spans, and the outline over
// the same walk. Kept apart from the fold state machine because both the folds and the block
// resolver read it, and neither of those should have to import the other to ask what a heading is.
import {
  headingParts,
  isHeadingLine,
  scanFencedCode,
  splitWithOffsets,
  type FenceInfo,
} from '../Detect'

/** What a heading scan reads. `DocScan` satisfies it structurally, so a caller already holding the
 *  cached whole-document scan asks without re-splitting the text or re-pairing a single fence. */
export interface HeadingSrc {
  lines: string[]
  lineStarts: number[]
  headings: readonly boolean[]
  /** Per line, set where a fenced block has claimed it — a `# comment` inside code is not a heading. */
  fences: readonly (FenceInfo | undefined)[]
}

/** The same source built from a bare string, for callers outside the editor holding a body rather
 *  than a live document. */
export function headingSrc(text: string): HeadingSrc {
  const { lines, lineStarts } = splitWithOffsets(text)
  return {
    lines,
    lineStarts,
    headings: lines.map(isHeadingLine),
    fences: scanFencedCode(lines, lineStarts),
  }
}

export interface HeadingSection {
  from: number
  /** End of the heading line's text — the body to fold begins on the next line. */
  lineEnd: number
  level: number
  /** Ordinal-disambiguated key for the saved fold set (stable across heading-level changes). */
  key: string
  /** End of the section: the last line before the next equal-or-higher heading (or document end). */
  to: number
}

interface ScannedHeading {
  idx: number
  level: number
  /** The heading's own text, markers stripped. */
  text: string
  /** Ordinal-disambiguated identity — duplicate text stays tellable apart across renders and folds. */
  key: string
}

/** Every heading line in document order. THE heading scan — the fold sections and the outline both
 *  read it, so the two can never disagree about what counts as a heading. */
function scanHeadings({ lines, headings, fences }: HeadingSrc): ScannedHeading[] {
  const heads: ScannedHeading[] = []
  const seen = new Map<string, number>()
  for (let i = 0; i < lines.length; i++) {
    // Fence parity: a `# comment` inside a code block is code, not a heading — treating it as one gives
    // it a chevron, corrupts heading-drag extents, and poisons the persisted fold keys.
    if (fences[i] || !headings[i]) continue
    const m = headingParts(lines[i])
    if (!m) continue
    const text = m.content.trim()
    const n = (seen.get(text) ?? 0) + 1
    seen.set(text, n)
    heads.push({ idx: i, level: m.hashes.length, text, key: n === 1 ? text : `${text} ${n}` })
  }
  return heads
}

export interface OutlineHeading {
  /** Offset of the heading line's start — what a jump scrolls to. */
  from: number
  level: number
  text: string
  key: string
}

/** Every heading, body-less ones included. `headingSections` drops those because there is nothing to
 *  fold; an outline still has to list them, or two consecutive headings would show only the second. */
export function headingOutline(doc: string): OutlineHeading[] {
  const src = headingSrc(doc)
  return scanHeadings(src).map((h) => ({
    from: src.lineStarts[h.idx],
    level: h.level,
    text: h.text,
    key: h.key,
  }))
}

/** Exclusive end index of the section heading `start` owns — the first later heading of
 *  equal-or-higher level, or the array end. Levels alone decide the span, so any level-bearing
 *  heading list works. */
export function sectionEnd(headings: readonly { level: number }[], start: number): number {
  for (let n = start + 1; n < headings.length; n++)
    if (headings[n].level <= headings[start].level) return n
  return headings.length
}

const sectionCache = new WeakMap<HeadingSrc, HeadingSection[]>()

/** Every heading's foldable section. A section reaching no body lines is dropped (nothing to fold),
 *  but still consumes its ordinal so duplicate-text keys stay stable. Held against the source it was
 *  read from — one derivation per document version, wherever the sections are asked for. */
export function headingSections(src: HeadingSrc): HeadingSection[] {
  const held = sectionCache.get(src)
  if (held) return held
  const { lines, lineStarts: starts } = src
  const heads = scanHeadings(src)

  const out: HeadingSection[] = []
  for (let h = 0; h < heads.length; h++) {
    const { idx, level, key } = heads[h]
    const next = sectionEnd(heads, h)
    const endLine = next < heads.length ? heads[next].idx - 1 : lines.length - 1
    const from = starts[idx]
    const lineEnd = from + lines[idx].length
    const to = starts[endLine] + lines[endLine].length
    // Strictly MORE than one line past the heading: a body of exactly one empty line has nothing to
    // collapse, and admitting it hands out a chevron over a fold whose widget never renders — so the
    // transition that ends the animation never fires and the entry strands mid-phase.
    if (to > lineEnd + 1) out.push({ from, lineEnd, level, key, to })
  }
  sectionCache.set(src, out)
  return out
}
