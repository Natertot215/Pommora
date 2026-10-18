import {
  byKey,
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

/** Why a word can't be a property's label or key — empty, a key Pommora manages in any casing, or a name every object already answers to — or null when it can. */
export function keyRefusal(word: string): string | null {
  if (!word) return KEY_REFUSAL.empty
  if (word.startsWith(RESERVED_NAME_PREFIX) || word.startsWith('<'))
    return KEY_REFUSAL.reservedPrefix
  return RESERVED_KEY_NAMES.has(normalizeTitle(word)) || Object.hasOwn(Object.prototype, word)
    ? KEY_REFUSAL.reserved(word)
    : null
}

/** Which frontmatter keys hold links the graph relates and a rename rewrites, asked of a registry: Link and Text, and a key the registry hasn't typed unless Pommora keeps it; never File, whose references name assets. One lookup, built once per reader. */
export const linkKeysOf = (defs: readonly PropertyDefinition[]): ((key: string) => boolean) => {
  const names = byKey(defs)
  return (key) => {
    const type = names.get(key)?.type
    return type === undefined ? keyRefusal(key) === null : type === 'link' || type === 'text'
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

export function validateDefinition(
  def: PropertyDefinition,
  existing: PropertyDefinition[],
): Result<null> {
  const nameCheck = validateName(def, existing, def.id)
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
