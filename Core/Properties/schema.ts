import {
  hasSelectOptions,
  invalidPropertyName,
  isReservedKeyName,
  isReservedPropertyId,
  KEY_REFUSAL,
  type PropertyDefinition,
} from './properties'
import { fail, ok, type Result } from '../Contract/result'
import { normalizeTitle } from '../Connections/connections'

/** The whole name gate: non-empty, not a key Pommora manages, and unique nexus-wide, compared case-folded because the name is the on-disk key. */
export function validateName(
  name: string,
  existing: PropertyDefinition[],
  excludeId?: string,
): Result<null> {
  if (!name) return fail('invalid-property', KEY_REFUSAL.empty)
  if (invalidPropertyName(name))
    return fail(
      'invalid-property',
      isReservedKeyName(name) ? KEY_REFUSAL.reserved(name) : KEY_REFUSAL.reservedPrefix,
    )
  const folded = normalizeTitle(name)
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
  if (existing.some((d) => d.id === def.id)) {
    return fail('invalid-property', 'That property id already exists.')
  }
  if (hasSelectOptions(def.type)) {
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
