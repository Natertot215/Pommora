export type ContentKind = 'page' | 'task' | 'event'

export const ID_KEY = 'ID'

export const RETIRED_ID_KEYS = ['PageID', 'TaskID', 'EventID'] as const

export const KIND_MARK = {
  page: 'P',
  task: 'T',
  event: 'E',
} as const satisfies Record<ContentKind, string>

const MARK_INDEX = 10

const MARK_KIND = new Map<string, ContentKind>(
  (Object.entries(KIND_MARK) as [ContentKind, string][]).map(([kind, mark]) => [mark, kind]),
)

export const PAGE_MODELED_KEYS = [ID_KEY, 'icon', 'banner'] as const

const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/

export function isUlidShaped(value: unknown): value is string {
  return typeof value === 'string' && ULID_RE.test(value)
}

export function markId(id: string, kind: ContentKind): string {
  return id.slice(0, MARK_INDEX) + KIND_MARK[kind] + id.slice(MARK_INDEX + 1)
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

export function contentId(fm: Record<string, unknown>): string | undefined {
  const v = fm[ID_KEY]
  return typeof v === 'string' && v.length > 0 ? v : undefined
}
