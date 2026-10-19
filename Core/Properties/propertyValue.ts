import { z } from 'zod'
import { fail, ok, type Result } from '../Contract/result'
import { isScalar, listOf, scalarMembers } from '../Contract/validators'
import {
  optionsOf,
  PROPERTY_TYPES,
  type PropertyDefinition,
  type SelectOption,
  type StatusOption,
} from './properties'
import { exactTitle, normalizeTitle } from '../Paths/caseFold'
import { joinValues, landValue } from '../Files/rootValues'
import { yamlInline } from '../Files/pageFile'
import { linkEntry, readLinkText } from '../Connections/linkValue'
import { readNumber, spelledNumber } from './formatValue'
import { capitalize } from '@pommora/uix/Utilities/capitalize'
import { namesValue } from './pageValue'
import { formatKey } from './keyFormat'

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

/** A held value as text: a string as itself, an unquoted `[[x]]` as the connection it spells, anything else as the yaml that spells it. */
const asText = (raw: unknown): string => linkEntry(raw, 2) ?? yamlInline(raw)

// An outside `- 2024` parses as a number and must still name the option "2024".
const optionList = (raw: unknown): string[] =>
  scalarMembers(raw).filter((x) => exactTitle(x) !== '')

type OptionWords = {
  labelOf: Map<string, string>
  byLabel: Map<string, SelectOption | StatusOption>
}

const optionWords = new WeakMap<PropertyDefinition, OptionWords>()

// Held against the definition it was built from, which an edit replaces rather than mutates.
function wordsOf(def: PropertyDefinition): OptionWords {
  let words = optionWords.get(def)
  if (!words) {
    const options = optionsOf(def)
    words = {
      labelOf: new Map(options.map((o) => [exactTitle(o.key), o.label])),
      byLabel: new Map(options.map((o) => [o.label, o])),
    }
    optionWords.set(def, words)
  }
  return words
}

/** The label of the option whose key `written` names. */
const registeredOption = (def: PropertyDefinition, written: string): string | undefined =>
  wordsOf(def).labelOf.get(exactTitle(written))

export const findOption = (
  def: PropertyDefinition | undefined,
  label: string,
): SelectOption | StatusOption | undefined => (def ? wordsOf(def).byLabel.get(label) : undefined)

/** The key of the option `label` names; a label no option holds is written as given. */
const keyOf = (def: PropertyDefinition, label: string): string =>
  wordsOf(def).byLabel.get(label)?.key ?? label

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
    case 'number': {
      const value = readNumber(raw)
      return value === undefined ? NULL_VALUE : { kind, value }
    }
    case 'checkbox':
      return checkboxWord(raw) ? { kind, value: true } : NULL_VALUE
    case 'link': {
      const entry = linkEntry(raw, 2)
      return entry === null ? NULL_VALUE : { kind, value: entry }
    }
    case 'dateTime':
      return typeof raw === 'string' ? { kind, value: raw } : NULL_VALUE
    case 'text':
      return isBlankRaw(raw) ? NULL_VALUE : { kind, value: asText(raw) }
    case 'select': {
      // The one rule for an externally written option list: the newest registered element wins.
      const value = optionList(raw)
        .flatMap((v) => registeredOption(def, v) ?? [])
        .at(-1)
      return value === undefined ? NULL_VALUE : { kind, value }
    }
    case 'multiSelect': {
      const value = [...new Set(optionList(raw).flatMap((x) => registeredOption(def, x) ?? []))]
      return value.length === 0 ? NULL_VALUE : { kind, value }
    }
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

/** The words a Multi-Select's `raw` holds that its Value Format could have written and no option's label or key claims without regard to case, the fold option uniqueness compares by, each once by fold. */
export function unregisteredMembers(def: PropertyDefinition, raw: unknown): string[] {
  const folds = new Set(
    optionsOf(def).flatMap((o) => [normalizeTitle(o.label), normalizeTitle(o.key)]),
  )
  const writable = optionList(raw).filter(
    (w) => formatKey(exactTitle(w), def.value_format) === exactTitle(w),
  )
  const seen = new Set<string>()
  return writable.filter((w) => {
    const fold = normalizeTitle(w)
    if (seen.has(fold)) return false
    seen.add(fold)
    return !folds.has(fold)
  })
}

export function keepingForeignWords(
  def: PropertyDefinition,
  written: unknown,
  held: unknown,
): unknown {
  if (PROPERTY_TYPES[def.type].kind !== 'multiSelect' || !Array.isArray(written) || !written.length)
    return written
  return joinValues(
    written,
    listOf(held ?? []).filter((w) =>
      isScalar(w)
        ? exactTitle(w) !== '' && registeredOption(def, exactTitle(w)) === undefined
        : w != null,
    ),
  )
}

/** What a frozen copy may still name: its options are the definition's own, and `holds`, when given, answers which pages still exist. */
export interface Frozen {
  holds?: (title: string) => boolean
}

export function gonePageEntry(raw: unknown, frozen: Frozen): string | null {
  const entry = linkEntry(raw, 2)
  const link = entry === null ? null : readLinkText(entry)
  const gone =
    link?.kind === 'page' &&
    link.title !== '' &&
    frozen.holds !== undefined &&
    !frozen.holds(link.title)
  return gone ? entry : null
}

// A restore of a frozen copy keeps only the options the definition still offers and the pages its world holds, so a deleted option or page never comes back through it.
export function reconcilePropertyValue(
  def: PropertyDefinition,
  raw: unknown,
  frozen?: Frozen,
): PropertyValue {
  const value = decodeValue(def, raw)
  const gone = frozen && value.kind === 'link' && gonePageEntry(value.value, frozen) !== null
  return gone ? NULL_VALUE : value
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

/** `next` spelled as `raw` already spells it: a checked `true` takes `raw`'s checkbox word as `checkedSpelling` does, a number keeps `raw`'s spelling as `spelledNumber` does, a string keeps a `raw` of any other shape whose inline yaml reads as that string, a one-member list keeps a whole unquoted wikilink `raw` that spells its member, and each member takes the one member of `raw` whose title is its own — a scalar of any shape, or an unquoted wikilink. A member `raw` names more than once keeps the spelling `next` gives it, the registered one. */
export function writtenSpelling(next: unknown, raw: unknown): unknown {
  if (next === true) return checkedSpelling(raw)
  if (typeof next === 'number') return spelledNumber(next, raw)
  if (typeof next === 'string')
    return raw != null && typeof raw !== 'string' && asText(raw) === next ? raw : next
  if (!Array.isArray(next)) return next
  if (next.length === 1 && Array.isArray(raw) && linkEntry(raw, 2) === next[0]) return raw
  const held = listOf(raw)
  return next.map((v) => {
    const names = namesValue(v)
    const named = held.filter((w) => names(linkEntry(w, 2) ?? w))
    return named.length === 1 ? named[0] : v
  })
}

export function encodeValue(def: PropertyDefinition, value: PropertyValue): unknown {
  switch (value.kind) {
    case 'select':
      return [keyOf(def, value.value)]
    case 'multiSelect':
      return value.value.map((label) => keyOf(def, label))
    case 'number':
    case 'checkbox':
    case 'link':
    case 'dateTime':
    case 'text':
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

export function valueToWrite(
  def: PropertyDefinition,
  value: PropertyValue | null,
): Result<unknown> {
  if (value === null || isBlankValue(value)) return ok(undefined)
  const encoded = encodeValue(def, value)
  return encoded === undefined
    ? fail('invalid-property', `"${def.label}" was given a value it has no shape for.`)
    : ok(encoded)
}

/** Blank as a file spells it, before any definition reads it. */
export const isBlankRaw = (raw: unknown): boolean =>
  raw == null || raw === '' || (Array.isArray(raw) && raw.length === 0)

export const selectedValues = (current: PropertyValue | null): string[] => {
  if (!current) return []
  if (current.kind === 'multiSelect' || current.kind === 'context') return current.value
  if (current.kind === 'select') return [current.value]
  return []
}

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

/** The renderer's copy of a value write, landed where the host's lands, a Multi-Select keeping the words no option claims after the picked ones. */
export const applyValueAtRoot = (
  root: Record<string, unknown>,
  def: PropertyDefinition,
  value: PropertyValue | null,
): Record<string, unknown> => {
  const written = valueToWrite(def, value)
  return landValue(
    root,
    def.key,
    written.ok ? keepingForeignWords(def, written.value, root[def.key]) : undefined,
  )
}
