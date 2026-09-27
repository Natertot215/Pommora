// Option lists are edited IN PLACE, never decode-to-strings→re-encode: a holder may carry foreign or non-string elements, and an op must touch only its target.

import { setOrDrop } from '../Files/atomicWrite'
import { listOf } from '../Contract/validators'
import type { Rewrite } from './governedSweep'

export type ValueEdit = { op: 'strip' } | { op: 'replace'; to: string }
export type Matcher = (el: unknown) => boolean

export const namesValue =
  (value: string): Matcher =>
  (el) =>
    (typeof el === 'string' || typeof el === 'number' || typeof el === 'boolean') &&
    String(el) === value

export const stripList = (xs: readonly unknown[], matches: Matcher): unknown[] | null =>
  xs.some(matches) ? xs.filter((el) => !matches(el)) : null

export function editList(
  xs: readonly unknown[],
  names: (value: string) => Matcher,
  target: string,
  edit: ValueEdit,
): unknown[] | null {
  const matches = names(target)
  if (edit.op === 'strip') return stripList(xs, matches)
  if (!xs.some(matches)) return null
  const isTo = names(edit.to)
  const out: unknown[] = []
  for (const el of xs) {
    const next = matches(el) || isTo(el) ? edit.to : el
    if (next !== edit.to || !out.includes(edit.to)) out.push(next)
  }
  return out
}

export function valueEditRewrite(key: string, target: string, edit: ValueEdit): Rewrite {
  return (raw) => {
    const held = raw[key]
    const next = editList(listOf(held), namesValue, target, edit)
    if (next === null) return null
    return setOrDrop(raw, key, next.length ? next : undefined)
  }
}
