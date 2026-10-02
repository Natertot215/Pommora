// A whole tree arrives over IPC without identity, so without this every open and refetch would re-render every consumer. `stabilize` recycles the prior value's subobjects wherever the new content is deep-equal, and returns the prior value itself when nothing differs, which is also how the host tells a file that changed nothing from one that did. It works in one pass and reuses by position inside a list that has no keys, where `treeDelta`'s `diff` compares by key, so each keeps its own walk.

import { isPlainObject } from '../Contract/validators'

export function stabilize<T>(next: T, prev: unknown): T {
  if (Object.is(next, prev)) return next
  if (Array.isArray(next) && Array.isArray(prev)) {
    let same = next.length === prev.length
    const out = next.map((n, i) => {
      const s = stabilize(n, prev[i])
      if (!Object.is(s, prev[i])) same = false
      return s
    })
    return same ? (prev as T) : (out as T)
  }
  if (isPlainObject(next) && isPlainObject(prev)) {
    const keys = Object.keys(next)
    let same = keys.length === Object.keys(prev).length
    const out: Record<string, unknown> = {}
    for (const k of keys) {
      const s = stabilize(next[k], prev[k])
      out[k] = s
      if (!Object.is(s, prev[k])) same = false
    }
    return same ? (prev as T) : (out as T)
  }
  return next
}
