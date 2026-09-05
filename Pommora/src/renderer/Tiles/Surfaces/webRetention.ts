// Every retained hidden guest is a live renderer process, so the hidden set is capped.

import { capSet } from '@renderer/DesignSystem/Util/capMap'

// KNOB — how many hidden guests stay alive beyond the visible ones.
export const WEB_RETAINED_MAX = 5

export interface WebRetention {
  hide(id: symbol, evict: () => void): void
  show(id: symbol): void
  drop(id: symbol): void
  readonly hiddenCount: number
}

const hidden = new Map<symbol, () => void>()
export const webGuestRetention: WebRetention = {
  hide(id, evict) {
    capSet(hidden, id, evict, WEB_RETAINED_MAX, (evictOldest) => evictOldest())
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
