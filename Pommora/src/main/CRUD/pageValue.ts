// Option lists are edited IN PLACE (filter/map on the raw list), never decode-to-strings→
// re-encode: a page may carry foreign / non-string elements, and an op must touch only its target.

import { splitFrontmatter } from '../readNexus'
import { splitEnvelope, mergeFrontmatter } from '../IO/pageFile'

type ValueEdit = { op: 'strip' } | { op: 'replace'; to: string }

const SKIP = Symbol('skip')

/** Preserves foreign content. Returns SKIP when the value doesn't hold `target`; otherwise the
 *  next value (null = delete key). */
function rewriteRaw(raw: unknown, target: string, edit: ValueEdit): unknown | typeof SKIP {
  const xs = Array.isArray(raw) ? raw : [raw]
  const names = (el: unknown, value: string): boolean =>
    (typeof el === 'string' || typeof el === 'number' || typeof el === 'boolean') &&
    String(el) === value
  if (!xs.some((el) => names(el, target))) return SKIP
  if (edit.op === 'replace') {
    // Renaming into a value the list already holds would duplicate it — merge by dropping the
    // target instead. `to !== target` keeps a no-op rename from deleting the value.
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
    // Governed but not supplied is how the merge is told to delete the key.
    nextValue === null ? {} : { [key]: nextValue },
    [key],
    splitEnvelope(content).body,
  )
}

export function stripPageValue(content: string, key: string, value: string): string | null {
  return applyEdit(content, key, value, { op: 'strip' })
}

export function replacePageValue(
  content: string,
  key: string,
  oldValue: string,
  newValue: string,
): string | null {
  return applyEdit(content, key, oldValue, { op: 'replace', to: newValue })
}

/** Null means the page didn't hold it — the caller writes nothing, so an unrelated page is
 *  never rewritten. */
export function stripPageMember(content: string, key: string): string | null {
  const root = splitFrontmatter(content) as Record<string, unknown>
  if (!(key in root)) return null
  return mergeFrontmatter(content, {}, [key], splitEnvelope(content).body)
}
