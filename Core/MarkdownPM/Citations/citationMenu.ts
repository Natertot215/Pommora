import type { ActionItem } from '../../Actions/menuModel'

type CitationSubject = 'marker' | 'citation'

export interface CitationMenuContext {
  subject: CitationSubject
  editable: boolean
}

export type CitationMenuAction = 'cite:edit' | 'cite:copy' | 'cite:delete'

export function citationMenuModel(ctx: CitationMenuContext): ActionItem<CitationMenuAction>[] {
  if (ctx.subject === 'marker' && ctx.editable)
    return [
      { label: 'Edit', action: 'cite:edit' },
      { label: 'Copy', action: 'cite:copy' },
      { label: 'Delete', action: 'cite:delete', separatorBefore: true },
    ]
  return [
    { label: 'Copy', action: 'cite:copy' },
    ...(ctx.editable ? [{ label: 'Delete', action: 'cite:delete' as const }] : []),
  ]
}
