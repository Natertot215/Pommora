import { type PropertyDefinition, RESERVED_PROPERTY_ID } from '@shared/properties'
import type { ContextIdentity } from '../pipeline/contextIdentity'

// Built-in reserved columns with fixed English labels (context titles are registry data).
const RESERVED_LABEL: Record<string, string> = {
  [RESERVED_PROPERTY_ID.title]: 'Title',
  [RESERVED_PROPERTY_ID.createdAt]: 'Created',
  [RESERVED_PROPERTY_ID.modifiedAt]: 'Modified',
}

/** `contexts` is REQUIRED and deliberately un-defaulted. Context titles are registry data, so a
 *  caller that omits them silently falls through to the raw id — a header reading as a ULID,
 *  which looks like data corruption rather than a missing argument. */
export function columnLabel(
  columnId: string,
  schema: PropertyDefinition[],
  contexts: ReadonlyMap<string, ContextIdentity>,
): string {
  const title = contexts.get(columnId)?.title
  if (title) return title
  return RESERVED_LABEL[columnId] ?? schema.find((d) => d.id === columnId)?.name ?? columnId
}
