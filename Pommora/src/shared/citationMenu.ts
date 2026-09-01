// The footnote right-click menus — one model behind both, so what a marker offers and what a
// citation offers can't come to depend on where either was clicked. Its own model rather than an
// arm of the link menu, since Edit · Copy · Delete here is a different vocabulary from a link's.
//
// Copy puts the raw `[^label]` reference on the clipboard rather than the citation's text, because
// the reference IS the shareable thing — pasting it elsewhere in the page is the second reference,
// and that is the whole of how a footnote comes to be shared.

import type { ActionItem } from './menuModel'

/** Which construct was clicked. The two share every row they have in common. */
export type CitationSubject = 'marker' | 'citation'

export interface CitationMenuContext {
  subject: CitationSubject
  /** A read-only surface — an embed tile at rest, a hover card — offers what it can still do and
   *  nothing that would write. */
  editable: boolean
}

export type CitationMenuAction = 'cite:edit' | 'cite:copy' | 'cite:delete'

export function citationMenuModel(ctx: CitationMenuContext): ActionItem<CitationMenuAction>[] {
  const rows: ActionItem<CitationMenuAction>[] = []
  // Only a marker has somewhere else to put the caret; a citation's own row already holds it.
  if (ctx.subject === 'marker' && ctx.editable) rows.push({ label: 'Edit', action: 'cite:edit' })
  // Edit and Copy leave the document as they found it; Delete does not, so it takes the divider —
  // but only where more than one row stands above it.
  rows.push({ label: 'Copy', action: 'cite:copy' })
  if (ctx.editable)
    rows.push({ label: 'Delete', action: 'cite:delete', separatorBefore: rows.length > 1 })
  return rows
}
