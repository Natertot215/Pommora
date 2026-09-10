import { inSealedBlockAt, lineIndexAt, type DocScan } from '../Engine/docScan'

export interface BlockQuery {
  query: string
  from: number
  to: number
}

export function blockQueryAt(scan: DocScan, caret: number): BlockQuery | null {
  const i = lineIndexAt(scan, caret)
  const from = scan.lineStarts[i]
  const match = /^\/(\S*)$/.exec(scan.lines[i])
  if (!match || caret !== from + scan.lines[i].length) return null
  if (inSealedBlockAt(scan, i) || scan.citations.mask[i]) return null
  return { query: match[1], from, to: caret }
}
