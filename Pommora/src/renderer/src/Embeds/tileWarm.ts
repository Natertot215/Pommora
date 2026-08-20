import type { WarmSeam } from '@renderer/MarkdownPM/warmSeam'
import { readPageDetail } from '../Tabs/warmCache'

// The tile counterpart of the tab and preview warm caches: the outer editor tears a tile's DOM
// down whenever it leaves the viewport or a rebuild drops the widget, and the nested editor
// re-creates from scratch — this holds its doc, selection, undo history, and scroll for the
// session, keyed by the full host chain so the same page embedded under two hosts keeps two
// positions. In-memory only: a fresh session mounts cold.
const tileWarm = new Map<string, { editorState: unknown; scrollTop: number }>()

export function tileWarmSeam(chain: readonly string[]): WarmSeam {
  const key = chain.join('\n')
  const path = chain[chain.length - 1]
  return {
    restore: () => {
      const entry = tileWarm.get(key)
      if (!entry) return undefined
      // A page edited elsewhere since the capture invalidates the whole entry — selection and
      // history are positions into a doc that no longer exists; mount cold from the fresh slot.
      const fresh = readPageDetail(path)?.body
      const doc = (entry.editorState as { doc?: unknown }).doc
      if (fresh !== undefined && fresh !== doc) {
        tileWarm.delete(key)
        return undefined
      }
      return entry
    },
    capture: (state) => tileWarm.set(key, state),
  }
}

// The browser zeroes every scroller inside a disconnected subtree, and the outer editor detaches
// tile DOM mid-sync whenever it re-slots a rebuild's range — silently: no scroll event, no
// unmount, and a full-reuse re-slot skips the widget callbacks entirely. So warm editors register
// a self-check here, and the host editor runs the set from its measure phase after any update on
// a tile-bearing doc — the one signal that always accompanies a re-slot.
const heals = new Set<() => void>()

export function registerScrollHeal(fn: () => void): () => void {
  heals.add(fn)
  return () => heals.delete(fn)
}

export function healTileScrolls(): void {
  for (const fn of heals) fn()
}
