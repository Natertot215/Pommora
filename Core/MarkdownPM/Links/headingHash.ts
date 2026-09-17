import { linkAt } from '@pommora/core/Connections/connections'
import type { DocScan } from '../Engine/docScan'
import { inCodeAt, lineIndexAt } from '../Engine/docScan'
import type { Edit } from '../Input/edits'

// The one transform that fires only inside a wikilink's title half: every transform in `Input/edits.ts` stands down there, and the file only ever holds `#`. An alias is prose, an embed takes no fragment, and a heading may hold the character.
export function headingHash(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  inserted: string,
): Edit | null {
  if (selStart !== selEnd || inserted !== '§' || inCodeAt(scan, selStart)) return null
  const li = lineIndexAt(scan, selStart)
  const rel = selStart - scan.lineStarts[li]
  const s = linkAt(scan.lines[li], rel)
  if (!s || rel < s.title[0] || rel > s.title[1]) return null
  return { from: selStart, to: selStart, insert: '#', selection: selStart + 1 }
}
