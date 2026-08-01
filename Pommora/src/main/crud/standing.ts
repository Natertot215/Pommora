// Does this still stand? The ONE answer, for every path that puts a governed value back.
//
// A record and a trashed file are both frozen pictures of a world that has moved on, and both
// are replayed by restore — the artifact path carries keys inside a returning file, the property
// path writes values out of a record. Asking the question twice is how they end up disagreeing:
// the same value returning by two routes must not survive one and be dropped by the other.
//
// The caller resolves WHAT governs the key here — a definition, a Context's live Spaces, or
// nothing — because only the caller knows the destination. This answers what becomes of the
// value given that, and every reason it can lapse is named.

import type { PropertyDefinition } from '@shared/properties'
import { decodeValue, isBlankValue, type PropertyValue } from '@shared/propertyValue'

/** Why a governed value did not come back. Named, never a bare false — the reasons are the
 *  vocabulary every caller reports and every test pins. */
export type Lapse =
  /** Nothing governs this key here: no definition, or not one this Collection carries. */
  | 'ungoverned'
  /** The definition stands, but the value it held no longer can — a deleted option, a type
   *  that can no longer hold it, an emptied value. */
  | 'invalid'
  /** Every Space this tag named is gone. */
  | 'no-space'

type Lapsed = { stands: false; why: Lapse }
export type PropertyStanding = { stands: true; layer: 'property'; value: PropertyValue } | Lapsed
export type ContextStanding = { stands: true; layer: 'context'; titles: string[] } | Lapsed
export type Standing = PropertyStanding | ContextStanding

/** A property value, measured against whatever governs its key at the destination. `def`
 *  undefined means nothing does — the property was deleted, or this Collection dropped it. */
export function propertyValueStands(
  def: PropertyDefinition | undefined,
  raw: unknown,
): PropertyStanding {
  if (!def) return { stands: false, why: 'ungoverned' }
  // Strict IS the rule: a vanished option, a value the type can no longer hold, and an emptied
  // one all read blank, and blank does not come back. Multi-value kinds keep their survivors.
  const value = decodeValue(def, raw, { strict: true })
  if (isBlankValue(value)) return { stands: false, why: 'invalid' }
  return { stands: true, layer: 'property', value }
}

/** A Context tag, measured against the Spaces that Context still holds. `spaces` undefined
 *  means the Context itself is gone. */
export function contextTagStands(
  spaces: Set<string> | undefined,
  raw: unknown,
): ContextStanding {
  if (!spaces) return { stands: false, why: 'ungoverned' }
  const titles = Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : []
  const kept = titles.filter((t) => spaces.has(t))
  if (!kept.length) return { stands: false, why: 'no-space' }
  return { stands: true, layer: 'context', titles: kept }
}
