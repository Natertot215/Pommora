// Every retained hidden guest is a live renderer process, so the hidden set is capped.

import { capSet } from '@pommora/uix/Utilities/capMap'

// KNOB — how many hidden guests stay alive beyond the visible ones.
const WEB_RETAINED_MAX = 5

interface WebRetention {
  hide(id: symbol, evict: () => void): void
  show(id: symbol): void
}

const hidden = new Map<symbol, () => void>()
export const webGuestRetention: WebRetention = {
  hide(id, evict) {
    capSet(hidden, id, evict, WEB_RETAINED_MAX, (evictOldest) => evictOldest())
  },
  show(id) {
    hidden.delete(id)
  },
}
