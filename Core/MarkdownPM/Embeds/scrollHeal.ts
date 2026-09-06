// The browser zeroes every scroller inside a disconnected subtree, and the outer editor detaches tile DOM
// mid-sync whenever it re-slots a rebuild's range — silently, with no scroll event or unmount.
const heals = new Set<() => void>()

export function registerScrollHeal(fn: () => void): () => void {
  heals.add(fn)
  return () => heals.delete(fn)
}

export function healTileScrolls(): void {
  for (const fn of heals) fn()
}
