// What a root holds for a name, and where a write to it lands. A name is held under its exact spelling, else the first key that folds to it, in the root's order: a scalar read acts on that one key and a list read joins every spelling in the root's order; a write lands on a lone spelling where it sits and, when it collapses, puts the name in place of two or more, and a rename, a strip, or a list edit acts on every spelling.

import { setOrDrop } from './atomicWrite'
import type { Json } from './stableJson'
import { foldKey, spellings, normalizeTitle } from '../Paths/caseFold'
import { listOf } from '../Contract/validators'

export const heldKeys = (root: object, name: string): string[] => spellings(Object.keys(root), name)

/** The key `root` reads `name` under; an exact spelling answers before anything folds. */
export const heldKey = (root: object, name: string): string | undefined =>
  Object.hasOwn(root, name) ? name : heldKeys(root, name)[0]

/** What `root` holds for `name`: the value under the key `heldKey` reads, or with `join` every spelling's value as one list, in the root's order. */
export function heldValue(root: Json, name: string, join: boolean): unknown {
  if (!join) {
    const key = heldKey(root, name)
    return key === undefined ? undefined : root[key]
  }
  const fold = foldKey(name)
  const [first, ...rest] = Object.keys(root).filter((k) => foldKey(k) === fold)
  return rest.reduce<unknown>(
    (value, key) => joinValues(value, root[key]),
    first === undefined ? undefined : root[first],
  )
}

interface WriteTarget {
  key: string
  govern: readonly string[]
}

/** Where a write to `name` lands on `root` and the spellings it replaces: with `collapse`, the name itself in place of two or more spellings; otherwise the first spelling, or the name when the root holds none. */
export function writeTarget(root: Json, name: string, collapse = true): WriteTarget {
  const held = heldKeys(root, name)
  return collapse && held.length > 1
    ? { key: name, govern: held }
    : { key: held[0] ?? name, govern: held.slice(0, 1) }
}

/** `root` with `value` under the target's key in place of every key it governs, the target keeping its place when the root holds it; `undefined` drops the key. */
export function landValue(root: Json, { key, govern }: WriteTarget, value: unknown): Json {
  const next = { ...root }
  for (const k of govern) if (k !== key) delete next[k]
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

/** Edits what `name` holds as a list; null when nothing changed. With `join`, every spelling is edited as one list landing where `writeTarget` places it; otherwise each spelling is edited where it sits. A list the edit empties drops its key. */
export function editHeldList(
  raw: Json,
  name: string,
  join: boolean,
  edit: (held: unknown[]) => unknown[] | null,
): Json | null {
  if (join) {
    const held = heldValue(raw, name, true)
    const list = held === undefined ? null : edit(listOf(held))
    return list && landValue(raw, writeTarget(raw, name), list.length ? list : undefined)
  }
  let next: Json | null = null
  for (const key of heldKeys(raw, name)) {
    const list = edit(listOf(raw[key]))
    if (list) next = setOrDrop(next ?? raw, key, list.length ? list : undefined)
  }
  return next
}

/** `root` without `keys`; null when it holds none of them. */
export function stripKeys(root: Json, keys: readonly string[]): Json | null {
  if (!keys.some((k) => k in root)) return null
  return Object.fromEntries(Object.entries(root).filter(([k]) => !keys.includes(k)))
}

/** Strips every spelling of `name` from a root; null when it holds none. */
export const stripHeld =
  (name: string) =>
  (root: Json): Json | null =>
    stripKeys(root, heldKeys(root, name))

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
