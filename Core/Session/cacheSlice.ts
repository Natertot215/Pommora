import { tileHostKey, type TileHostRef } from '@pommora/core/Tiles/tiles'
import { type AssetMap, EMPTY_ASSET_MAP } from '@pommora/core/Nexus/tree'
import { stabilize } from '@pommora/core/Nexus/treeStabilize'
import type { Slice } from './sessionState'
import { host } from '../Platform/dialer'

export interface CacheSlice {
  linkTitles: Record<string, string>
  resolveLinkTitle: (url: string) => void
  hostLocks: Record<string, boolean>
  setHostLock: (host: TileHostRef, locked: boolean) => void
  assetMap: AssetMap
  applyAssetMap: (map: AssetMap) => void
  resetCaches: () => void
}

const inFlightTitles = new Set<string>()
const failedTitles = new Set<string>()

export const createCacheSlice: Slice<CacheSlice> = (set, get) => ({
  linkTitles: {},
  resolveLinkTitle: (url) => {
    if (inFlightTitles.has(url) || failedTitles.has(url) || get().linkTitles[url]) return
    inFlightTitles.add(url)
    host()
      .ask('linkTitles:fetch', url)
      .then((res) => {
        // A late fetch resolving after a nexus switch merges harmlessly: a URL's <title> is identical in any nexus, and main won't persist it cross-nexus.
        const title = res.ok ? res.value.title : null
        if (title) set((s) => ({ linkTitles: { ...s.linkTitles, [url]: title } }))
        else failedTitles.add(url)
      })
      .catch(() => failedTitles.add(url))
      .finally(() => inFlightTitles.delete(url))
  },

  hostLocks: {},
  setHostLock: (host, locked) =>
    set((s) => {
      const key = tileHostKey(host)
      return s.hostLocks[key] === locked ? {} : { hostLocks: { ...s.hostLocks, [key]: locked } }
    }),

  assetMap: EMPTY_ASSET_MAP,
  // Stabilize buys the echo case: an unchanged push returns the held map and zustand no-ops; a real add or unlink is a new object and re-renders every mounted banner.
  applyAssetMap: (map) => {
    set({ assetMap: stabilize(map, get().assetMap) })
  },
  resetCaches: () => set({ linkTitles: {}, assetMap: EMPTY_ASSET_MAP }),
})
