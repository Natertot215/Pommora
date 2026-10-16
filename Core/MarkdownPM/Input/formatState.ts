import { insideMark, type TokenOf, tokenize } from '../Engine/tokens'
import { isPaint, type Paint } from '../Engine/paints'
import { parseListMarker, headingParts } from '../Engine/detect'
import { innerRange, isQuoteToggleable, splitPrefix } from './format'
import type { EditorMenuRequest } from '../../Actions/editorMenu'
import { lineStartAt, lineEndAt, trimmedRange } from '../Engine/markdownCode'
import { type DocScan, inFenceAt } from '../Engine/docScan'

export function readFormatState(
  scan: DocScan,
  selFrom: number,
  selTo: number,
): Omit<EditorMenuRequest, 'scope' | 'x' | 'y' | 'embedSeat' | 'citeSeat' | 'resting'> {
  const doc = scan.text
  const [from, to] = trimmedRange(doc, selFrom, selTo)
  // Inline marks are line-local, so only the caret's line is tokenized, in line-relative coords. A cross-line selection can't sit inside one inline token anyway.
  const ls = lineStartAt(doc, from)
  const le = lineEndAt(doc, from)
  const line = doc.slice(ls, le)
  const tokens = inFenceAt(scan, from) ? [] : tokenize(line)
  const f = from - ls
  const t = to - ls
  const [mf, mt] = innerRange(line, f, t)
  const wraps = (kind: string): boolean =>
    tokens.some((tk) => tk.kind === kind && insideMark(tk, mf, mt))
  const painted = tokens.find(
    (tk): tk is TokenOf<Paint> => isPaint(tk.kind) && insideMark(tk, mf, mt),
  )

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
