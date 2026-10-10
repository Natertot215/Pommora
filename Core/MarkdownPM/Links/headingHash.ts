import { linkDestinationStart, opensFragment } from '../../Connections/links'
import { type DocScan, inCodeNear } from '../Engine/docScan'
import { lineIndexAt } from '../Engine/markdownCode'
import { connectionAt, type Edit, openConnectionAt } from '../Input/edits'

// The one transform that fires only where a link names its page — a wikilink's title half or a markdown link's destination: every transform in `Input/edits.ts` stands down there, and the file only ever holds `#`. An alias or a label is prose, and a heading may hold the character.
export function headingHash(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  inserted: string,
): Edit | null {
  if (inserted !== '§' || inCodeNear(scan, selStart)) return null
  const li = lineIndexAt(scan, selStart)
  const from = selStart - scan.lineStarts[li]
  const to = selEnd - scan.lineStarts[li]
  const line = scan.lines[li]
  const title = (connectionAt(scan, selStart) ?? openConnectionAt(scan, selStart))?.title
  const dest = linkDestinationStart(line, from)
  const inTitle = title !== undefined && from >= title[0] && to <= title[1]
  const inPageHalf =
    dest !== null &&
    opensFragment(line.slice(dest, from)) &&
    linkDestinationStart(line, to) === dest
  if (!inTitle && !inPageHalf) return null
  return { from: selStart, to: selEnd, insert: '#', selection: selStart + 1 }
}
