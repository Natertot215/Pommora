import { aliasSpanAt } from '@pommora/core/Connections/connections'
import { lineEndAt, lineStartAt } from '../Engine/markdownCode'

/** `]` would truncate the link the caret is sitting in; the guard belongs to the alias, not to the input chain that asks it. */
export function refusedInAlias(doc: string, at: number, text: string): boolean {
  if (text !== ']') return false
  const ls = lineStartAt(doc, at)
  return aliasSpanAt(doc.slice(ls, lineEndAt(doc, at)), at - ls) !== null
}
