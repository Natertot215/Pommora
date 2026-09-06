import { aliasSpanAt } from '@pommora/core/Connections/connections'
import { lineEndAt, lineStartAt } from '../Input/edits'

/** `]` would truncate the link the caret is sitting in. Exported because the page editor and a table cell run different input handlers, and the guard belongs to the alias. */
export function refusedInAlias(doc: string, at: number, text: string): boolean {
  if (text !== ']') return false
  const ls = lineStartAt(doc, at)
  return aliasSpanAt(doc.slice(ls, lineEndAt(doc, at)), at - ls) !== null
}
