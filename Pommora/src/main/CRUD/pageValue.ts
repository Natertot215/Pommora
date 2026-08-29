// Page value primitives — strip or rewrite ONE option's value on a page, plus stripPageMember,
// which deletes a whole property key. Type-switched over the on-disk value
// shapes: multi_select = string array; every single-option kind, Status included, = bare string. Multi arrays
// are edited IN PLACE (filter/map on the raw array), never decode-to-strings→re-encode: a page
// may carry foreign / non-string elements, and an op must touch only its target.

import type { PropertyType } from '@shared/properties'
import { splitFrontmatter } from '../readNexus'
import { splitEnvelope, mergeFrontmatter } from '../IO/pageFile'
import { nowIso } from './util'

type ValueEdit = { op: 'strip' } | { op: 'replace'; to: string }

/** Sentinel: the page's value doesn't hold the target, so the whole call is a no-op (returns null). */
const SKIP = Symbol('skip')

/** Rewrite the raw stored value so `target` is stripped or replaced, preserving foreign content.
 *  Returns SKIP when the value doesn't hold `target`; otherwise the next value (null = delete key). */
function rewriteRaw(
  raw: unknown,
  type: PropertyType,
  target: string,
  edit: ValueEdit,
): unknown | typeof SKIP {
  if (type === 'multi_select') {
    if (!Array.isArray(raw) || !raw.includes(target)) return SKIP
    if (edit.op === 'replace') {
      // Renaming target into a DIFFERENT value the array already holds would duplicate it — merge
      // instead by dropping the target (its new value is already present). The `to !== target` guard
      // keeps a no-op rename from deleting the value. Foreign elements are otherwise untouched.
      if (edit.to !== target && raw.includes(edit.to)) return raw.filter((el) => el !== target)
      return raw.map((el) => (el === target ? edit.to : el))
    }
    const filtered = raw.filter((el) => el !== target)
    return filtered.length ? filtered : null
  }
  // select and status alike — both store the bare option label.
  if (raw !== target) return SKIP
  return edit.op === 'replace' ? edit.to : null
}

function applyEdit(
  content: string,
  key: string,
  type: PropertyType,
  target: string,
  edit: ValueEdit,
): string | null {
  const root = splitFrontmatter(content)
  const nextValue = rewriteRaw((root as Record<string, unknown>)[key], type, target, edit)
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
export function stripPageValue(
  content: string,
  key: string,
  value: string,
  type: PropertyType,
): string | null {
  return applyEdit(content, key, type, value, { op: 'strip' })
}

/** Rename cascade: swap oldValue → newValue in place. Returns null if the page didn't hold it. */
export function replacePageValue(
  content: string,
  key: string,
  oldValue: string,
  newValue: string,
  type: PropertyType,
): string | null {
  return applyEdit(content, key, type, oldValue, { op: 'replace', to: newValue })
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
