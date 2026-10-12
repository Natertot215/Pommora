import { dropWarmEntry, dropWarmOwner } from '../../Session/warmCache'

// Module state, never render state: tab ids re-mint at every summon/restore, so the map lives and dies with the open window. A tab's editor state and a Page tab's scroll live in the shared warm store under WINDOW_OWNER; only a Space tab's body scroll is kept here.
export const WINDOW_OWNER = 'window'

const bodyScroll = new Map<string, number>()

export function captureBodyScroll(tabId: string, top: number): void {
  bodyScroll.set(tabId, top)
}

export const readBodyScroll = (tabId: string): number => bodyScroll.get(tabId) ?? 0

export function dropWindowCache(tabId: string): void {
  bodyScroll.delete(tabId)
  dropWarmEntry(WINDOW_OWNER, tabId)
}

export function clearWindowCache(): void {
  bodyScroll.clear()
  dropWarmOwner(WINDOW_OWNER)
}
