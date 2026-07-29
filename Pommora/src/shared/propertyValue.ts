// PropertyValue — the in-memory shape of a stored value, and the one decoder that produces it.
//
// The DECLARED TYPE decides, never the bytes. A frontmatter key names its property, so the
// definition is in hand before the value is read and there is nothing to infer: a select option
// spelled `2024-01-01` stays a select, which shape inference could never guarantee. That single
// fact is why one decoder replaces three — a shape guesser, the re-tagger that corrected its
// guesses, and a hand-rolled decoder written to avoid it.
//
// `strict` is the restore gate and nothing else: it additionally requires option membership,
// refuses a raw JS type the schema cannot hold, and refuses emptiness. Reads pass nothing, so a
// value whose option was edited outside the app still renders its own text.
//
// Pure: no fs, no Node — importable by both main and renderer.

import type { PropertyDefinition } from './properties'

/** On-disk file-attachment shape (snake_case = the on-disk DTO). Round-trips as-is;
 *  unknown keys on a file object are preserved (the decoder passes the object through). */
export interface FileRef {
  path: string
  original_name?: string
  added_at?: string
  mime_type?: string
}

export type PropertyValue =
  | { kind: 'number'; value: number }
  | { kind: 'checkbox'; value: boolean }
  | { kind: 'datetime'; value: string } // ISO-8601; a bare "yyyy-MM-dd" is a date-only datetime
  | { kind: 'select'; value: string } // every single-option kind, Status included
  | { kind: 'multiSelect'; value: string[] }
  /** Context target ULIDs. Kept while the Status tag goes, because Context is NOT derivable from
   *  the schema on the value path — the type resolver runs there without the Context id list. */
  | { kind: 'context'; value: string[] }
  | { kind: 'url'; value: string }
  | { kind: 'file'; value: FileRef[] }
  | { kind: 'lastEditedTime' } // virtual — never persisted (encode throws)
  | { kind: 'null' }

/** True for a plain (non-null, non-array) object. The one shared shape guard for JSON /
 *  frontmatter records across the data layer. */
export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isFileRef(v: unknown): v is FileRef {
  return isPlainObject(v) && typeof v.path === 'string'
}

/** Every option value a definition offers, whichever list holds them. */
function optionValues(def: PropertyDefinition): string[] {
  return def.type === 'status'
    ? (def.status_groups ?? []).flatMap((g) => g.options.map((o) => o.value))
    : (def.select_options ?? []).map((o) => o.value)
}

const NULL: PropertyValue = { kind: 'null' }

/**
 * Decode a raw on-disk value against the type its definition declares. A value the declared type
 * cannot hold reads as null rather than as some other type — there is no fallback ladder.
 */
export function decodeValue(
  def: PropertyDefinition,
  raw: unknown,
  opts: { strict?: boolean } = {},
): PropertyValue {
  if (raw === null || raw === undefined) return NULL
  const strict = opts.strict === true
  const str = (v: PropertyValue & { value: string }): PropertyValue =>
    strict && v.value === '' ? NULL : v

  switch (def.type) {
    case 'number':
      return typeof raw === 'number' ? { kind: 'number', value: raw } : NULL
    case 'checkbox':
      return typeof raw === 'boolean' ? { kind: 'checkbox', value: raw } : NULL
    case 'url':
      return typeof raw === 'string' ? str({ kind: 'url', value: raw }) : NULL
    case 'datetime':
    // A last_edited_time column reads a stored stamp the same way. "Virtual, never persisted" is
    // an encode rule, and encodeValue enforces it by throwing.
    case 'last_edited_time':
      return typeof raw === 'string' ? str({ kind: 'datetime', value: raw }) : NULL
    case 'select':
    case 'status': {
      if (typeof raw !== 'string') return NULL
      if (strict && !optionValues(def).includes(raw)) return NULL
      return str({ kind: 'select', value: raw })
    }
    case 'multi_select': {
      if (!Array.isArray(raw) || !raw.every((x): x is string => typeof x === 'string')) return NULL
      const kept = strict ? raw.filter((v) => optionValues(def).includes(v)) : raw
      return strict && kept.length === 0 ? NULL : { kind: 'multiSelect', value: kept }
    }
    case 'file': {
      if (!Array.isArray(raw) || !raw.every(isFileRef)) return NULL
      return strict && raw.length === 0 ? NULL : { kind: 'file', value: raw }
    }
    default:
      // A Context column resolves at walk assembly and never routes here.
      return NULL
  }
}

/** Encode a PropertyValue to its on-disk value — bare, with no tag wrapping it. The switch is
 *  exhaustive (the compiler enforces every case). `lastEditedTime` is virtual and throws. */
export function encodeValue(value: PropertyValue): unknown {
  switch (value.kind) {
    case 'number':
    case 'checkbox':
    case 'select':
    case 'url':
    case 'datetime':
    case 'multiSelect':
    case 'file':
      return value.value
    case 'context':
      return value.value
    case 'null':
      return null
    case 'lastEditedTime':
      throw new Error(
        'PropertyValue.lastEditedTime is virtual and must not be persisted; derive from modified_at at read time.',
      )
  }
}

/** True when a value carries nothing — an empty array or empty string. Checkbox `false` and
 *  number `0` are real values and stay. */
function isEmptyValue(value: PropertyValue): boolean {
  switch (value.kind) {
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

/** A value a clear would actually remove — an explicit `null`, the null kind, or an empty
 *  collection/string. The set/clear write rule and the "is this cell filled (worth offering a Clear
 *  action)" check share this one predicate; a filled cell is simply `!isBlankValue`. */
export function isBlankValue(value: PropertyValue | null): boolean {
  return value === null || value.kind === 'null' || isEmptyValue(value)
}

/** Set or clear one property on a (possibly malformed) properties record, returning the next
 *  record. A null value (the `null` kind) OR an empty value clears the key — a page without a
 *  value has no key at all, never a null/[]/'' placeholder. The single owner of the page + agenda
 *  property set/clear rule. */
export function applyPropertyValue(
  current: unknown,
  propertyId: string,
  value: PropertyValue | null,
): Record<string, unknown> {
  const next: Record<string, unknown> = isPlainObject(current) ? { ...current } : {}
  if (value === null || isBlankValue(value)) delete next[propertyId]
  else next[propertyId] = encodeValue(value)
  return next
}
