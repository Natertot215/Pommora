// Option lists are edited IN PLACE, never decode-to-strings→re-encode: a holder may carry foreign or non-string elements, and an op must touch only its target.

import { setOrDrop } from '../Files/atomicWrite'
import type { Rewrite } from './governedSweep'

export type ValueEdit = { op: 'strip' } | { op: 'replace'; to: string }
export type Matcher = (el: unknown) => boolean

export const namesValue =
  (value: string): Matcher =>
  (el) =>
    (typeof el === 'string' || typeof el === 'number' || typeof el === 'boolean') &&
    String(el) === value

/** Replaces or removes the elements `matches` names; null when nothing matched, and a replace holds one copy of `to`. */
export function editList(
  xs: readonly unknown[],
  matches: Matcher,
  edit: ValueEdit,
): unknown[] | null {
  if (!xs.some(matches)) return null
  if (edit.op === 'strip') return xs.filter((el) => !matches(el))
  const isTo = namesValue(edit.to)
  const out: unknown[] = []
  for (const el of xs) {
    const next = matches(el) ? edit.to : el
    if (!(isTo(next) && out.some(isTo))) out.push(next)
  }
  return out
}

export function valueEditRewrite(key: string, target: string, edit: ValueEdit): Rewrite {
  return (raw) => {
    const held = raw[key]
    const next = editList(Array.isArray(held) ? held : [held], namesValue(target), edit)
    if (next === null) return null
    return setOrDrop(raw, key, next.length ? next : undefined)
  }
}
