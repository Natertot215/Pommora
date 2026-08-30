import { blockHostKey, type BlockHostRef } from '@shared/blocks'
import type { Result } from '@shared/result'
import { type AssetMap, EMPTY_ASSET_MAP } from '@shared/types'
import { stabilize } from '@shared/treeStabilize'
import type { Slice } from './SessionState'

export interface CacheSlice {
  linkTitles: Record<string, string>
  resolveLinkTitle: (url: string) => void
  activeViews: Record<string, string>
  setActiveView: (containerId: string, viewId: string) => Promise<void>
  /** The aliases each page has been given, keyed PageID so they survive a rename. Its own slice
   *  rather than a tree-keyed derivation: authoring one and forgetting one both push no tree, and
   *  the watcher suppresses the app's own writes, so a tree-keyed cache would go on offering an
   *  alias that had just been forgotten. */
  pageAliases: Record<string, string[]>
  rememberAlias: (pageId: string, alias: string) => void
  forgetAlias: (pageId: string, alias: string) => void
  /** Every block host's lock, keyed by host. Seeded from the doc the host loads — the one source. */
  hostLocks: Record<string, boolean>
  seedHostLock: (host: BlockHostRef, locked: boolean) => void
  setHostLocked: (host: BlockHostRef, v: boolean) => Promise<void>
  assetMap: AssetMap
  applyAssetMap: (map: AssetMap) => void
  setAssetDirectory: (dir: string) => Promise<void>
  /** The whole excluded-folder list, written at once. Returns the channel's Result so the pane can
   *  surface a refusal; the stored list arrives back through the tree the write patches. */
  setExclusions: (folders: string[]) => Promise<Result<string[]>>
  /** The maps keyed by ids the next nexus doesn't share. The adopt path reaches here without a
   *  following load(), so anything left behind would be written back under foreign keys. */
  resetCaches: () => void
}

const inFlightTitles = new Set<string>()
const failedTitles = new Set<string>()

export const createCacheSlice: Slice<CacheSlice> = (set, get) => {
  // One writer for both alias gestures. The slice mirrors exactly what a reload gives back, so a
  // page left with nothing loses its key rather than holding an empty list — the same rule the
  // scope's own write applies on disk.
  const putAliases = (pageId: string, next: string[]): void => {
    set((s) => {
      const map = { ...s.pageAliases }
      if (next.length) map[pageId] = next
      else delete map[pageId]
      return { pageAliases: map }
    })
    void window.nexus.aliases.set(pageId, next)
  }

  return {
    linkTitles: {},
    resolveLinkTitle: (url) => {
      if (inFlightTitles.has(url) || failedTitles.has(url) || get().linkTitles[url]) return
      inFlightTitles.add(url)
      window.nexus.linkTitles
        .fetch(url)
        .then((res) => {
          // A late fetch resolving after a nexus switch merges into the new map harmlessly: a URL's
          // <title> is identical in any nexus, and main won't persist it cross-nexus (cacheRoot === root).
          const title = res.ok ? res.value.title : null
          if (title) set((s) => ({ linkTitles: { ...s.linkTitles, [url]: title } }))
          else failedTitles.add(url)
        })
        .catch(() => failedTitles.add(url))
        .finally(() => inFlightTitles.delete(url))
    },

    activeViews: {},
    setActiveView: async (containerId, viewId) => {
      await window.nexus.activeViews.set(containerId, viewId)
      set((s) => ({ activeViews: { ...s.activeViews, [containerId]: viewId } }))
    },

    pageAliases: {},
    rememberAlias: (pageId, alias) => {
      const words = alias.trim()
      if (!words) return
      const worn = get().pageAliases[pageId] ?? []
      // Most recently given first, and never twice: giving a page an alias it already wears
      // promotes that one rather than adding a second copy of it.
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
    seedHostLock: (host, locked) =>
      set((s) => {
        const key = blockHostKey(host)
        return s.hostLocks[key] === locked ? {} : { hostLocks: { ...s.hostLocks, [key]: locked } }
      }),
    setHostLocked: async (host, v) => {
      set((s) => ({ hostLocks: { ...s.hostLocks, [blockHostKey(host)]: v } }))
      await window.nexus.blocks.save(host, { locked: v })
    },

    assetMap: EMPTY_ASSET_MAP,
    // Stabilize buys the echo case: an unchanged push returns the held map and zustand no-ops.
    // A real add or unlink is a new object and re-renders every mounted banner, which is what a
    // phantom becoming real is for.
    applyAssetMap: (map) => {
      set({ assetMap: stabilize(map, get().assetMap) })
    },
    // The tree leaf is what the field reads, and main patches it on the write's own confirm —
    // so a refusal needs no local rollback: nothing moved.
    setAssetDirectory: async (dir) => {
      await window.nexus.setAssetDir(dir)
    },
    setExclusions: (folders) => window.nexus.setExclusions(folders),

    resetCaches: () =>
      set({ pageAliases: {}, activeViews: {}, linkTitles: {}, assetMap: EMPTY_ASSET_MAP }),
  }
}
