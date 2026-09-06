// Kept apart from the fold state machine so the block resolver can ask what a heading is without importing it.
import {
  headingParts,
  isHeadingLine,
  scanFencedCode,
  splitWithOffsets,
  type FenceInfo,
} from './detect'

/** `DocScan` satisfies it structurally, so a caller holding the cached whole-document scan asks without re-splitting. */
interface HeadingSrc {
  lines: string[]
  lineStarts: number[]
  headings: readonly boolean[]
  fences: readonly (FenceInfo | undefined)[]
}

export function headingSrc(text: string): HeadingSrc {
  const { lines, lineStarts } = splitWithOffsets(text)
  return {
    lines,
    lineStarts,
    headings: lines.map(isHeadingLine),
    fences: scanFencedCode(lines, lineStarts),
  }
}

interface HeadingSection {
  from: number
  lineEnd: number
  level: number
  key: string
  to: number
}

interface ScannedHeading {
  idx: number
  level: number
  text: string
  /** Ordinal-disambiguated identity — duplicate text stays tellable apart across renders and folds. */
  key: string
}

/** THE heading scan — the fold sections and the outline both read it, so the two can never disagree. */
function scanHeadings({ lines, headings, fences }: HeadingSrc): ScannedHeading[] {
  const heads: ScannedHeading[] = []
  const seen = new Map<string, number>()
  for (let i = 0; i < lines.length; i++) {
    // A `# comment` inside a code block is code: treating it as a heading corrupts drag extents and poisons the persisted fold keys.
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
  from: number
  level: number
  text: string
  key: string
}

/** `headingSections` drops body-less headings; an outline still lists them, or two consecutive headings would show only the second. */
export function headingOutline(doc: string): OutlineHeading[] {
  const src = headingSrc(doc)
  return scanHeadings(src).map((h) => ({
    from: src.lineStarts[h.idx],
    level: h.level,
    text: h.text,
    key: h.key,
  }))
}

/** Levels alone decide the span, so any level-bearing heading list works. */
export function sectionEnd(headings: readonly { level: number }[], start: number): number {
  for (let n = start + 1; n < headings.length; n++)
    if (headings[n].level <= headings[start].level) return n
  return headings.length
}

const sectionCache = new WeakMap<HeadingSrc, HeadingSection[]>()

/** A section reaching no body lines is dropped but still consumes its ordinal, so duplicate-text keys stay stable. */
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
    // Strictly more than one line past the heading: a body of one empty line hands out a chevron over a fold whose widget never renders.
    if (to > lineEnd + 1) out.push({ from, lineEnd, level, key, to })
  }
  sectionCache.set(src, out)
  return out
}
