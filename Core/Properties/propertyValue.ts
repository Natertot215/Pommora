import { z } from 'zod'
import { isScalar, listOf, scalarMembers } from '../Contract/validators'
import {
  CURRENCY_CODES,
  optionsOf,
  PROPERTY_TYPES,
  type PropertyDefinition,
  type SelectOption,
  type StatusOption,
} from './properties'
import { exactTitle, normalizeTitle } from '../Paths/caseFold'
import { joinValues, landValue } from '../Files/rootValues'
import { yamlInline } from '../Files/pageFile'
import { linkEntry } from '../Connections/linkValue'
import { capitalize } from '@pommora/uix/Utilities/capitalize'
import { numberFrom } from '@pommora/uix/Utilities/numberUnit'
import { escapeRegExp } from '@pommora/uix/Utilities/escapeRegExp'

const strings = z.array(z.string())
export const propertyValue = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), value: z.string() }),
  z.object({ kind: z.literal('number'), value: z.number() }),
  z.object({ kind: z.literal('checkbox'), value: z.literal(true) }),
  // ISO-8601; a bare "yyyy-MM-dd" is a date-only value
  z.object({ kind: z.literal('dateTime'), value: z.string() }),
  z.object({ kind: z.literal('select'), value: z.string() }),
  z.object({ kind: z.literal('multiSelect'), value: strings }),
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
export const asText = (raw: unknown): string => linkEntry(raw, 2) ?? yamlInline(raw)

// An outside `- 2024` parses as a number and must still name the option "2024".
export const optionList = (raw: unknown): string[] =>
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

/** The symbol a cell shows for `currency`, spelling out the ambiguous ones (`A$`, `CA$`). */
export const currencySymbol = (currency: string): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency })
    .formatToParts(0)
    .find((p) => p.type === 'currency')?.value ?? currency

const SYMBOL = CURRENCY_CODES.map((c) => escapeRegExp(currencySymbol(c))).join('|')
const NUMBER_SHAPE = new RegExp(`^([+-]?)((?:${SYMBOL})\\s*)?(.*?)(\\s*(?:%|${SYMBOL}))?$`)
const GROUPED = /^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/

interface NumberShape {
  value: number
  lead: string
  tail: string
  grouped: boolean
  places: number
}

/** The number a string spells, the inverse of a cell's own formatting: digits as `numberFrom` reads them, commas only as thousands, and a currency symbol before, or a `%` or a symbol after, never both. */
function numberShape(raw: unknown): NumberShape | null {
  if (typeof raw !== 'string') return null
  const m = NUMBER_SHAPE.exec(raw.trim())
  if (!m || (m[2] && m[4])) return null
  const [, sign, lead = '', body, tail = ''] = m
  const grouped = GROUPED.test(body)
  const value = numberFrom(sign + (grouped ? body.replaceAll(',', '') : body))
  const places = /\.(\d+)$/.exec(body)?.[1].length ?? 0
  return value === undefined ? null : { value, lead, tail, grouped, places }
}

/** The one reading of a stored or typed number: a YAML number as itself, or a string that spells one. */
export const readNumber = (raw: unknown): number | undefined =>
  typeof raw === 'number' ? raw : numberShape(raw)?.value

/** `next` as `raw` spells a number: an unchanged value keeps `raw` as written, and over anything but a string spelling a number it lands bare. */
export function spelledNumber(next: number, raw: unknown): unknown {
  const shape = numberShape(raw)
  if (!shape) return next
  if (shape.value === next) return raw
  // A changed value keeps the file's currency symbol, percent sign, grouping, and decimal places; its digits are the typed value's.
  const digits = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Math.min(shape.places, 20),
    maximumFractionDigits: 20,
    useGrouping: shape.grouped,
  }).format(Math.abs(next))
  const spelled = `${next < 0 ? '-' : ''}${shape.lead}${digits}${shape.tail}`
  return readNumber(spelled) === next ? spelled : next
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

/** A checked value as `raw` spells one: its checked word as written, or its unchecked word's partner in the same casing (`no` → `yes`, `OFF` → `ON`), else `true`. */
export function checkedSpelling(raw: unknown): unknown {
  if (checkboxWord(raw) === true) return raw
  const word = typeof raw === 'string' ? raw.trim() : ''
  const partner = CHECKED_WORD.get(normalizeTitle(word))
  if (partner === undefined) return true
  if (word === word.toUpperCase()) return partner.toUpperCase()
  return word[0] === word[0].toUpperCase() ? capitalize(partner) : partner
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
    default: {
      const _exhaustive: never = value
      void _exhaustive
      return undefined
    }
  }
}

export const valueToWrite = (def: PropertyDefinition, value: PropertyValue | null): unknown =>
  value === null || isBlankValue(value) ? undefined : encodeValue(def, value)

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
): Record<string, unknown> =>
  landValue(root, def.key, keepingForeignWords(def, valueToWrite(def, value), root[def.key]))
