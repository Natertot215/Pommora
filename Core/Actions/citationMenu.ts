import type { ActionItem } from './menuModel'

export type CitationSubject = 'marker' | 'citation'

export interface CitationMenuContext {
  subject: CitationSubject
  editable: boolean
}

export type CitationMenuAction = 'cite:edit' | 'cite:copy' | 'cite:delete'

export function citationMenuModel(ctx: CitationMenuContext): ActionItem<CitationMenuAction>[] {
  const rows: ActionItem<CitationMenuAction>[] = []
  if (ctx.subject === 'marker' && ctx.editable) rows.push({ label: 'Edit', action: 'cite:edit' })
  rows.push({ label: 'Copy', action: 'cite:copy' })
  if (ctx.editable)
    rows.push({ label: 'Delete', action: 'cite:delete', separatorBefore: rows.length > 1 })
  return rows
}
