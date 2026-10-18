// Option lists are edited IN PLACE, never decode-to-strings→re-encode — a holder may carry foreign or non-string elements, and an op must touch only its target.

import type { Rewrite } from './governedSweep'
import { editHeldList, memberKey } from '../Files/heldKeys'
import type { PropertyDefinition } from './properties'

/** Each member an edit names, matched by `memberKey`, and the member it becomes, or null to strip it. */
export type ValueEdit = ReadonlyMap<string, string | null>
export type Matcher = (el: unknown) => boolean

export const namesValue = (value: string): Matcher => {
  const want = memberKey(value)
  return (el) => memberKey(el) === want
}

export const stripList = (xs: readonly unknown[], matches: Matcher): unknown[] | null =>
  xs.some(matches) ? xs.filter((el) => !matches(el)) : null

/** `xs` with every member `edit` names renamed or stripped in one pass, a member landing on a target the list holds kept once where it first lands; null when `edit` names no member. */
export function editList(xs: readonly unknown[], edit: ValueEdit): unknown[] | null {
  const to = new Map<unknown, string | null>(
    [...edit].map(([from, next]) => [memberKey(from), next]),
  )
  if (!xs.some((el) => to.has(memberKey(el)))) return null
  const targets = new Set([...edit.values()].flatMap((t) => (t === null ? [] : [memberKey(t)])))
  const landed = new Set<unknown>()
  const out: unknown[] = []
  for (const el of xs) {
    const named = to.has(memberKey(el))
    const next = named ? to.get(memberKey(el)) : el
    if (named && next === null) continue
    const key = memberKey(next)
    if (targets.has(key)) {
      if (landed.has(key)) continue
      landed.add(key)
    }
    out.push(next)
  }
  return out
}

export const valueEditRewrite =
  (def: Pick<PropertyDefinition, 'key'>, edit: ValueEdit): Rewrite =>
  (raw) =>
    editHeldList(raw, def.key, (held) => editList(held, edit))
