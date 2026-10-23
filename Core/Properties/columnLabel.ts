import { FILEDATA_BY_ID, type PropertyDefinition } from './properties'
import type { ContextIdentity } from '../Contexts/contextIdentity'

export function columnLabel(
  columnId: string,
  schema: PropertyDefinition[],
  contexts: ReadonlyMap<string, ContextIdentity>,
): string {
  const title = contexts.get(columnId)?.title
  if (title) return title
  return (
    FILEDATA_BY_ID.get(columnId)?.label ?? schema.find((d) => d.id === columnId)?.label ?? columnId
  )
}
