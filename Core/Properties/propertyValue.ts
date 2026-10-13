import { z } from 'zod'
import { isScalar, listOf } from '../Contract/validators'
import {
  firstPerTitle,
  holdsList,
  optionValues,
  PROPERTY_TYPES,
  type PropertyDefinition,
} from './properties'
import { normalizeTitle } from '../Paths/caseFold'
import { heldValue, landValue, writeTarget } from '../Files/heldKeys'
import { yamlInline } from '../Files/pageFile'
import { linkEntry, wholeValueLink } from '../Connections/linkValue'
import { capitalize } from '@pommora/uix/Utilities/capitalize'

const strings = z.array(z.string())
export const propertyValue = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), value: z.string() }),
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

export const NULL_VALUE: PropertyValue = { kind: 'null' }

// An outside `- 2024` parses as a number and must still name the option "2024".
const optionList = (raw: unknown): string[] =>
  listOf(raw)
    .filter(isScalar)
    .map(String)
    .filter((x) => normalizeTitle(x) !== '')

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

const CHECKBOX_WORDS = [
  ['true', 'false'],
  ['yes', 'no'],
  ['on', 'off'],
  ['y', 'n'],
] as const
const CHECKED_WORD = new Map(
  CHECKBOX_WORDS.flatMap(([on, off]): [string, string][] => [
    [on, on],
    [off, on],
  ]),
)

/** What a checkbox value says as a file spells it, in any casing: true for a pair's checked word, false for its partner, null for anything else. */
export function checkboxWord(raw: unknown): boolean | null {
  if (typeof raw === 'boolean') return raw
  const word = typeof raw === 'string' ? normalizeTitle(raw) : ''
  const checked = CHECKED_WORD.get(word)
  return checked === undefined ? null : checked === word
}

export function decodeValue(def: PropertyDefinition, raw: unknown): PropertyValue {
  if (raw === null || raw === undefined) return NULL_VALUE
  const kind = PROPERTY_TYPES[def.type].kind
  switch (kind) {
    case 'number':
      return typeof raw === 'number' ? { kind, value: raw } : NULL_VALUE
    case 'checkbox':
      return checkboxWord(raw) ? { kind, value: true } : NULL_VALUE
    case 'link': {
      const entry = linkEntry(raw, 2)
      return entry === null ? NULL_VALUE : { kind, value: entry }
    }
    case 'dateTime':
      return typeof raw === 'string' ? { kind, value: raw } : NULL_VALUE
    // Free text reads whatever the file holds: a string as itself, any other shape as the yaml that spells it.
    case 'text':
      if (isBlankRaw(raw)) return NULL_VALUE
      return { kind, value: typeof raw === 'string' ? raw : yamlInline(raw) }
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
        const entry = linkEntry(x)
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

export function gonePageEntry(raw: unknown, frozen: Frozen): string | null {
  const link = wholeValueLink(raw)
  const gone =
    link?.kind === 'page' &&
    link.title !== '' &&
    frozen.holds !== undefined &&
    !frozen.holds(link.title)
  return gone ? linkEntry(raw, 2) : null
}

// A restore of a frozen copy keeps only the options the definition still offers and the pages its world holds, so a deleted option or page never comes back through it.
export function reconcilePropertyValue(
  def: PropertyDefinition,
  raw: unknown,
  frozen?: Frozen,
): PropertyValue {
  const value = decodeValue(def, raw)
  if (!frozen) return value
  if (value.kind === 'link') return gonePageEntry(value.value, frozen) === null ? value : NULL_VALUE
  if (value.kind !== 'multiSelect') return value
  const kept = value.value.filter((v) => registeredOption(def, v) !== undefined)
  return kept.length ? { kind: 'multiSelect', value: kept } : NULL_VALUE
}

/** A checked value as `raw` spells one: its checked word as written, or its unchecked word's partner in the same casing (`no` → `yes`, `OFF` → `ON`), else `true`. */
function checkedSpelling(raw: unknown): unknown {
  if (checkboxWord(raw) === true) return raw
  const word = typeof raw === 'string' ? raw.trim() : ''
  const partner = CHECKED_WORD.get(normalizeTitle(word))
  if (partner === undefined) return true
  if (word === word.toUpperCase()) return partner.toUpperCase()
  return word[0] === word[0].toUpperCase() ? capitalize(partner) : partner
}

/** `next` spelled as `raw` already spells it: a checked `true` takes `raw`'s checkbox word as `checkedSpelling` does, a string keeps a `raw` of any other shape whose inline yaml reads as that string, and each member takes the one member of `raw` its title folds to. A member `raw` names more than once keeps the spelling `next` gives it, the registered one. */
export function writtenSpelling(next: unknown, raw: unknown): unknown {
  if (next === true) return checkedSpelling(raw)
  if (typeof next === 'string')
    return raw != null && typeof raw !== 'string' && yamlInline(raw) === next ? raw : next
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
    case 'text':
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
    case 'text':
      return value.value === ''
    case 'number':
    case 'checkbox':
      return false
  }
}

/** What `root` holds for `def`: a list property's every spelling joined, any other's the one key it reads. */
export const heldPropertyValue = (
  root: Record<string, unknown>,
  def: Pick<PropertyDefinition, 'name' | 'type'>,
): unknown => heldValue(root, def.name, holdsList(def))

/** The renderer's copy of a value write, landed where the host's lands; its members keep the spelling given, since a read decodes them by fold. */
export const applyValueAtRoot = (
  root: Record<string, unknown>,
  def: PropertyDefinition,
  value: PropertyValue | null,
): Record<string, unknown> =>
  landValue(
    root,
    writeTarget(root, def.name),
    value === null || isBlankValue(value) ? undefined : encodeValue(value),
  )
