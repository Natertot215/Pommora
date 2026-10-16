import type { TokenOf } from '../Engine/tokens'
import { isPaint, type Paint } from '../Engine/paints'
import { parseListMarker, headingParts } from '../Engine/detect'
import { isQuoteToggleable, splitPrefix, underSelection } from './format'
import type { EditorMenuRequest } from '../../Actions/editorMenu'
import type { DocScan } from '../Engine/docScan'

export function readFormatState(
  scan: DocScan,
  selFrom: number,
  selTo: number,
): Omit<EditorMenuRequest, 'scope' | 'x' | 'y' | 'embedSeat' | 'citeSeat' | 'resting'> {
  const { from, to, ls, line, tokens, covering } = underSelection(scan, selFrom, selTo)
  const f = from - ls
  const t = to - ls
  const wraps = (kind: string): boolean => covering.some((tk) => tk.kind === kind)
  const painted = covering.find((tk): tk is TokenOf<Paint> => isPaint(tk.kind))

  // List/heading state reads the line's INNER body so a `> - item` reports as a list — the render layer shows the bullet behind the `>`, and the menu must agree with what the user sees.
  const { body } = splitPrefix(line)
  const lm = parseListMarker(body)
  const hm = headingParts(body)

  return {
    bold: wraps('bold'),
    italic: wraps('italic'),
    strikethrough: wraps('strikethrough'),
    painted: painted ? { paint: painted.kind, color: painted.color ?? 'accent' } : null,
    inlineCode: wraps('inlineCode'),
    link: tokens.some((tk) => tk.kind === 'link' && tk.range[0] <= f && t <= tk.range[1]),
    connection: tokens.some((tk) => tk.kind === 'wikiLink' && tk.range[0] <= f && t <= tk.range[1]),
    heading: hm ? hm.hashes.length : 0,
    list: lm?.kind ?? null,
    block: isQuoteToggleable(line) ? 'quote' : null,
  }
}
