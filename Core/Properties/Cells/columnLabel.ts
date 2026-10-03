import { type PropertyDefinition, RESERVED_PROPERTY_ID } from '../properties'
import type { ContextIdentity } from '../../Contexts/contextIdentity'

export const RESERVED_LABEL: Readonly<Record<string, string>> = {
  [RESERVED_PROPERTY_ID.title]: 'Title',
  [RESERVED_PROPERTY_ID.createdAt]: 'Creation Time',
  [RESERVED_PROPERTY_ID.modifiedAt]: 'Last Modified',
}

/** `contexts` is REQUIRED and deliberately un-defaulted: a caller that omits them falls through to the raw id, a header reading as a ULID. */
export function columnLabel(
  columnId: string,
  schema: PropertyDefinition[],
  contexts: ReadonlyMap<string, ContextIdentity>,
): string {
  const title = contexts.get(columnId)?.title
  if (title) return title
  return RESERVED_LABEL[columnId] ?? schema.find((d) => d.id === columnId)?.name ?? columnId
}
