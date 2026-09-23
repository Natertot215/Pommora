import { linkAt } from '@pommora/core/Connections/connections'
import { type DocScan, inCodeAt } from '../Engine/docScan'
import { lineIndexAt } from '../Engine/markdownCode'
import type { Edit } from '../Input/edits'

function titleSpanAt(line: string, rel: number): [number, number] | null {
  const s = linkAt(line, rel)
  if (s) return s.title
  const opened = line.slice(rel - 2, rel) === '[[' && line[rel - 3] !== '!'
  return opened && /^(?:\||\]\])/.test(line.slice(rel)) ? [rel, rel] : null
}

// The one transform that fires only inside a wikilink's title half: every transform in `Input/edits.ts` stands down there, and the file only ever holds `#`. An alias is prose, an embed takes no fragment, and a heading may hold the character.
export function headingHash(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  inserted: string,
): Edit | null {
  if (inserted !== '§' || inCodeAt(scan, selStart) || inCodeAt(scan, selStart - 1)) return null
  const li = lineIndexAt(scan, selStart)
  const from = selStart - scan.lineStarts[li]
  const to = selEnd - scan.lineStarts[li]
  const title = titleSpanAt(scan.lines[li], from)
  if (!title || from < title[0] || to > title[1]) return null
  return { from: selStart, to: selEnd, insert: '#', selection: selStart + 1 }
}
