import { normalizeContextValue } from '@shared/contexts'
import type { PropertyDefinition } from '@shared/properties'
import { decodeValue, isBlankValue, type PropertyValue } from '@shared/propertyValue'

type Lapsed = { stands: false }
export type PropertyStanding = { stands: true; layer: 'property'; value: PropertyValue } | Lapsed
export type ContextStanding = { stands: true; layer: 'context'; titles: unknown[] } | Lapsed

/** A property value, measured against whatever governs its key at the destination. `def`
 *  undefined means nothing does — the property was deleted, or this Collection dropped it. */
export function propertyValueStands(
  def: PropertyDefinition | undefined,
  raw: unknown,
): PropertyStanding {
  if (!def) return { stands: false }
  // Strict IS the rule: a vanished option, a value the type can no longer hold, and an emptied
  // one all read blank, and blank does not come back. Multi-value kinds keep their survivors.
  const value = decodeValue(def, raw, { strict: true })
  if (isBlankValue(value)) return { stands: false }
  return { stands: true, layer: 'property', value }
}

/** A Context tag, measured against the Spaces that Context still holds. `coercedSpaceTitles`
 *  holds those titles through `normalizeContextValue` — the same coercion every live match runs,
 *  so a spelling the tree resolves is a value that stands, and an outside write of `- 2024` still
 *  names the Space titled "2024". Survivors come back exactly as the file spelled them: standing
 *  decides what to drop, never what to rewrite. Undefined means the Context itself is gone. */
export function contextTagStands(
  coercedSpaceTitles: Set<string> | undefined,
  raw: unknown,
): ContextStanding {
  if (!coercedSpaceTitles) return { stands: false }
  const values = Array.isArray(raw) ? raw : []
  const kept = values.filter((v) => coercedSpaceTitles.has(normalizeContextValue(v)))
  if (!kept.length) return { stands: false }
  return { stands: true, layer: 'context', titles: kept }
}
