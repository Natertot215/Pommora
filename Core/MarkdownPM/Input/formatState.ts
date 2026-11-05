import type { TokenOf } from '../Engine/tokens'
import { isPaint, type Paint } from '../Engine/paints'
import { headingParts, type MarkdownScope } from '../Engine/detect'
import { isQuoteToggleable, listKindOf, splitPrefix, underSelection } from './format'
import type { EditorMenuRequest } from '../../Actions/editorMenu'
import type { DocScan } from '../Engine/docScan'
import { lineIndexAt } from '../Engine/markdownCode'
import type { Personalization } from '../../Settings/personalization'

export function readFormatState(
  scan: DocScan,
  selFrom: number,
  selTo: number,
  settings: Personalization,
  scope: MarkdownScope,
): Omit<EditorMenuRequest, 'scope' | 'x' | 'y' | 'embedSeat' | 'citeSeat' | 'resting'> {
  const { from, to, ls, line, tokens, covering } = underSelection(scan, selFrom, selTo)
  const lineFrom = from - ls
  const lineTo = to - ls
  const wraps = (kind: string): boolean => covering.some((tk) => tk.kind === kind)
  const painted = covering.find((tk): tk is TokenOf<Paint> => isPaint(tk.kind))
  const fenced = scope === 'page' && scan.fences[lineIndexAt(scan, selFrom)] !== undefined

  // Heading state reads the line's INNER body so a `> # item` reports as a heading — the render layer draws it behind the `>`, and the menu must agree with what the user sees.
  const hm = headingParts(splitPrefix(line, scope).body)

  return {
    bold: wraps('bold'),
    italic: wraps('italic'),
    strikethrough: wraps('strikethrough'),
    painted: painted ? { paint: painted.kind, color: painted.color ?? 'accent' } : null,
    inlineCode: wraps('inlineCode'),
    link: tokens.some(
      (tk) => tk.kind === 'link' && tk.range[0] <= lineFrom && lineTo <= tk.range[1],
    ),
    connection: tokens.some(
      (tk) => tk.kind === 'wikiLink' && tk.range[0] <= lineFrom && lineTo <= tk.range[1],
    ),
    heading: hm ? hm.hashes.length : 0,
    list: listKindOf(scan, selFrom, selTo, settings, scope),
    block: fenced ? 'code' : isQuoteToggleable(line) ? 'quote' : null,
  }
}
