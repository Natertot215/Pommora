// Option lists are edited IN PLACE, never decode-to-strings→re-encode — a holder may carry foreign or non-string elements, and an op must touch only its target.

import type { Rewrite } from './governedSweep'
import { editHeldList, memberKey } from '../Files/heldKeys'
import type { PropertyDefinition } from './properties'

export type ValueEdit = { op: 'strip' } | { op: 'replace'; to: string }
export type Matcher = (el: unknown) => boolean

export const namesValue = (value: string): Matcher => {
  const want = memberKey(value)
  return (el) => memberKey(el) === want
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

export function valueEditRewrite(
  def: Pick<PropertyDefinition, 'key'>,
  target: string,
  edit: ValueEdit,
): Rewrite {
  return (raw) => editHeldList(raw, def.key, (held) => editList(held, target, edit))
}
