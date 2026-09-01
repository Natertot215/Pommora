import { type PropertyDefinition, RESERVED_PROPERTY_ID } from '@shared/properties'
import type { ContextIdentity } from '@renderer/Properties/contextIdentity'
import { useSession } from '@renderer/store'

// Built-in reserved columns with fixed English labels (context titles are registry data).
const RESERVED_LABEL: Record<string, string> = {
  [RESERVED_PROPERTY_ID.title]: 'Title',
  [RESERVED_PROPERTY_ID.createdAt]: 'Created',
  [RESERVED_PROPERTY_ID.modifiedAt]: 'Modified',
}

export const displayPropertyName = (name: string, capitalize: boolean): string =>
  capitalize ? name.replace(/(?:^|\s)\p{Ll}/gu, (m) => m.toUpperCase()) : name

export const useCapitalizeMetadata = (): boolean =>
  useSession((s) => s.personalization.capitalizeMetadata ?? false)

/** `contexts` is REQUIRED and deliberately un-defaulted. Context titles are registry data, so a
 *  caller that omits them silently falls through to the raw id — a header reading as a ULID,
 *  which looks like data corruption rather than a missing argument. */
export function columnLabel(
  columnId: string,
  schema: PropertyDefinition[],
  contexts: ReadonlyMap<string, ContextIdentity>,
  capitalize = false,
): string {
  const title = contexts.get(columnId)?.title
  if (title) return title
  const def = schema.find((d) => d.id === columnId)
  return RESERVED_LABEL[columnId] ?? (def ? displayPropertyName(def.name, capitalize) : columnId)
}
