import { CONTENT_KINDS, ENTITIES, type ContentKind } from './entities'

export const ID_KEY = 'ID'

const MARK_INDEX = 10

const MARK_KIND = new Map<string, ContentKind>(
  CONTENT_KINDS.map((kind) => [ENTITIES[kind].mark, kind]),
)

export const PAGE_MODELED_KEYS = [ID_KEY, 'banner'] as const

/** Case-SENSITIVE where the ulid library is not: an id becomes a folder name, and a case-insensitive filesystem would collide two ids the library calls equal. */
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/

export function isUlidShaped(value: unknown): value is string {
  return typeof value === 'string' && ULID_RE.test(value)
}

export function markId(id: string, kind: ContentKind): string {
  return id.slice(0, MARK_INDEX) + ENTITIES[kind].mark + id.slice(MARK_INDEX + 1)
}

export function kindOf(id: string): ContentKind | null {
  return MARK_KIND.get(id[MARK_INDEX]) ?? null
}

export type Admission =
  | { state: 'member'; id: string }
  | { state: 'missing' }
  | { state: 'unknown'; reason: 'contradicting' | 'malformed' }

export function admitContentFile(fm: Record<string, unknown>, expected: ContentKind): Admission {
  const raw = fm[ID_KEY]
  if (raw === undefined || raw === null || raw === '') return { state: 'missing' }
  if (!isUlidShaped(raw)) return { state: 'unknown', reason: 'malformed' }
  if (kindOf(raw) !== expected) return { state: 'unknown', reason: 'contradicting' }
  return { state: 'member', id: raw }
}
