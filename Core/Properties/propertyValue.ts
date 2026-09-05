import { optionValues, type PropertyDefinition } from './properties'

export type PropertyValue =
  | { kind: 'number'; value: number }
  | { kind: 'checkbox'; value: true }
  | { kind: 'datetime'; value: string } // ISO-8601; a bare "yyyy-MM-dd" is a date-only datetime
  | { kind: 'select'; value: string }
  | { kind: 'multiSelect'; value: string[] }
  /** Context target ULIDs. Kept while the Status tag goes, because Context is NOT derivable from
   *  the schema on the value path — the type resolver runs there without the Context id list. */
  | { kind: 'context'; value: string[] }
  | { kind: 'url'; value: string }
  | { kind: 'file'; value: string[] } // `[[Name.ext]]` wikilinks, resolved in the asset basename domain
  | { kind: 'null' }

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** YAML reads an unquoted `[[Name.ext]]` as a nested flow sequence rather than a string; unwrapping
 *  single-element arrays back to their spelling keeps a hand-edit from nulling the whole value. */
function fileEntry(v: unknown): string | null {
  if (typeof v === 'string') return v
  let inner: unknown = v
  while (Array.isArray(inner) && inner.length === 1) inner = inner[0]
  return typeof inner === 'string' ? `[[${inner}]]` : null
}

const NULL: PropertyValue = { kind: 'null' }

export type Adoption = { propertyId: string; value: string }

// An outside `- 2024` parses as a number and must still name the option "2024".
export const optionList = (raw: unknown): string[] =>
  (Array.isArray(raw) ? raw : [raw])
    .filter((x) => typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean')
    .map(String)
    .filter((x) => x !== '')

// The one rule for an externally written option list: the newest registered element wins.
export const resolveSingleOption = (
  written: readonly string[],
  known: readonly string[],
): string | undefined => written.filter((v) => known.includes(v)).at(-1)

export function decodeValue(def: PropertyDefinition, raw: unknown): PropertyValue {
  if (raw === null || raw === undefined) return NULL

  switch (def.type) {
    case 'number':
      return typeof raw === 'number' ? { kind: 'number', value: raw } : NULL
    case 'checkbox':
      return raw === true ? { kind: 'checkbox', value: true } : NULL
    case 'url':
      return typeof raw === 'string' ? { kind: 'url', value: raw } : NULL
    case 'datetime':
    case 'created_time':
    case 'last_edited_time':
      return typeof raw === 'string' ? { kind: 'datetime', value: raw } : NULL
    case 'select':
    case 'status':
    case 'multi_select': {
      const xs = optionList(raw)
      if (def.type === 'multi_select')
        return xs.length === 0 ? NULL : { kind: 'multiSelect', value: xs }
      const value = resolveSingleOption(xs, optionValues(def))
      return value === undefined ? NULL : { kind: 'select', value }
    }
    // Deliberately NOT merged with multi_select: optionValues on a file def returns [], so a
    // merged case would discard every attachment through the restore path.
    case 'file': {
      // A dangling `- ` under an attachment key is YAML null; an entry nothing can spell is
      // dropped rather than nulling the whole list and losing the other attachments.
      const entries: string[] = []
      for (const x of Array.isArray(raw) ? raw : [raw]) {
        const entry = fileEntry(x)
        if (entry !== null && entry !== '') entries.push(entry)
      }
      return entries.length === 0 ? NULL : { kind: 'file', value: entries }
    }
    default:
      // A Context column resolves at walk assembly and never routes here.
      return NULL
  }
}

/** What a stored value stands as under its definition, and the Multi-Select options it holds that
 *  the definition doesn't offer yet. */
// A write adopts a Multi-Select option the definition lacks; a restore of a frozen copy (the
// Remove cache, a trash bundle) keeps only the options the definition still offers, so a deleted
// option never comes back through it.
export function reconcilePropertyValue(
  def: PropertyDefinition,
  raw: unknown,
  adopt = true,
): { value: PropertyValue; adoptions: Adoption[] } {
  const value = decodeValue(def, raw)
  if (value.kind !== 'multiSelect') return { value, adoptions: [] }
  const known = optionValues(def)
  if (adopt) {
    const adoptions = value.value
      .filter((v) => !known.includes(v))
      .map((v) => ({ propertyId: def.id, value: v }))
    return { value, adoptions }
  }
  const kept = value.value.filter((v) => known.includes(v))
  return { value: kept.length ? { kind: 'multiSelect', value: kept } : NULL, adoptions: [] }
}

export function encodeValue(value: PropertyValue): unknown {
  switch (value.kind) {
    case 'select':
      return [value.value]
    case 'number':
    case 'checkbox':
    case 'url':
    case 'datetime':
    case 'multiSelect':
    case 'file':
    case 'context':
      return value.value
    case 'null':
      return null
  }
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
    case 'url':
    case 'datetime':
      return value.value === ''
    default:
      return false
  }
}

/** The renderer's optimistic mirror of the main-side write, so a cell reads the same value
 *  whether the commit has landed yet or not. */
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
