// Option lists are edited IN PLACE (filter/map on the raw list), never decode-to-strings→
// re-encode: a page may carry foreign / non-string elements, and an op must touch only its target.

import { splitFrontmatter } from '../readNexus'
import { splitEnvelope, mergeFrontmatter } from '../IO/pageFile'
import { nowIso } from './util'

type ValueEdit = { op: 'strip' } | { op: 'replace'; to: string }

/** Sentinel: the page's value doesn't hold the target, so the whole call is a no-op (returns null). */
const SKIP = Symbol('skip')

/** Rewrite the raw stored value so `target` is stripped or replaced, preserving foreign content.
 *  Returns SKIP when the value doesn't hold `target`; otherwise the next value (null = delete key). */
function rewriteRaw(raw: unknown, target: string, edit: ValueEdit): unknown | typeof SKIP {
  const xs = Array.isArray(raw) ? raw : [raw]
  const names = (el: unknown, value: string): boolean =>
    (typeof el === 'string' || typeof el === 'number' || typeof el === 'boolean') &&
    String(el) === value
  if (!xs.some((el) => names(el, target))) return SKIP
  if (edit.op === 'replace') {
    // Renaming target into a DIFFERENT value the list already holds would duplicate it — merge
    // instead by dropping the target (its new value is already present). The `to !== target` guard
    // keeps a no-op rename from deleting the value. Foreign elements are otherwise untouched.
    if (edit.to !== target && xs.some((el) => names(el, edit.to)))
      return xs.filter((el) => !names(el, target))
    return xs.map((el) => (names(el, target) ? edit.to : el))
  }
  const filtered = xs.filter((el) => !names(el, target))
  return filtered.length ? filtered : null
}

function applyEdit(content: string, key: string, target: string, edit: ValueEdit): string | null {
  const root = splitFrontmatter(content)
  const nextValue = rewriteRaw((root as Record<string, unknown>)[key], target, edit)
  if (nextValue === SKIP) return null
  return mergeFrontmatter(
    content,
    // A null next value means the option left this page: the key is governed but not supplied,
    // which is how the merge is told to delete it.
    nextValue === null ? { modified_at: nowIso() } : { [key]: nextValue, modified_at: nowIso() },
    [key, 'modified_at'],
    splitEnvelope(content).body,
  )
}

/** Remove one option's value from a page. Returns null if the page didn't hold it. */
export function stripPageValue(content: string, key: string, value: string): string | null {
  return applyEdit(content, key, value, { op: 'strip' })
}

/** Rename cascade: swap oldValue → newValue in place. Returns null if the page didn't hold it. */
export function replacePageValue(
  content: string,
  key: string,
  oldValue: string,
  newValue: string,
): string | null {
  return applyEdit(content, key, oldValue, { op: 'replace', to: newValue })
}

/** Null means the page didn't hold it — the caller writes nothing, so an unrelated page is never
 *  re-dated. The key arrives resolved; a property's values live under its own name. */
export function stripPageMember(content: string, key: string): string | null {
  const root = splitFrontmatter(content) as Record<string, unknown>
  if (!(key in root)) return null
  // The key is governed but not supplied, which is how the merge is told to delete it.
  return mergeFrontmatter(
    content,
    { modified_at: nowIso() },
    [key, 'modified_at'],
    splitEnvelope(content).body,
  )
}
