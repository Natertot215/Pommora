// The hidden-guest budget: a webpage guest scrolled out of view keeps its state (the site's
// scroll, half-typed input, playing media) by staying mounted invisible — but every retained
// guest is a live renderer process, so the hidden set is capped. Visible guests are never the
// registry's business: they are always live, and a tile leaving the registry on re-entry is what
// keeps the ordering visible > hidden-recent > evicted.

// KNOB — how many hidden guests stay alive beyond the visible ones.
export const WEB_RETAINED_MAX = 5

export interface WebRetention {
  /** A guest just went hidden. May evict the least-recently-hidden retainee over the cap. */
  hide(id: symbol, evict: () => void): void
  /** A guest re-entered visibility (or re-created its guest) — it is no longer retained. */
  show(id: symbol): void
  /** The tile unmounted, or its guest died — the slot frees without an eviction. */
  drop(id: symbol): void
  readonly hiddenCount: number
}

export function createRetention(cap: number): WebRetention {
  // LRU by Map insertion order, the warm-cache idiom: every hide re-inserts, so the first key is
  // always the least-recently-hidden.
  const hidden = new Map<symbol, () => void>()
  return {
    hide(id, evict) {
      hidden.delete(id)
      hidden.set(id, evict)
      if (hidden.size <= cap) return
      const oldest: symbol = hidden.keys().next().value as symbol
      const evictOldest = hidden.get(oldest)
      hidden.delete(oldest)
      evictOldest?.()
    },
    show(id) {
      hidden.delete(id)
    },
    drop(id) {
      hidden.delete(id)
    },
    get hiddenCount() {
      return hidden.size
    },
  }
}

export const webGuestRetention = createRetention(WEB_RETAINED_MAX)
