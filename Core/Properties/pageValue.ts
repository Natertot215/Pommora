// Raw values as a root holds them: what it holds for a name, how two values join, and option lists edited IN PLACE, never decode-to-strings→re-encode — a holder may carry foreign or non-string elements, and an op must touch only its target.

import { setOrDrop } from '../Files/atomicWrite'
import { isScalar, listOf } from '../Contract/validators'
import type { Rewrite } from './governedSweep'
import { heldKey, heldKeys } from '../Paths/caseFold'
import { normalizeTitle } from '../Connections/connections'
import type { Json } from '../Files/stableJson'

/** Two values as one list: `keep`'s members, then each of `from`'s whose title folds to none of them; a single value reads as a list of one. Every join of two spellings, and a `'merge'` rename, uses it. */
export function joinValues(keep: unknown, from: unknown): unknown[] {
  const kept = keep == null ? [] : listOf(keep)
  const seen = new Set(kept.map(normalizeTitle))
  return [
    ...kept,
    ...(from == null ? [] : listOf(from)).filter((v) => !seen.has(normalizeTitle(v))),
  ]
}

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

export type ValueEdit = { op: 'strip' } | { op: 'replace'; to: string }
export type Matcher = (el: unknown) => boolean

export const namesValue = (value: string): Matcher => {
  const want = normalizeTitle(value)
  return (el) => isScalar(el) && normalizeTitle(el) === want
}

export const stripList = (xs: readonly unknown[], matches: Matcher): unknown[] | null =>
  xs.some(matches) ? xs.filter((el) => !matches(el)) : null

export function editList(
  xs: readonly unknown[],
  target: string,
  edit: ValueEdit,
): unknown[] | null {
  const matches = namesValue(target)
  if (edit.op === 'strip') return stripList(xs, matches)
  if (!xs.some(matches)) return null
  const isTo = namesValue(edit.to)
  const out: unknown[] = []
  for (const el of xs) {
    const next = matches(el) || isTo(el) ? edit.to : el
    if (next !== edit.to || !out.includes(edit.to)) out.push(next)
  }
  return out
}

export function valueEditRewrite(name: string, target: string, edit: ValueEdit): Rewrite {
  return (raw) => editHeldLists(raw, name, (held) => editList(held, target, edit))
}
