import { tileHostKey, type TileHostRef } from '@pommora/core/Tiles/tiles'
import {
  type AssetMap,
  EMPTY_ASSET_MAP,
  type ValueChange,
  type ValuesEpoch,
} from '@pommora/core/Nexus/tree'
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
  /** A view's values snapshot is fetched once per container open, so without this the renamed column reads blank; the key pair rides along to re-key the optimistic overrides. */
  valuesEpoch: ValuesEpoch | null
  bumpValuesEpoch: (oldKey: string, newKey: string) => void
  bumpContainerValues: (changes: ValueChange[]) => void
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

  valuesEpoch: null,
  bumpValuesEpoch: (oldKey, newKey) =>
    set((st) => ({
      valuesEpoch: { n: (st.valuesEpoch?.n ?? 0) + 1, kind: 'rename', oldKey, newKey },
    })),
  bumpContainerValues: (changes) =>
    set((st) => ({
      valuesEpoch: { n: (st.valuesEpoch?.n ?? 0) + 1, kind: 'container', changes },
    })),
  resetCaches: () => set({ linkTitles: {}, assetMap: EMPTY_ASSET_MAP, valuesEpoch: null }),
})
