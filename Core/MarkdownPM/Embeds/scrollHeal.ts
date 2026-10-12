import { emitter } from '@pommora/uix/Utilities/subscribable'

// The browser zeroes every scroller inside a disconnected subtree, and the outer editor detaches tile DOM mid-sync whenever it re-slots a rebuild's range — silently, with no scroll event or unmount.
const heals = emitter<HTMLElement>()

export const registerScrollHeal = heals.subscribe

/** `root` is the re-slotting editor's DOM: only the editors nested in it can have been detached. */
export const healTileScrolls = (root: HTMLElement): void => heals.emit(root)
