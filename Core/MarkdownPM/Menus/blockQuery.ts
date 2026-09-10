import { inCodeAt, lineIndexAt, type DocScan } from '../Engine/docScan'

export interface BlockQuery {
  query: string
  from: number
  to: number
}

export function blockQueryAt(scan: DocScan, caret: number): BlockQuery | null {
  if (caret < 0) return null
  const i = lineIndexAt(scan, caret)
  const from = scan.lineStarts[i]
  const match = /^\/(\S*)$/.exec(scan.lines[i])
  if (!match || caret !== from + scan.lines[i].length) return null
  if (inCodeAt(scan, from) || scan.citations.mask[i]) return null
  const holds = (f: number, t: number): boolean => from >= f && from <= t
  if (scan.maths.some(([f, t]) => holds(f, t))) return null
  if (scan.tables.some((r) => holds(r.from, r.to))) return null
  return { query: match[1], from, to: caret }
}
