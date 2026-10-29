import type { Json } from './stableJson'
import { exactTitle } from '../Paths/caseFold'
import { isScalar, listOf } from '../Contract/validators'

/** Blank as a file spells it, before any definition reads it: nothing, only spaces, or an empty list. */
export const isBlankRaw = (raw: unknown): boolean =>
  raw == null ||
  (typeof raw === 'string' && raw.trim() === '') ||
  (Array.isArray(raw) && raw.length === 0)

/** `root` with `value` under `key`, in its place when the root holds it; a blank value drops the key, so no file holds an empty one. */
export function landValue(root: Json, key: string, value: unknown): Json {
  const next = { ...root }
  if (isBlankRaw(value)) delete next[key]
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
  return list && landValue(raw, key, list)
}

/** `root` without `keys`; null when it holds none of them. */
export function stripKeys(root: Json, keys: readonly string[]): Json | null {
  if (!keys.some((k) => Object.hasOwn(root, k))) return null
  return Object.fromEntries(Object.entries(root).filter(([k]) => !keys.includes(k)))
}

export type KeyCollision = 'prefer-new' | 'merge'

/** A JSON root with `from` moved to `to`, null when nothing moves; the twin of `rekeyed`, by the same collision rule, landing through `landValue`. */
export function rekeyHeld(
  raw: Json,
  from: string,
  to: string,
  collision: KeyCollision,
): Json | null {
  if (from === to || !Object.hasOwn(raw, from)) return null
  const { [from]: moved, ...rest } = raw
  if (!Object.hasOwn(rest, to)) return landValue(rest, to, moved)
  return landValue(rest, to, collision === 'prefer-new' ? rest[to] : joinValues(rest[to], moved))
}

/** Each member an edit names, matched by `memberKey`, and the member it becomes, or null to strip it. */
export type ValueEdit = ReadonlyMap<string, string | null>
export type Matcher = (el: unknown) => boolean

export const namesValue = (value: string): Matcher => {
  const want = memberKey(value)
  return (el) => memberKey(el) === want
}

export const stripList = (xs: readonly unknown[], matches: Matcher): unknown[] | null =>
  xs.some(matches) ? xs.filter((el) => !matches(el)) : null

/** `xs` with every member `edit` names renamed or stripped in one pass, a member landing on a target the list holds kept once where it first lands; null when `edit` names no member. The list is edited in place, never decoded to strings and re-encoded: a holder may carry foreign or non-string elements, and an edit touches only its target. */
export function editList(xs: readonly unknown[], edit: ValueEdit): unknown[] | null {
  const to = new Map<unknown, string | null>(
    [...edit].map(([from, next]) => [memberKey(from), next]),
  )
  if (!xs.some((el) => to.has(memberKey(el)))) return null
  const targets = new Set([...edit.values()].flatMap((t) => (t === null ? [] : [memberKey(t)])))
  const landed = new Set<unknown>()
  const out: unknown[] = []
  for (const el of xs) {
    const mapped = to.get(memberKey(el))
    if (mapped === null) continue
    const next = mapped ?? el
    const key = memberKey(next)
    if (targets.has(key)) {
      if (landed.has(key)) continue
      landed.add(key)
    }
    out.push(next)
  }
  return out
}
