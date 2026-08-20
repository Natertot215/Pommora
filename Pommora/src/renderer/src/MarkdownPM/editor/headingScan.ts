// THE heading scan: what counts as a heading, what its foldable section spans, and the outline over
// the same walk. Kept apart from the fold state machine because both the folds and the block
// resolver read it, and neither of those should have to import the other to ask what a heading is.
import { fencedLineMask } from '@shared/markdownCode'
import { headingParts, isHeadingLine, lineOffsets, splitWithOffsets } from '../detect'

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
function scanHeadings(lines: string[]): ScannedHeading[] {
  const heads: ScannedHeading[] = []
  const seen = new Map<string, number>()
  // Fence parity: a `# comment` inside a code block is code, not a heading — treating it as one gives it
  // a chevron, corrupts heading-drag extents, and poisons the persisted fold keys.
  const fenced = fencedLineMask(lines)
  for (let i = 0; i < lines.length; i++) {
    if (fenced[i]) continue
    if (!isHeadingLine(lines[i])) continue
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
  const { lines, lineStarts } = splitWithOffsets(doc)
  return scanHeadings(lines).map((h) => ({
    from: lineStarts[h.idx],
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

/** Every heading's foldable section. A section reaching no body lines is dropped (nothing to fold),
 *  but still consumes its ordinal so duplicate-text keys stay stable. */
export function headingSections(doc: string): HeadingSection[] {
  const lines = doc.split('\n')
  const starts = lineOffsets(lines)
  const heads = scanHeadings(lines)

  const out: HeadingSection[] = []
  for (let h = 0; h < heads.length; h++) {
    const { idx, level, key } = heads[h]
    let endLine = lines.length - 1
    for (let n = h + 1; n < heads.length; n++) {
      if (heads[n].level <= level) {
        endLine = heads[n].idx - 1
        break
      }
    }
    const from = starts[idx]
    const lineEnd = from + lines[idx].length
    const to = starts[endLine] + lines[endLine].length
    if (to > lineEnd) out.push({ from, lineEnd, level, key, to })
  }
  return out
}
