import {
  firstPerTitle,
  isReservedPropertyId,
  KEY_REFUSAL,
  optionGroupsOf,
  PROPERTY_TYPES,
  type PropertyDefinition,
  RESERVED_NAME_PREFIX,
  withOptionGroups,
} from './properties'
import { fail, ok, type Result } from '../Contract/result'
import { normalizeTitle } from '../Paths/caseFold'
import { PAGE_MODELED_KEYS } from '../Nexus/identityMark'
import { SPACE_MODELED_KEYS } from '../Contexts/spaceSidecar'

const RESERVED_KEY_NAMES: ReadonlySet<string> = new Set(
  [...PAGE_MODELED_KEYS, ...SPACE_MODELED_KEYS].map(normalizeTitle),
)

/** Why `name` can't be a property's on-disk key — empty, or a key Pommora manages in any casing — or null when it can. */
export function keyRefusal(name: string): string | null {
  if (!name) return KEY_REFUSAL.empty
  if (name.startsWith(RESERVED_NAME_PREFIX) || name.startsWith('<'))
    return KEY_REFUSAL.reservedPrefix
  return RESERVED_KEY_NAMES.has(normalizeTitle(name)) ? KEY_REFUSAL.reserved(name) : null
}

/** The whole name gate: an admissible key, unique nexus-wide, compared case-folded because the name is the on-disk key. */
export function validateName(
  name: string,
  existing: PropertyDefinition[],
  excludeId?: string,
): Result<null> {
  const refusal = keyRefusal(name)
  if (refusal) return fail('invalid-property', refusal)
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

/** `def` holding each option title once, the first of any that fold alike, and none blank; a definition already so is answered as it is. */
export function withUniqueOptions(def: PropertyDefinition): PropertyDefinition {
  const groups = optionGroupsOf(def)
  const options = groups.flatMap((g) => g.options)
  if (validateOptionValues(options).ok) return def
  const first = new Set(firstPerTitle(options, (o) => o.value).values())
  const kept = groups.map((g) => ({
    ...g,
    options: g.options.filter((o) => first.has(o) && normalizeTitle(o.value) !== ''),
  }))
  return withOptionGroups(def, kept)
}

/** No minimum count — a Select may hold zero options. Enforced at create AND on every option edit; titles compare case-folded. */
export function validateOptionValues(options: { value: string }[]): Result<null> {
  const titles = options.map((o) => normalizeTitle(o.value))
  if (titles.includes('')) return fail('invalid-property', 'Option titles can’t be blank.')
  if (new Set(titles).size < titles.length) {
    return fail('invalid-property', 'Option titles must be unique.')
  }
  return ok(null)
}
