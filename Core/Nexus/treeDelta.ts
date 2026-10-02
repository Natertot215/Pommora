// The difference between two trees, as the host takes it and the window applies it: a whole tree costs the window a clone, a compare, and an index rebuild that each grow with the Nexus (about 30 ms at 10,000 pages), where a difference costs what moved. A plain object recurses by key, a list whose members each carry a key recurses by member, and everything else is replaced whole. A difference carries absolute values, never offsets, so one applied twice lands the same place.

import { isPlainObject } from '../Contract/validators'
import { same } from '../Files/stableJson'

// Each member's one required key is its tag; a `kind` beside it would repeat it on every node of every push.
export type Delta<T = unknown> =
  | { set: T }
  | { drop: true }
  | { at: Record<string, Delta>; keys?: string[] }

/** What names a list's member across two trees: a node's path, a Context group's id, or a definition's or view's id. */
function keyOf(item: unknown): string | null {
  if (!isPlainObject(item)) return null
  const key = item.path ?? (isPlainObject(item.def) ? item.def.id : undefined) ?? item.id
  return typeof key === 'string' ? key : null
}

/** A list's members by key; null for a list that isn't keyed or holds one key twice, which is replaced whole. */
function keyed(list: unknown[]): Map<string, unknown> | null {
  const out = new Map<string, unknown>()
  for (const item of list) {
    const key = keyOf(item)
    if (key === null || out.has(key)) return null
    out.set(key, item)
  }
  return out
}

function fields(prev: Map<string, unknown>, next: Map<string, unknown>): Record<string, Delta> {
  const at: Record<string, Delta> = {}
  for (const [key, value] of next) {
    const d = prev.has(key) ? deltaOf(prev.get(key), value) : { set: value }
    if (d) at[key] = d
  }
  for (const key of prev.keys()) if (!next.has(key)) at[key] = { drop: true }
  return at
}

/** Null when nothing differs. A subtree both trees share by reference is never entered, which is what keeps the cost to what changed. */
export function deltaOf<T>(prev: T | undefined, next: T): Delta<T> | null {
  if (Object.is(prev, next)) return null
  if (Array.isArray(prev) && Array.isArray(next)) {
    const a = keyed(prev)
    const b = keyed(next)
    if (!a || !b) return same(prev, next) ? null : { set: next }
    const at = fields(a, b)
    const keys = [...b.keys()]
    const moved = keys.length !== prev.length || keys.some((key, i) => key !== keyOf(prev[i]))
    if (moved) return { at, keys }
    return Object.keys(at).length ? { at } : null
  }
  if (isPlainObject(prev) && isPlainObject(next)) {
    const at = fields(new Map(Object.entries(prev)), new Map(Object.entries(next)))
    return Object.keys(at).length ? { at } : null
  }
  return { set: next }
}

function edit(held: Map<string, unknown>, at: Record<string, Delta>): Map<string, unknown> {
  const out = new Map(held)
  for (const [key, d] of Object.entries(at)) {
    if ('drop' in d) out.delete(key)
    else if ('set' in d) out.set(key, d.set)
    else if (out.has(key)) out.set(key, applyDelta(out.get(key), d))
    else throw new Error(`The difference names "${key}", which the tree never held.`)
  }
  return out
}

/** Throws when the difference doesn't fit what is held, which tells the window to ask for the whole tree. Whatever the difference doesn't name keeps its identity. */
export function applyDelta<T>(prev: T, delta: Delta): T {
  if (!('at' in delta)) return ('set' in delta ? delta.set : undefined) as T
  if (Array.isArray(prev)) {
    const held = keyed(prev)
    if (!held) throw new Error('The difference names a list the tree holds unkeyed.')
    const next = edit(held, delta.at)
    return (delta.keys ?? [...next.keys()]).map((key) => {
      if (!next.has(key))
        throw new Error(`The difference orders "${key}", which the tree never held.`)
      return next.get(key)
    }) as T
  }
  if (!isPlainObject(prev)) throw new Error('The difference names a value the tree holds whole.')
  return Object.fromEntries(edit(new Map(Object.entries(prev)), delta.at)) as T
}
