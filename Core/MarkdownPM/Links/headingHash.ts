import type { DocScan } from '../Engine/docScan'
import { inCodeAt } from '../Engine/docScan'
import { isInsideWikilink } from '../Engine/parser'
import type { Edit } from '../Input/edits'

// The one transform that fires only inside a wikilink: every transform in `Input/edits.ts` stands down there, and the file only ever holds `#`.
export function headingHash(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  inserted: string,
): Edit | null {
  if (selStart !== selEnd || inserted !== '§' || inCodeAt(scan, selStart)) return null
  if (!isInsideWikilink(selStart, scan.text)) return null
  return { from: selStart, to: selStart, insert: '#', selection: selStart + 1 }
}
