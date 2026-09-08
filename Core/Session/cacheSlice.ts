import { tileHostKey, type TileHostRef } from '@pommora/core/Tiles/tiles'
import { type AssetMap, EMPTY_ASSET_MAP } from '@pommora/core/Nexus/tree'
import { stabilize } from '@pommora/core/Nexus/treeStabilize'
import type { Slice } from './sessionState'
import { host } from '../Platform/dialer'

export interface CacheSlice {
  linkTitles: Record<string, string>
  resolveLinkTitle: (url: string) => void
  pageAliases: Record<string, string[]>
  rememberAlias: (pageId: string, alias: string) => void
  forgetAlias: (pageId: string, alias: string) => void
  hostLocks: Record<string, boolean>
  setHostLock: (host: TileHostRef, locked: boolean) => void
  assetMap: AssetMap
  applyAssetMap: (map: AssetMap) => void
  resetCaches: () => void
}

const inFlightTitles = new Set<string>()
const failedTitles = new Set<string>()

export const createCacheSlice: Slice<CacheSlice> = (set, get) => {
  // One writer for both alias gestures — a page left with nothing loses its key rather than holding an empty list, the same rule the write applies on disk.
  const putAliases = (pageId: string, next: string[]): void => {
    set((s) => {
      const map = { ...s.pageAliases }
      if (next.length) map[pageId] = next
      else delete map[pageId]
      return { pageAliases: map }
    })
    void host().ask('aliases:set', pageId, next)
  }

  return {
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

    pageAliases: {},
    rememberAlias: (pageId, alias) => {
      const words = alias.trim()
      if (!words) return
      const worn = get().pageAliases[pageId] ?? []
      // Most recently given first, and never twice: an alias already given promotes rather than duplicates.
      if (worn[0] === words) return
      putAliases(pageId, [words, ...worn.filter((a) => a !== words)])
    },
    forgetAlias: (pageId, alias) => {
      const worn = get().pageAliases[pageId]
      if (!worn?.includes(alias)) return
      putAliases(
        pageId,
        worn.filter((a) => a !== alias),
      )
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
    resetCaches: () => set({ pageAliases: {}, linkTitles: {}, assetMap: EMPTY_ASSET_MAP }),
  }
}
