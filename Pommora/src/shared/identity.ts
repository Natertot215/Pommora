// The single owner of the content-file identity key. A content file names its kind in the KEY it
// stores its id under, so the universal question is "what is this?" before "what is its id" — the
// folder's sidecar answers the first, this key must agree with it, and the value stays a bare ULID.
// A sidecar's own `id` is NOT this key: a sidecar's kind is its filename.
// Pure: no runtime imports, safe for main, preload and renderer alike.

export type ContentKind = 'page' | 'task' | 'event'

// `as const satisfies` rather than a plain Record: a widened `string` would collapse the computed
// key in `pageFrontmatter` into an index signature, blinding the type gate over the whole
// frontmatter surface while still compiling.
export const KIND_ID_KEY = {
  page: 'PageID',
  task: 'TaskID',
  event: 'EventID',
} as const satisfies Record<ContentKind, string>

export const PAGE_ID_KEY = KIND_ID_KEY.page

const ALL_KIND_KEYS: readonly string[] = Object.values(KIND_ID_KEY)

/** Crockford base32, 26 chars — I, L, O and U are absent from the alphabet by design. */
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/

/** Whether a value can serve as a content id. Shared so "what a ULID looks like" is stated once. */
export function isUlidShaped(value: unknown): value is string {
  return typeof value === 'string' && ULID_RE.test(value)
}

export type Admission =
  | { state: 'member'; id: string }
  | { state: 'missing' }
  | { state: 'unknown'; reason: 'contradicting' | 'malformed' | 'dual' }

/**
 * THE admission predicate, shared verbatim by the walk and the adoption pass — landing it in only
 * one of the two silently converts mislocated files.
 *
 * It is the one reader that checks ALL three keys, because distinguishing mismatched from missing
 * is definitionally a multi-key question: a `TaskID` file sitting in a Collection must read
 * invisible, not adoptable, or adoption stamps a second key onto it and the file becomes ambiguous
 * forever. Everything it rejects is Unknown — not an error, not a member, and never stamped over.
 */
export function admitContentFile(
  fm: Record<string, unknown>,
  expected: ContentKind,
): Admission {
  const present = ALL_KIND_KEYS.filter((k) => fm[k] !== undefined)
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
 *  kind context already decided admission. Deliberately WITHOUT shape validation: shape belongs to
 *  the predicate above, and keeping this lenient is what lets a hand-authored id still read. */
export function contentId(fm: Record<string, unknown>): string | undefined {
  const present = ALL_KIND_KEYS.filter((k) => fm[k] !== undefined)
  if (present.length !== 1) return undefined
  const v = fm[present[0]]
  return typeof v === 'string' && v.length > 0 ? v : undefined
}
