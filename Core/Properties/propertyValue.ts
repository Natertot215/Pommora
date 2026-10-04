import { z } from 'zod'
import { isScalar, listOf } from '../Contract/validators'
import { firstPerTitle, optionValues, PROPERTY_TYPES, type PropertyDefinition } from './properties'
import { parseConnectionText } from '../Connections/connections'
import { normalizeTitle } from '../Paths/caseFold'
import { landValue, writeTarget } from '../Files/heldKeys'

const strings = z.array(z.string())
export const propertyValue = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('number'), value: z.number() }),
  z.object({ kind: z.literal('checkbox'), value: z.literal(true) }),
  // ISO-8601; a bare "yyyy-MM-dd" is a date-only value
  z.object({ kind: z.literal('dateTime'), value: z.string() }),
  z.object({ kind: z.literal('select'), value: z.string() }),
  z.object({ kind: z.literal('multiSelect'), value: strings }),
  // Kept while the Status tag goes, because Context is NOT derivable from the schema on the value path — the type resolver runs there without the Context id list.
  z.object({ kind: z.literal('context'), value: strings }),
  z.object({ kind: z.literal('link'), value: z.string() }),
  // `[[Name.ext]]` wikilinks, resolved in the asset basename domain
  z.object({ kind: z.literal('file'), value: strings }),
  z.object({ kind: z.literal('null') }),
])
export type PropertyValue = z.infer<typeof propertyValue>
export type ValueKind = Exclude<PropertyValue['kind'], 'null'>

/** YAML reads an unquoted `[[Name.ext]]` as a nested flow sequence rather than a string; unwrapping single-element arrays keeps a hand-edit from nulling the whole value. */
function fileEntry(v: unknown): string | null {
  if (typeof v === 'string') return v
  let inner: unknown = v
  while (Array.isArray(inner) && inner.length === 1) inner = inner[0]
  return typeof inner === 'string' ? `[[${inner}]]` : null
}

export const NULL_VALUE: PropertyValue = { kind: 'null' }

// An outside `- 2024` parses as a number and must still name the option "2024".
const optionList = (raw: unknown): string[] =>
  listOf(raw)
    .filter(isScalar)
    .map(String)
    .filter((x) => x !== '')

const foldedOptions = new WeakMap<PropertyDefinition, Map<string, string>>()

// Held against the definition it was built from, which an edit replaces rather than mutates.
function optionsByFold(def: PropertyDefinition): Map<string, string> {
  let byFold = foldedOptions.get(def)
  if (!byFold) {
    byFold = firstPerTitle(optionValues(def))
    foldedOptions.set(def, byFold)
  }
  return byFold
}

/** The option `written` names, as its definition spells it. */
const registeredOption = (def: PropertyDefinition, written: string): string | undefined =>
  optionsByFold(def).get(normalizeTitle(written))

/** Checked as a file spells it: `true`, or the word `true` or `yes` in any casing. */
const isCheckedRaw = (raw: unknown): boolean =>
  raw === true || (typeof raw === 'string' && ['true', 'yes'].includes(normalizeTitle(raw)))

export function decodeValue(def: PropertyDefinition, raw: unknown): PropertyValue {
  if (raw === null || raw === undefined) return NULL_VALUE
  const kind = PROPERTY_TYPES[def.type].kind
  switch (kind) {
    case 'number':
      return typeof raw === 'number' ? { kind, value: raw } : NULL_VALUE
    case 'checkbox':
      return isCheckedRaw(raw) ? { kind, value: true } : NULL_VALUE
    case 'link':
    case 'dateTime':
      return typeof raw === 'string' ? { kind, value: raw } : NULL_VALUE
    case 'select': {
      // The one rule for an externally written option list: the newest registered element wins.
      const value = optionList(raw)
        .flatMap((v) => registeredOption(def, v) ?? [])
        .at(-1)
      return value === undefined ? NULL_VALUE : { kind, value }
    }
    case 'multiSelect': {
      const byFold = optionsByFold(def)
      const value = Array.from(firstPerTitle(optionList(raw)), ([fold, x]) => byFold.get(fold) ?? x)
      return value.length === 0 ? NULL_VALUE : { kind, value }
    }
    // Deliberately NOT merged with multiSelect: optionValues on a file def returns [], so a merged case would discard every attachment through the restore path.
    case 'file': {
      // An entry nothing can spell is dropped rather than nulling the whole list and losing the other attachments.
      const entries: string[] = []
      for (const x of listOf(raw)) {
        const entry = fileEntry(x)
        if (entry !== null && entry !== '') entries.push(entry)
      }
      return entries.length === 0 ? NULL_VALUE : { kind, value: entries }
    }
    case 'context':
      return NULL_VALUE
  }
}

/** The members `raw` holds that a Multi-Select `def` doesn't register, each once; none for any other type. */
export function unregisteredMembers(def: PropertyDefinition, raw: unknown): string[] {
  const value = decodeValue(def, raw)
  return value.kind === 'multiSelect'
    ? value.value.filter((v) => registeredOption(def, v) === undefined)
    : []
}

/** What a frozen copy may still name: its options are the definition's own, and `holds`, when given, answers which pages still exist. */
export interface Frozen {
  holds?: (title: string) => boolean
}

/** Whether `raw` is a Link naming a page `frozen` doesn't hold; one naming only a heading of its own page always stands. */
export function namesGonePage(raw: unknown, frozen: Frozen): boolean {
  const page = typeof raw === 'string' ? parseConnectionText(raw) : null
  return !!page?.title && frozen.holds !== undefined && !frozen.holds(page.title)
}

// A restore of a frozen copy keeps only the options the definition still offers and the pages its world holds, so a deleted option or page never comes back through it.
export function reconcilePropertyValue(
  def: PropertyDefinition,
  raw: unknown,
  frozen?: Frozen,
): PropertyValue {
  const value = decodeValue(def, raw)
  if (!frozen) return value
  if (value.kind === 'link') return namesGonePage(value.value, frozen) ? NULL_VALUE : value
  if (value.kind !== 'multiSelect') return value
  const kept = value.value.filter((v) => registeredOption(def, v) !== undefined)
  return kept.length ? { kind: 'multiSelect', value: kept } : NULL_VALUE
}

/** `next` as a write spells it: as given when casing resolves, otherwise as `raw` already spells it — a checked `true` keeps `raw`'s checked word, and each member takes the one member of `raw` its title folds to. A member `raw` names more than once keeps the spelling `next` gives it, the registered one. */
export function writtenSpelling(next: unknown, raw: unknown, resolveCase: boolean): unknown {
  if (resolveCase) return next
  if (next === true) return isCheckedRaw(raw) ? raw : next
  if (!Array.isArray(next)) return next
  const written = listOf(raw).filter((w): w is string => typeof w === 'string')
  return next.map((v) => {
    const named = written.filter((w) => normalizeTitle(w) === normalizeTitle(v))
    return named.length === 1 ? named[0] : v
  })
}

export function encodeValue(value: PropertyValue): unknown {
  switch (value.kind) {
    case 'select':
      return [value.value]
    case 'number':
    case 'checkbox':
    case 'link':
    case 'dateTime':
    case 'multiSelect':
    case 'file':
    case 'context':
      return value.value
    case 'null':
      return null
    // A value carrying a kind outside the union came from outside the app; undefined is the refusal every writer checks, never a silent clear.
    default: {
      const _exhaustive: never = value
      void _exhaustive
      return undefined
    }
  }
}

/** Blank as a file spells it, before any definition reads it. */
export const isBlankRaw = (raw: unknown): boolean =>
  raw == null || raw === '' || (Array.isArray(raw) && raw.length === 0)

export function isBlankValue(value: PropertyValue | null): boolean {
  if (value === null) return true
  switch (value.kind) {
    case 'null':
      return true
    case 'multiSelect':
    case 'context':
    case 'file':
      return value.value.length === 0
    case 'select':
    case 'link':
    case 'dateTime':
      return value.value === ''
    case 'number':
    case 'checkbox':
      return false
  }
}

/** The renderer's copy of a value write, landed where the host's lands; its members keep the spelling given, since a read decodes them by fold. */
export const applyValueAtRoot = (
  root: Record<string, unknown>,
  def: PropertyDefinition,
  value: PropertyValue | null,
  resolveCase: boolean,
): Record<string, unknown> =>
  landValue(
    root,
    writeTarget(root, def.name, resolveCase),
    value === null || isBlankValue(value) ? undefined : encodeValue(value),
  )
