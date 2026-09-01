// Pure validation over a PropertyDefinition[] — the typed gate a definition passes before it
// enters the registry. No I/O.

import {
  hasSelectOptions,
  isReservedPropertyId,
  KEY_REFUSAL,
  type PropertyDefinition,
} from '@shared/properties'
import { fail, ok, type Result } from '@shared/result'

/** A property name in the context of a schema: unique case-insensitively, excluding the def
 *  identified by `excludeId` (for rename). Empty and reserved-prefix names are refused before
 *  this — `invalidPropertyName` owns that gate at the callers. */
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

/** Full add-time validation: name rules + reserved-id block + unique id + select /
 *  multiSelect option constraints. */
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

/** Option titles (their `value`s) must be unique within a property. No minimum count — a Select may
 *  hold zero options. Enforced at create AND on every option edit (add / rename / reorder). */
export function validateOptionValues(options: { value: string }[]): Result<null> {
  const values = options.map((o) => o.value)
  if (new Set(values).size < values.length) {
    return fail('invalid-property', 'Option titles must be unique.')
  }
  return ok(null)
}
