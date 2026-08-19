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
  /** The tile unmounted entirely. */
  drop(id: symbol): void
  readonly hiddenCount: number
}

interface Retained {
  at: number
  evict: () => void
}

export function createRetention(cap: number): WebRetention {
  const hidden = new Map<symbol, Retained>()
  let tick = 0
  return {
    hide(id, evict) {
      hidden.set(id, { at: ++tick, evict })
      if (hidden.size <= cap) return
      let oldest: [symbol, Retained] | null = null
      for (const e of hidden) if (oldest === null || e[1].at < oldest[1].at) oldest = e
      if (oldest === null) return
      hidden.delete(oldest[0])
      oldest[1].evict()
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
