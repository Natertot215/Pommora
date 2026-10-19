import type { Json } from './stableJson'
import { exactTitle } from '../Paths/caseFold'
import { isScalar, listOf } from '../Contract/validators'

/** `root` with `value` under `key`, in its place when the root holds it; `undefined` drops the key. */
export function landValue(root: Json, key: string, value: unknown): Json {
  const next = { ...root }
  if (value === undefined) delete next[key]
  else next[key] = value
  return next
}

/** What a member matches by: a scalar's trimmed text, or the member itself. */
export const memberKey = (v: unknown): unknown => (isScalar(v) ? exactTitle(v) : v)

/** Two values as one list: `keep`'s members, then each of `from`'s that matches none of them by `memberKey`; a single value reads as a list of one. */
export function joinValues(keep: unknown, from: unknown): unknown[] {
  const kept = listOf(keep ?? [])
  const seen = new Set(kept.map(memberKey))
  return [...kept, ...listOf(from ?? []).filter((v) => !seen.has(memberKey(v)))]
}

/** Edits what `key` holds as a list; null when nothing changed. A list the edit empties drops its key. */
export function editHeldList(
  raw: Json,
  key: string,
  edit: (held: unknown[]) => unknown[] | null,
): Json | null {
  const list = Object.hasOwn(raw, key) ? edit(listOf(raw[key])) : null
  return list && landValue(raw, key, list.length ? list : undefined)
}

/** `root` without `keys`; null when it holds none of them. */
export function stripKeys(root: Json, keys: readonly string[]): Json | null {
  if (!keys.some((k) => Object.hasOwn(root, k))) return null
  return Object.fromEntries(Object.entries(root).filter(([k]) => !keys.includes(k)))
}

export type KeyCollision = 'prefer-new' | 'merge'

/** A JSON root with `from` moved to `to`, null when nothing moves; the twin of `renameFrontmatterKey`, by the same collision rule. */
export function rekeyHeld(
  raw: Json,
  from: string,
  to: string,
  collision: KeyCollision,
): Json | null {
  if (from === to || !Object.hasOwn(raw, from)) return null
  const { [from]: moved, ...rest } = raw
  if (!Object.hasOwn(rest, to)) return { ...rest, [to]: moved }
  return collision === 'prefer-new' ? rest : { ...rest, [to]: joinValues(rest[to], moved) }
}
