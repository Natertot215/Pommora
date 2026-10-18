import type { Json } from './stableJson'
import { spellings, normalizeTitle } from '../Paths/caseFold'
import { isScalar, listOf } from '../Contract/validators'

export const heldKeys = (root: object, name: string): string[] => spellings(Object.keys(root), name)

/** The key `root` reads `name` under; an exact spelling answers before anything folds. */
export const heldKey = (root: object, name: string): string | undefined =>
  Object.hasOwn(root, name) ? name : heldKeys(root, name)[0]

/** `root` with `value` under `key`, in its place when the root holds it; `undefined` drops the key. */
export function landValue(root: Json, key: string, value: unknown): Json {
  const next = { ...root }
  if (value === undefined) delete next[key]
  else next[key] = value
  return next
}

/** What a member matches by: a scalar's folded title, or the member itself. */
export const memberKey = (v: unknown): unknown => (isScalar(v) ? normalizeTitle(v) : v)

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
  const list = raw[key] === undefined ? null : edit(listOf(raw[key]))
  return list && landValue(raw, key, list.length ? list : undefined)
}

/** `root` without `keys`; null when it holds none of them. */
export function stripKeys(root: Json, keys: readonly string[]): Json | null {
  if (!keys.some((k) => k in root)) return null
  return Object.fromEntries(Object.entries(root).filter(([k]) => !keys.includes(k)))
}

export type KeyCollision = 'prefer-new' | 'merge'

/** A JSON root with `oldName` moved to `newName`, null when nothing moves; the twin of `renameFrontmatterKey`, by the same collision rule. */
export function rekeyHeld(
  raw: Json,
  oldName: string,
  newName: string,
  collision: KeyCollision,
): Json | null {
  if (oldName === newName || !Object.hasOwn(raw, oldName)) return null
  const { [oldName]: moved, ...rest } = raw
  if (!Object.hasOwn(rest, newName)) return { ...rest, [newName]: moved }
  return collision === 'prefer-new'
    ? rest
    : { ...rest, [newName]: joinValues(rest[newName], moved) }
}
