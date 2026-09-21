// Option lists are edited IN PLACE, never decode-to-strings→re-encode: a holder may carry foreign or non-string elements, and an op must touch only its target.

import { splitEnvelope, mergeFrontmatter, splitFrontmatter } from '../Files/pageFile'
import type { Rewrite } from './governedSweep'

export type ValueEdit = { op: 'strip' } | { op: 'replace'; to: string }

const SKIP = Symbol('skip')

function rewriteRaw(raw: unknown, target: string, edit: ValueEdit): unknown | typeof SKIP {
  const xs = Array.isArray(raw) ? raw : [raw]
  const names = (el: unknown, value: string): boolean =>
    (typeof el === 'string' || typeof el === 'number' || typeof el === 'boolean') &&
    String(el) === value
  if (!xs.some((el) => names(el, target))) return SKIP
  if (edit.op === 'replace') {
    // Renaming into a value the list already holds would duplicate it — merge by dropping the target instead; `to !== target` keeps a no-op rename from deleting the value.
    if (edit.to !== target && xs.some((el) => names(el, edit.to)))
      return xs.filter((el) => !names(el, target))
    return xs.map((el) => (names(el, target) ? edit.to : el))
  }
  const filtered = xs.filter((el) => !names(el, target))
  return filtered.length ? filtered : null
}

export function valueEditRewrite(key: string, target: string, edit: ValueEdit): Rewrite {
  return (raw) => {
    const next = rewriteRaw(raw[key], target, edit)
    if (next === SKIP) return null
    const out = { ...raw }
    if (next === null) delete out[key]
    else out[key] = next
    return out
  }
}

export function stripPageMember(content: string, key: string): string | null {
  const root = splitFrontmatter(content) as Record<string, unknown>
  if (!(key in root)) return null
  return mergeFrontmatter(content, {}, [key], splitEnvelope(content).body)
}
