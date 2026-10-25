import { FILEDATA_BY_ID } from './properties'
import type { ContextIdentity } from '../Contexts/contextIdentity'
import type { ResolvedColumn } from '../Views/viewRow'

export function columnLabel(
  { id, def }: ResolvedColumn,
  contexts: ReadonlyMap<string, ContextIdentity>,
): string {
  const title = contexts.get(id)?.title
  if (title) return title
  return FILEDATA_BY_ID.get(id)?.label ?? def?.label ?? id
}
