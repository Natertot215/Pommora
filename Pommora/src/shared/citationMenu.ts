// The footnote right-click menus — one model behind both, so what a marker offers and what a
// citation offers can't come to depend on where either was clicked.
//
// Its own model rather than an arm of the link menu: that module states what a reader may do with a
// LINK, and its surface union is the editor and a property cell. A marker's Edit · Copy · Delete and
// a citation's Copy · Delete are a different vocabulary that happens to wear the same row shape.
//
// Copy puts the raw `[^label]` reference on the clipboard rather than the citation's text, because
// the reference IS the shareable thing: pasting it elsewhere in the page is the second reference,
// and that is the whole of how a footnote comes to be shared.

import type { ActionItem } from './menuModel'

/** Which construct was clicked. The two share every row they have in common. */
export type CitationSubject = 'marker' | 'citation'

export interface CitationMenuContext {
  subject: CitationSubject
  /** A read-only surface — an embed tile at rest, a hover card — offers what it can still do and
   *  nothing that would write. */
  editable: boolean
  /** Whether deleting this marker takes its citation with it: true when it is the last reference.
   *  Named on the row, so the menu says what the click will actually do. */
  lastReference?: boolean
}

export type CitationMenuAction = 'cite:edit' | 'cite:copy' | 'cite:delete'

export function citationMenuModel(ctx: CitationMenuContext): ActionItem<CitationMenuAction>[] {
  const rows: ActionItem<CitationMenuAction>[] = []
  // Only a marker has somewhere else to put the caret; a citation's own row already holds it.
  if (ctx.subject === 'marker' && ctx.editable)
    rows.push({ label: 'Edit Footnote', action: 'cite:edit' })
  // Edit and Copy are one group — both leave the document as they found it. The only divider stands
  // above Delete, which does not.
  rows.push({ label: 'Copy Reference', action: 'cite:copy' })
  if (ctx.editable)
    rows.push({
      // A citation IS the footnote, and a marker that is the last reference takes it with it.
      label:
        ctx.subject === 'citation' || ctx.lastReference ? 'Delete Footnote' : 'Delete Reference',
      action: 'cite:delete',
      separatorBefore: true,
    })
  return rows
}
