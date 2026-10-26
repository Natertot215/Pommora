import { FILEDATA_BY_ID } from './properties'
import { propertyIcon, propertyTypeIconName } from './typeDisplay'
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

export const columnIcon = (
  { id, def, type }: ResolvedColumn,
  contexts: ReadonlyMap<string, ContextIdentity>,
): string => contexts.get(id)?.icon ?? (def ? propertyIcon(def) : propertyTypeIconName(type))
