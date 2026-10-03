import {
  isReservedPropertyId,
  KEY_REFUSAL,
  PROPERTY_TYPES,
  type PropertyDefinition,
  RESERVED_NAME_PREFIX,
} from './properties'
import { fail, ok, type Result } from '../Contract/result'
import { normalizeTitle } from '../Connections/connections'
import { PAGE_MODELED_KEYS } from '../Nexus/identityMark'
import { SPACE_MODELED_KEYS } from '../Contexts/spaceSidecar'

const RESERVED_KEY_NAMES: ReadonlySet<string> = new Set(
  [...PAGE_MODELED_KEYS, ...SPACE_MODELED_KEYS].map(normalizeTitle),
)

/** The whole name gate: non-empty, not a key Pommora manages in any casing, and unique nexus-wide, compared case-folded because the name is the on-disk key. */
export function validateName(
  name: string,
  existing: PropertyDefinition[],
  excludeId?: string,
): Result<null> {
  if (!name) return fail('invalid-property', KEY_REFUSAL.empty)
  if (name.startsWith(RESERVED_NAME_PREFIX) || name.startsWith('<'))
    return fail('invalid-property', KEY_REFUSAL.reservedPrefix)
  const folded = normalizeTitle(name)
  if (RESERVED_KEY_NAMES.has(folded)) return fail('invalid-property', KEY_REFUSAL.reserved(name))
  const clash = existing.some((d) => d.id !== excludeId && normalizeTitle(d.name) === folded)
  if (clash) return fail('invalid-property', KEY_REFUSAL.duplicate(name))
  return ok(null)
}

export function validateDefinition(
  def: PropertyDefinition,
  existing: PropertyDefinition[],
): Result<null> {
  const nameCheck = validateName(def.name, existing, def.id)
  if (!nameCheck.ok) return nameCheck
  if (isReservedPropertyId(def.id)) return fail('invalid-property', 'That property id is reserved.')
  if (PROPERTY_TYPES[def.type].origin !== 'user')
    return fail('invalid-property', 'A Context or timestamp column is not a property.')
  if (existing.some((d) => d.id === def.id)) {
    return fail('invalid-property', 'That property id already exists.')
  }
  if (PROPERTY_TYPES[def.type].options === 'select') {
    const check = validateOptionValues(def.select_options ?? [])
    if (!check.ok) return check
  }
  return ok(null)
}

/** No minimum count — a Select may hold zero options. Enforced at create AND on every option edit. */
export function validateOptionValues(options: { value: string }[]): Result<null> {
  const values = options.map((o) => o.value)
  if (new Set(values).size < values.length) {
    return fail('invalid-property', 'Option titles must be unique.')
  }
  return ok(null)
}
