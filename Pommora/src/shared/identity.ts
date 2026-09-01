// The single owner of the content-file identity key. A content file names its kind in the KEY it
// stores its id under; the folder's sidecar answers "what is this?" first, and this key must agree
// with it. A sidecar's own `id` is NOT this key — a sidecar's kind is its filename.

export type ContentKind = 'page' | 'task' | 'event'

// `as const satisfies` rather than a plain Record: a widened `string` would collapse the computed
// key in `pageFrontmatter` into an index signature, blinding the type gate while still compiling.
export const KIND_ID_KEY = {
  page: 'PageID',
  task: 'TaskID',
  event: 'EventID',
} as const satisfies Record<ContentKind, string>

export const PAGE_ID_KEY = KIND_ID_KEY.page

/** The modeled top-level page keys a FULL page rewrite governs (set if present, else delete).
 *  Partial updates pass a narrower key set so they touch nothing else. */
export const PAGE_MODELED_KEYS = [PAGE_ID_KEY, 'icon', 'cover'] as const

const ALL_KIND_KEYS = Object.values(KIND_ID_KEY)

/** Crockford base32, 26 chars — I, L, O and U are absent from the alphabet by design. */
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/

/** Whether a value can serve as a content id. Shared so "what a ULID looks like" is stated once. */
export function isUlidShaped(value: unknown): value is string {
  return typeof value === 'string' && ULID_RE.test(value)
}

/** A key with no value is an ABSENT key — clearing a property in an outside editor writes `PageID:`
 *  with nothing after it. Reading that as a malformed identity would make the file invisible for
 *  what the user experienced as deleting a field. */
const presentKeys = (fm: Record<string, unknown>) =>
  ALL_KIND_KEYS.filter((k) => fm[k] !== undefined && fm[k] !== null && fm[k] !== '')

export type Admission =
  | { state: 'member'; id: string }
  | { state: 'missing' }
  | { state: 'unknown'; reason: 'contradicting' | 'malformed' | 'dual' }

/**
 * THE admission predicate, shared verbatim by the walk and the adoption pass — landing it in only
 * one of the two silently converts mislocated files.
 *
 * It checks ALL three keys because distinguishing mismatched from missing is a multi-key question:
 * a `TaskID` file sitting in a Collection must read invisible, not adoptable, or adoption stamps a
 * second key onto it and the file becomes ambiguous forever. Everything it rejects is Unknown — not
 * an error, not a member, and never stamped over.
 */
export function admitContentFile(fm: Record<string, unknown>, expected: ContentKind): Admission {
  const present = presentKeys(fm)
  // Ambiguity outranks every other question: with two keys there is no "the" key to judge.
  if (present.length > 1) return { state: 'unknown', reason: 'dual' }
  if (present.length === 0) return { state: 'missing' }
  const raw = fm[present[0]]
  // Hand-authored keys are a supported input, so garbage must not become a live identity.
  if (!isUlidShaped(raw)) return { state: 'unknown', reason: 'malformed' }
  if (present[0] !== KIND_ID_KEY[expected]) return { state: 'unknown', reason: 'contradicting' }
  return { state: 'member', id: raw }
}

/** The content id off a parsed frontmatter root, whichever kind key holds it — for readers whose
 *  kind context already decided admission. Deliberately WITHOUT shape validation, so a hand-authored
 *  id still reads. */
export function contentId(fm: Record<string, unknown>): string | undefined {
  const present = presentKeys(fm)
  if (present.length !== 1) return undefined
  const v = fm[present[0]]
  return typeof v === 'string' && v.length > 0 ? v : undefined
}
