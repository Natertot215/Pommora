// What a root holds for a name, and where a write to it lands. A name is held under its exact spelling, else the first key that folds to it, in the root's order: a read, a value write, and the reconcile act on that one key, and a rename, a strip, or a list edit acts on every spelling.

import { setOrDrop } from './atomicWrite'
import type { Json } from './stableJson'
import { spellings } from '../Paths/caseFold'
import { normalizeTitle } from '../Connections/connections'
import { listOf } from '../Contract/validators'

export const heldKeys = (root: object, name: string): string[] => spellings(Object.keys(root), name)

/** The key `root` reads `name` under; an exact spelling answers before anything folds. */
export const heldKey = (root: object, name: string): string | undefined =>
  Object.hasOwn(root, name) ? name : heldKeys(root, name)[0]

/** What `root` holds for `name`: the value under the key `heldKey` reads, or with `join` every spelling's value as one list. */
export function heldValue(root: Json, name: string, join: boolean): unknown {
  if (!join) {
    const key = heldKey(root, name)
    return key === undefined ? undefined : root[key]
  }
  const [first, ...rest] = heldKeys(root, name)
  return rest.reduce<unknown>(
    (value, key) => joinValues(value, root[key]),
    first === undefined ? undefined : root[first],
  )
}

interface WriteTarget {
  key: string
  govern: readonly string[]
}

/** Where a write to `name` lands on `root` and the spellings it replaces: the key the root reads, or with `resolveCase` the name itself in place of every spelling. */
export function writeTarget(root: Json, name: string, resolveCase: boolean): WriteTarget {
  const held = heldKeys(root, name)
  return resolveCase
    ? { key: name, govern: held }
    : { key: held[0] ?? name, govern: held.slice(0, 1) }
}

/** `root` with `value` under the target's key in place of every key it governs; `undefined` drops the key. */
export function landValue(root: Json, { key, govern }: WriteTarget, value: unknown): Json {
  const next = { ...root }
  for (const k of govern) delete next[k]
  if (value === undefined) delete next[key]
  else next[key] = value
  return next
}

/** Two values as one list: `keep`'s members, then each of `from`'s whose title folds to none of them; a single value reads as a list of one. Every join of two spellings, and a `'merge'` rename, uses it. */
export function joinValues(keep: unknown, from: unknown): unknown[] {
  const kept = listOf(keep ?? [])
  const seen = new Set(kept.map(normalizeTitle))
  return [...kept, ...listOf(from ?? []).filter((v) => !seen.has(normalizeTitle(v)))]
}

/** Edits the list under every spelling of `name` in place; null when none changed. A list the edit empties drops its key. */
export function editHeldLists(
  raw: Json,
  name: string,
  edit: (held: unknown[]) => unknown[] | null,
): Json | null {
  let next: Json | null = null
  for (const key of heldKeys(raw, name)) {
    const list = edit(listOf(raw[key]))
    if (list) next = setOrDrop(next ?? raw, key, list.length ? list : undefined)
  }
  return next
}

export type KeyCollision = 'prefer-new' | 'merge'

/** A JSON root with every spelling of `oldName` moved to `newName`; the twin of `renameFrontmatterKey`, by the same collision and join rules. */
export function rekeyHeld(
  raw: Json,
  oldName: string,
  newName: string,
  collision: KeyCollision,
  join: boolean,
): Json | null {
  const olds = heldKeys(raw, oldName)
  if (!olds.length) return null
  const rival = heldKey(raw, newName)
  if (rival !== undefined && collision === 'prefer-new')
    return landValue(raw, { key: rival, govern: olds }, raw[rival])
  const moved = heldValue(raw, oldName, join)
  if (rival === undefined) return landValue(raw, { key: newName, govern: olds }, moved)
  return landValue(raw, { key: newName, govern: [...olds, rival] }, joinValues(raw[rival], moved))
}
