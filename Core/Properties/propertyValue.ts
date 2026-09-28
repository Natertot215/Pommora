import { z } from 'zod'
import { listOf } from '../Contract/validators'
import { optionValues, PROPERTY_TYPES, type PropertyDefinition } from './properties'
import { parseConnectionText } from '../Connections/connections'

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

export type Adoption = { propertyId: string; value: string }

// An outside `- 2024` parses as a number and must still name the option "2024".
const optionList = (raw: unknown): string[] =>
  listOf(raw)
    .filter((x) => typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean')
    .map(String)
    .filter((x) => x !== '')

// The one rule for an externally written option list: the newest registered element wins.
export const resolveSingleOption = (
  written: readonly string[],
  known: readonly string[],
): string | undefined => written.filter((v) => known.includes(v)).at(-1)

export function decodeValue(def: PropertyDefinition, raw: unknown): PropertyValue {
  if (raw === null || raw === undefined) return NULL_VALUE
  const kind = PROPERTY_TYPES[def.type].kind
  switch (kind) {
    case 'number':
      return typeof raw === 'number' ? { kind, value: raw } : NULL_VALUE
    case 'checkbox':
      return raw === true ? { kind, value: true } : NULL_VALUE
    case 'link':
    case 'dateTime':
      return typeof raw === 'string' ? { kind, value: raw } : NULL_VALUE
    case 'select': {
      const value = resolveSingleOption(optionList(raw), optionValues(def))
      return value === undefined ? NULL_VALUE : { kind, value }
    }
    case 'multiSelect': {
      const xs = optionList(raw)
      return xs.length === 0 ? NULL_VALUE : { kind, value: xs }
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

/** What a frozen copy may still name: its options are the definition's own, and `holds`, when given, answers which pages still exist. */
export interface Frozen {
  holds?: (title: string) => boolean
}

/** Whether `raw` is a Link naming a page `frozen` doesn't hold; one naming only a heading of its own page always stands. */
export function namesGonePage(raw: unknown, frozen: Frozen): boolean {
  const page = typeof raw === 'string' ? parseConnectionText(raw) : null
  return !!page?.title && frozen.holds !== undefined && !frozen.holds(page.title)
}

// A restore of a frozen copy keeps only the options the definition still offers and the pages its world holds, so a deleted option or page never comes back through it; a live write adopts instead.
export function reconcilePropertyValue(
  def: PropertyDefinition,
  raw: unknown,
  frozen?: Frozen,
): { value: PropertyValue; adoptions: Adoption[] } {
  const value = decodeValue(def, raw)
  if (value.kind === 'link' && frozen && namesGonePage(value.value, frozen))
    return { value: NULL_VALUE, adoptions: [] }
  if (value.kind !== 'multiSelect') return { value, adoptions: [] }
  const known = optionValues(def)
  if (!frozen) {
    const adoptions = value.value
      .filter((v) => !known.includes(v))
      .map((v) => ({ propertyId: def.id, value: v }))
    return { value, adoptions }
  }
  const kept = value.value.filter((v) => known.includes(v))
  return { value: kept.length ? { kind: 'multiSelect', value: kept } : NULL_VALUE, adoptions: [] }
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

export function applyValueAtRoot(
  root: Record<string, unknown>,
  def: PropertyDefinition,
  value: PropertyValue | null,
): Record<string, unknown> {
  const key = def.name
  const next = { ...root }
  if (value === null || isBlankValue(value)) delete next[key]
  else next[key] = encodeValue(value)
  return next
}

export function applyContextAtRoot(
  root: Record<string, unknown>,
  contextId: string,
  spaceIds: string[],
  held?: Record<string, string[]>,
): Record<string, unknown> {
  const current = (root.contextValues as Record<string, string[]> | undefined) ?? held
  return { ...root, contextValues: { ...current, [contextId]: spaceIds } }
}
