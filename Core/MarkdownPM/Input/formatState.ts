import { tokenize, wrappedSpan } from '../Engine/tokens'
import { parseListMarker, headingParts } from '../Engine/detect'
import { isQuoteToggleable, splitPrefix } from './format'
import type { EditorMenuRequest } from '../../Actions/editorMenu'
import { lineStartAt, lineEndAt } from '../Engine/markdownCode'
import { type DocScan, inFenceAt } from '../Engine/docScan'

export function readFormatState(
  scan: DocScan,
  from: number,
  to: number,
): Omit<EditorMenuRequest, 'scope' | 'x' | 'y' | 'embedSeat' | 'citeSeat'> {
  const doc = scan.text
  // Inline marks are line-local, so only the caret's line is tokenized, in line-relative coords. A cross-line selection can't sit inside one inline token anyway.
  const ls = lineStartAt(doc, from)
  const le = lineEndAt(doc, from)
  const line = doc.slice(ls, le)
  const tokens = inFenceAt(scan, from) ? [] : tokenize(line)
  const f = from - ls
  const t = to - ls
  const wrapping = (kind: string) =>
    tokens.find((tk) => {
      const [s, e] = wrappedSpan(tk)
      return tk.kind === kind && s <= f && t <= e
    })
  const wraps = (kind: string): boolean => wrapping(kind) !== undefined
  const highlight = wrapping('highlight')

  // List/heading state reads the line's INNER body so a `> - item` reports as a list — the render layer shows the bullet behind the `>`, and the menu must agree with what the user sees.
  const { body } = splitPrefix(line)
  const lm = parseListMarker(body)
  const hm = headingParts(body)

  return {
    bold: wraps('bold'),
    italic: wraps('italic'),
    strikethrough: wraps('strikethrough'),
    highlight: highlight ? (highlight.color ?? 'accent') : null,
    inlineCode: wraps('inlineCode'),
    link: tokens.some((tk) => tk.kind === 'link' && tk.range[0] <= f && t <= tk.range[1]),
    connection: tokens.some((tk) => tk.kind === 'wikiLink' && tk.range[0] <= f && t <= tk.range[1]),
    heading: hm ? hm.hashes.length : 0,
    list: lm?.kind ?? null,
    block: isQuoteToggleable(line) ? 'quote' : null,
  }
}
