import {
  byKey,
  isReservedPropertyId,
  isUserType,
  itemCount,
  optionGroupsOf,
  optionsOf,
  PROPERTY_TYPES,
  type PropertyDefinition,
  type StatusGroup,
  withOptionGroups,
} from './properties'
import { fail, ok, type Result } from '../Contract/result'
import { normalizeTitle } from '../Paths/caseFold'
import { PAGE_MODELED_KEYS } from '../Nexus/identityMark'
import { SPACE_MODELED_KEYS } from '../Contexts/spaceSidecar'

const RESERVED_NAME_PREFIX = '$'

export const KEY_REFUSAL = {
  empty: 'A name cannot be empty.',
  reservedPrefix: `A name cannot start with ${RESERVED_NAME_PREFIX} or <.`,
  reserved: 'Name is taken by an app-managed key.',
  duplicate: (label: string) => `A property named "${label}" already exists.`,
  duplicateKey: (key: string) => `A property already writes "${key}" to files.`,
  noKey: 'Properties cannot contain an invalid name.',
  held: (from: string, to: string, n: number) =>
    `${itemCount(n)} ${n === 1 ? 'holds' : 'hold'} both "${from}" and "${to}".`,
} as const

const RESERVED_KEY_NAMES: ReadonlySet<string> = new Set(
  [...PAGE_MODELED_KEYS, ...SPACE_MODELED_KEYS].map(normalizeTitle),
)

/** Why a word can't be a property's label or key — empty, a key Pommora manages in any casing, or a name every object already answers to — or null when it can. */
export function keyRefusal(word: string): string | null {
  if (!word) return KEY_REFUSAL.empty
  if (word.startsWith(RESERVED_NAME_PREFIX) || word.startsWith('<'))
    return KEY_REFUSAL.reservedPrefix
  return RESERVED_KEY_NAMES.has(normalizeTitle(word)) || Object.hasOwn(Object.prototype, word)
    ? KEY_REFUSAL.reserved
    : null
}

/** Which frontmatter keys hold links the graph relates and a rename rewrites, asked of a registry: a type that holds connections, and a key the registry hasn't typed unless Pommora keeps it; never File, whose references name assets. One lookup, built once per reader. */
export const linkKeysOf = (defs: readonly PropertyDefinition[]): ((key: string) => boolean) => {
  const typed = byKey(defs)
  return (key) => {
    const type = typed.get(key)?.type
    return type === undefined
      ? keyRefusal(key) === null
      : PROPERTY_TYPES[type].connections !== undefined
  }
}

/** The whole name gate: neither word a key Pommora manages, the label unique among labels and the key among keys nexus-wide, each compared case-folded. */
export function validateName(
  { label, key }: Pick<PropertyDefinition, 'label' | 'key'>,
  existing: PropertyDefinition[],
  excludeId?: string,
): Result<null> {
  const refusal = keyRefusal(label) ?? (key.trim() ? keyRefusal(key) : KEY_REFUSAL.noKey)
  if (refusal) return fail('invalid-property', refusal)
  const holds = (word: string, of: (d: PropertyDefinition) => string): boolean => {
    const folded = normalizeTitle(word)
    return existing.some((d) => d.id !== excludeId && normalizeTitle(of(d)) === folded)
  }
  if (holds(label, (d) => d.label)) return fail('invalid-property', KEY_REFUSAL.duplicate(label))
  if (holds(key, (d) => d.key)) return fail('invalid-property', KEY_REFUSAL.duplicateKey(key))
  return ok(null)
}

/** What the property list holds: a user type under an id Pommora doesn't reserve. A create refuses, and a registry read sets aside, everything else. */
export const admissible = ({ id, type }: Pick<PropertyDefinition, 'id' | 'type'>): boolean =>
  isUserType(type) && !isReservedPropertyId(id)

export function validateDefinition(
  def: PropertyDefinition,
  existing: PropertyDefinition[],
): Result<null> {
  const nameCheck = validateName(def, existing, def.id)
  if (!nameCheck.ok) return nameCheck
  if (!admissible(def))
    return fail('invalid-property', 'A reserved id or a Context column is not a property.')
  if (existing.some((d) => d.id === def.id))
    return fail('invalid-property', 'That property id already exists.')
  if (PROPERTY_TYPES[def.type].options) {
    const check = validateOptionValues(optionsOf(def))
    if (!check.ok) return check
  }
  return ok(null)
}

/** `groups` holding each option label and each key once, the first of any that fold alike, and none blank. */
export function uniqueOptionGroups(groups: StatusGroup[]): StatusGroup[] {
  const labels = new Set<string>()
  const keys = new Set<string>()
  const keeps = (label: string, key: string): boolean => {
    if (!label || !key || labels.has(label) || keys.has(key)) return false
    labels.add(label)
    keys.add(key)
    return true
  }
  return groups.map((g) => ({
    ...g,
    options: g.options.filter((o) => keeps(normalizeTitle(o.label), normalizeTitle(o.key))),
  }))
}

/** `def` with its options made unique as `uniqueOptionGroups` does; a definition already so is answered as it is. */
export function withUniqueOptions(def: PropertyDefinition): PropertyDefinition {
  const groups = optionGroupsOf(def)
  if (validateOptionValues(groups.flatMap((g) => g.options)).ok) return def
  return withOptionGroups(def, uniqueOptionGroups(groups))
}

/** No minimum count — a Select may hold zero options. Enforced at create AND on every option edit; labels and keys each compare case-folded. */
export function validateOptionValues(
  options: { key: string; label: string }[],
  taken = 'Another option already writes this to files, please choose another name.',
): Result<null> {
  const labels = options.map((o) => normalizeTitle(o.label))
  const keys = options.map((o) => normalizeTitle(o.key))
  if (labels.includes('')) return fail('invalid-property', 'Option titles can’t be blank.')
  if (keys.includes('')) return fail('invalid-property', 'Options cannot contain an invalid name.')
  if (new Set(labels).size < labels.length)
    return fail('invalid-property', 'Option titles must be unique.')
  if (new Set(keys).size < keys.length) return fail('invalid-property', taken)
  return ok(null)
}
