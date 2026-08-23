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

import { wrapKey } from './governedKeys'
import { optionValues, type PropertyDefinition } from './properties'

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
  | { kind: 'file'; value: string[] } // `[[Name.ext]]` wikilinks, resolved in the asset basename domain
  | { kind: 'lastEditedTime' } // virtual — never persisted (encode throws)
  | { kind: 'null' }

/** True for a plain (non-null, non-array) object. The one shared shape guard for JSON /
 *  frontmatter records across the data layer. */
export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** YAML reads an unquoted `[[Name.ext]]` as a nested flow sequence rather than a string — one
 *  level deep under a block sequence, two under an inline one. Unwrapping single-element arrays
 *  back to their spelling keeps a hand-edit from nulling the whole value, which would take the
 *  page's other attachments with it and let the next in-app add overwrite them on disk. */
function fileEntry(v: unknown): string | null {
  if (typeof v === 'string') return v
  let inner: unknown = v
  while (Array.isArray(inner) && inner.length === 1) inner = inner[0]
  return typeof inner === 'string' ? `[[${inner}]]` : null
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
    // Shape-identical to multi_select and deliberately NOT merged with it: multi_select is
    // option-gated under strict, and optionValues on a file def returns [] — a merged case would
    // discard every attachment through the restore path. File is gated on nothing but emptiness.
    case 'file': {
      if (!Array.isArray(raw)) return NULL
      // An entry nothing can spell is DROPPED, never fatal to the list. A dangling `- ` under an
      // attachment key is YAML null, and a hand-edit that leaves one behind must not take the
      // page's other attachments with it — a nulled value renders blank, and the next in-app add
      // writes a one-entry list straight over references whose files are still on disk.
      const entries: string[] = []
      for (const x of raw) {
        const entry = fileEntry(x)
        if (entry !== null && entry !== '') entries.push(entry)
      }
      // Nothing left to name is nothing — which is also what `strict` refuses, so the two answers
      // are the same one and the gate needs no arm of its own.
      return entries.length === 0 ? NULL : { kind: 'file', value: entries }
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

/** A value a clear would actually remove — an explicit `null`, the null kind, or an empty
 *  collection/string. Checkbox `false` and number `0` carry meaning and are never blank. The
 *  set/clear write rule and the "is this cell filled (worth offering a Clear action)" check share
 *  this one predicate; a filled cell is simply `!isBlankValue`. */
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

/** A property definition → the frontmatter key its values live under. The Context layer's
 *  `contextKey(title)` in the same shape. */
export function propertyKey(def: PropertyDefinition): string {
  return wrapKey('property', def.name)
}

/** Patch one property onto a frontmatter ROOT, returning the next root. The renderer's optimistic
 *  mirror of the main-side write: same key, same no-empties rule, so a cell reads the same value
 *  whether the commit has landed yet or not. */
export function applyValueAtRoot(
  root: Record<string, unknown>,
  def: PropertyDefinition,
  value: PropertyValue | null,
): Record<string, unknown> {
  const key = propertyKey(def)
  const next = { ...root }
  if (value === null || isBlankValue(value)) delete next[key]
  else next[key] = encodeValue(value)
  return next
}
