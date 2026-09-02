import type { WarmSeam } from '@renderer/MarkdownPM/warmSeam'
import { readPageDetail } from '../Store/tabState'

// The tile counterpart of the tab and preview warm caches: the outer editor tears a tile's DOM
// down whenever it leaves the viewport, and the nested editor re-creates from scratch — this
// holds its doc, selection, undo history, and scroll for the session, keyed by the full host
// chain so the same page embedded under two hosts keeps two positions. In-memory only.
const tileCache = new Map<string, { editorState: unknown; scrollTop: number }>()

export function tileWarmSeam(chain: readonly string[]): WarmSeam {
  const key = chain.join('\n')
  const path = chain[chain.length - 1]
  return {
    restore: () => {
      const entry = tileCache.get(key)
      if (!entry) return undefined
      // A page edited elsewhere since the capture invalidates the whole entry — selection and
      // history are positions into a doc that no longer exists; mount cold from the fresh slot.
      const fresh = readPageDetail(path)?.body
      const doc = (entry.editorState as { doc?: unknown }).doc
      if (fresh !== undefined && fresh !== doc) {
        tileCache.delete(key)
        return undefined
      }
      return entry
    },
    capture: (state) => tileCache.set(key, state),
  }
}

// The browser zeroes every scroller inside a disconnected subtree, and the outer editor detaches
// tile DOM mid-sync whenever it re-slots a rebuild's range — silently, with no scroll event or
// unmount. So warm editors register a self-check here, and the host editor runs the set from its
// measure phase after any update on a tile-bearing doc.
const heals = new Set<() => void>()

export function registerScrollHeal(fn: () => void): () => void {
  heals.add(fn)
  return () => heals.delete(fn)
}

export function healTileScrolls(): void {
  for (const fn of heals) fn()
}
