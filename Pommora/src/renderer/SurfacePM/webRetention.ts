// The hidden-guest budget: a webpage guest scrolled out of view keeps its state by staying
// mounted invisible — but every retained guest is a live renderer process, so the hidden set is
// capped. Visible guests are never the registry's business, always live.

import { capSet } from '@renderer/DesignSystem/Util/capMap'

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
  const hidden = new Map<symbol, () => void>()
  return {
    hide(id, evict) {
      capSet(hidden, id, evict, cap, (evictOldest) => evictOldest())
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
