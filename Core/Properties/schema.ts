import {
  hasSelectOptions,
  isReservedPropertyId,
  KEY_REFUSAL,
  type PropertyDefinition,
} from './properties'
import { fail, ok, type Result } from '../Contract/result'

/** Empty and reserved-prefix names are refused before this — `invalidPropertyName` owns that gate at the callers. */
export function validateName(
  name: string,
  existing: PropertyDefinition[],
  excludeId?: string,
): Result<null> {
  const trimmed = name.trim()
  const lower = trimmed.toLowerCase()
  const clash = existing.some((d) => d.id !== excludeId && d.name.trim().toLowerCase() === lower)
  if (clash) return fail('invalid-property', KEY_REFUSAL.duplicate(trimmed))
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
