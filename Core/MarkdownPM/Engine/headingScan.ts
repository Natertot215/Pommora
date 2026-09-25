// Kept apart from the fold state machine so the block resolver can ask what a heading is without importing it.
import { headingParts } from './detect'
import { type DocScan, inSealedBlockAt, scanDoc } from './docScan'

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
  key: string
}

function scanHeadings(s: DocScan): ScannedHeading[] {
  const heads: ScannedHeading[] = []
  const seen = new Map<string, number>()
  for (let i = 0; i < s.lines.length; i++) {
    // A `# comment` inside a code or math block is that block's text: treating it as a heading corrupts drag extents and poisons the persisted fold keys.
    if (!s.headings[i] || inSealedBlockAt(s, i)) continue
    const m = headingParts(s.lines[i])
    if (!m) continue
    const text = m.content.trim()
    const n = (seen.get(text) ?? 0) + 1
    seen.set(text, n)
    heads.push({ idx: i, level: m.hashes.length, text, key: n === 1 ? text : `${text}\u0000${n}` })
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
export function headingOutlineOf(src: DocScan): OutlineHeading[] {
  return scanHeadings(src).map((h) => ({
    from: src.lineStarts[h.idx],
    level: h.level,
    text: h.text,
    key: h.key,
  }))
}

export const headingOutline = (doc: string): OutlineHeading[] => headingOutlineOf(scanDoc(doc))

export function sectionEnd(headings: readonly { level: number }[], start: number): number {
  for (let n = start + 1; n < headings.length; n++)
    if (headings[n].level <= headings[start].level) return n
  return headings.length
}

const sectionCache = new WeakMap<DocScan, HeadingSection[]>()

/** A section reaching no body lines is dropped but still consumes its ordinal, so duplicate-text keys stay stable. */
export function headingSections(scan: DocScan): HeadingSection[] {
  const held = sectionCache.get(scan)
  if (held) return held
  const { lines, lineStarts: starts, citations } = scan
  const heads = scanHeadings(scan)

  const out: HeadingSection[] = []
  for (let h = 0; h < heads.length; h++) {
    const { idx, level, key } = heads[h]
    const next = sectionEnd(heads, h)
    const endLine = next < heads.length ? heads[next].idx - 1 : citations.firstLine - 1
    const from = starts[idx]
    const lineEnd = from + lines[idx].length
    const to = starts[endLine] + lines[endLine].length
    // Strictly more than one line past the heading: a body of one empty line hands out a chevron over a fold whose widget never renders.
    if (to > lineEnd + 1) out.push({ from, lineEnd, level, key, to })
  }
  sectionCache.set(scan, out)
  return out
}
