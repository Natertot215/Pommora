// Copy puts the raw `[^label]` reference on the clipboard, not the citation's text: the reference is what a second site pastes.

import type { ActionItem } from './menuModel'

export type CitationSubject = 'marker' | 'citation'

export interface CitationMenuContext {
  subject: CitationSubject
  /** A read-only surface offers what it can still do and nothing that would write. */
  editable: boolean
}

export type CitationMenuAction = 'cite:edit' | 'cite:copy' | 'cite:delete'

export function citationMenuModel(ctx: CitationMenuContext): ActionItem<CitationMenuAction>[] {
  const rows: ActionItem<CitationMenuAction>[] = []
  // Only a marker has somewhere else to put the caret; a citation's own row already holds it.
  if (ctx.subject === 'marker' && ctx.editable) rows.push({ label: 'Edit', action: 'cite:edit' })
  // Delete takes the divider, but only where more than one row stands above it.
  rows.push({ label: 'Copy', action: 'cite:copy' })
  if (ctx.editable)
    rows.push({ label: 'Delete', action: 'cite:delete', separatorBefore: rows.length > 1 })
  return rows
}
