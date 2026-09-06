import { capSet } from '../../Utilities/capMap'
import { codeMaskOf, isInsideInlineCode } from '@pommora/core/Connections/markdownCode'
import {
  isThematicBreakLine,
  isHeadingLine,
  isBlockquoteLine,
  calloutLines,
  fenceRangesOf,
  scanFencedCode,
  splitWithOffsets,
  type CalloutLine,
  type DocLines,
  type FenceInfo,
} from './detect'
import { docLineScan, type DocLineScan } from './embedRanges'
import { tableRegions, type TableRegion } from './Tables/regions'

export function quotePrefixWidth(line: string, levels: number): number {
  if (levels === 0) return 0
  let w = /^[ \t]*/.exec(line)?.[0].length ?? 0
  for (let k = 0; k < levels && line[w] === '>'; k++)
    w += line[w + 1] === ' ' || line[w + 1] === '\t' ? 2 : 1
  return w
}

/** Every whole-document derivation the editor reads. Pure on `text`, so per-keystroke callers cache one per doc VERSION. */
export interface DocScan extends DocLines, DocLineScan {
  fences: (FenceInfo | undefined)[]
  callouts: (CalloutLine | undefined)[]
  tables: TableRegion[]
  headings: boolean[]
  quotes: boolean[]
  breaks: boolean[]
  /** A closed top-level fence owns its bytes outright, so a `>` inside one is code text; an unclosed fence keeps its quote chrome while being typed, and a quoted fence keeps its box. */
  literal: boolean[]
}

export function scanDoc(text: string): DocScan {
  const d = splitWithOffsets(text)
  const { lines, lineStarts } = d
  const fences = scanFencedCode(lines, lineStarts)
  const inCode = codeMaskOf(lines, lineStarts, (i) => fences[i] !== undefined)
  const tables = tableRegions(d, inCode)
  return {
    ...d,
    fences,
    callouts: calloutLines(lines, fences),
    tables,
    ...docLineScan(d, fenceRangesOf(fences), tables, inCode),
    headings: lines.map(isHeadingLine),
    quotes: lines.map(isBlockquoteLine),
    breaks: lines.map(isThematicBreakLine),
    literal: fences.map((f) => f?.closed === true && f.depth === 0),
  }
}

export function codeBlockTextAt(scan: DocScan, pos: number): string {
  const start = lineIndexAt(scan, pos)
  const depth = scan.fences[start]?.depth ?? 0
  const out: string[] = []
  for (let i = start + 1; i < scan.lines.length; i++) {
    if (scan.fences[i]?.role !== 'content') break
    const line = scan.lines[i]
    out.push(line.slice(quotePrefixWidth(line, depth)))
  }
  return out.join('\n')
}

export function lineIndexAt(scan: DocScan, pos: number): number {
  const { lines, lineStarts } = scan
  let lo = 0
  let hi = lines.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (lineStarts[mid] <= pos) lo = mid
    else hi = mid - 1
  }
  return lo
}

export function inCodeAt(scan: DocScan, pos: number): boolean {
  if (pos < 0) return false
  const i = lineIndexAt(scan, pos)
  return scan.fences[i] !== undefined || isInsideInlineCode(scan.lines[i], pos - scan.lineStarts[i])
}

export function inCalloutAt(scan: DocScan, pos: number): boolean {
  if (pos < 0) return false
  return scan.callouts[lineIndexAt(scan, pos)] !== undefined
}

/** A few texts rather than one, because more than one page can be on screen and a single slot would let their renders evict each other. */
const TEXT_SLOTS = 4
export function perText<T>(derive: (text: string) => T): (text: string) => T {
  const held = new Map<string, T>()
  return (text) => {
    const hit = held.get(text)
    if (hit !== undefined) return hit
    const v = derive(text)
    capSet(held, text, v, TEXT_SLOTS)
    return v
  }
}

export const scanOf = perText(scanDoc)
