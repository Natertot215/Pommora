import type { WarmSeam } from '@renderer/MarkdownPM/warmSeam'
import { fenceWarm, readPageDetail } from '@renderer/Store/tabState'

// The outer editor tears a tile's DOM down whenever it leaves the viewport; this holds the nested
// editor's doc, selection, history, and scroll, keyed by the full host chain.
const tileCache = new Map<string, { editorState: unknown; scrollTop: number }>()

export function tileWarmSeam(chain: readonly string[]): WarmSeam {
  const key = chain.join('\n')
  const path = chain[chain.length - 1]
  return {
    restore: () => {
      // A page edited elsewhere since the capture invalidates the whole entry — selection and
      // history are positions into a doc that no longer exists; mount cold from the fresh slot.
      const kept = fenceWarm(tileCache.get(key), readPageDetail(path)?.body)
      if (!kept) tileCache.delete(key)
      return kept
    },
    capture: (state) => tileCache.set(key, state),
  }
}

// The browser zeroes every scroller inside a disconnected subtree, and the outer editor detaches
// tile DOM mid-sync whenever it re-slots a rebuild's range — silently, with no scroll event or
// unmount.
const heals = new Set<() => void>()

export function registerScrollHeal(fn: () => void): () => void {
  heals.add(fn)
  return () => heals.delete(fn)
}

export function healTileScrolls(): void {
  for (const fn of heals) fn()
}
