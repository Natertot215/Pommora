import { linkAt } from '../../Connections/connections'
import { linkDestinationStart, opensFragment } from '../../Connections/links'
import { type DocScan, inCodeAt } from '../Engine/docScan'
import { lineIndexAt } from '../Engine/markdownCode'
import type { Edit } from '../Input/edits'

function titleSpanAt(line: string, rel: number): [number, number] | null {
  const s = linkAt(line, rel)
  if (s) return s.title
  const opened = line.slice(rel - 2, rel) === '[[' && line[rel - 3] !== '!'
  return opened && /^(?:\||\]\])/.test(line.slice(rel)) ? [rel, rel] : null
}

// The one transform that fires only where a link names its page — a wikilink's title half or a markdown link's destination: every transform in `Input/edits.ts` stands down there, and the file only ever holds `#`. An alias or a label is prose, an embed takes no fragment, and a heading may hold the character.
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
  const line = scan.lines[li]
  const title = titleSpanAt(line, from)
  const dest = linkDestinationStart(line, from)
  const inTitle = title !== null && from >= title[0] && to <= title[1]
  const inPageHalf =
    dest !== null &&
    opensFragment(line.slice(dest, from)) &&
    linkDestinationStart(line, to) === dest
  if (!inTitle && !inPageHalf) return null
  return { from: selStart, to: selEnd, insert: '#', selection: selStart + 1 }
}
