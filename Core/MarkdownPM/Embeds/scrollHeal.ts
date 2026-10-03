import { emitter } from '@pommora/uix/Utilities/subscribable'

// The browser zeroes every scroller inside a disconnected subtree, and the outer editor detaches tile DOM mid-sync whenever it re-slots a rebuild's range — silently, with no scroll event or unmount.
const heals = emitter()

export const registerScrollHeal = heals.subscribe

export const healTileScrolls = (): void => heals.emit()
