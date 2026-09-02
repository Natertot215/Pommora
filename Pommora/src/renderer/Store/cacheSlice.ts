import { blockHostKey, type BlockHostRef } from '@shared/blocks'
import type { Result } from '@shared/result'
import { type AssetMap, EMPTY_ASSET_MAP } from '@shared/types'
import { stabilize } from '@shared/treeStabilize'
import type { Slice } from './sessionState'

export interface CacheSlice {
  linkTitles: Record<string, string>
  resolveLinkTitle: (url: string) => void
  activeViews: Record<string, string>
  setActiveView: (containerId: string, viewId: string) => Promise<void>
  /** The aliases each page has been given, keyed by page id so they survive a rename. Its own slice
   *  rather than a tree-keyed derivation, since authoring or forgetting one pushes no tree. */
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
  /** Returns the channel's Result so the pane can surface a refusal; the stored list arrives back
   *  through the tree the write patches. */
  setExclusions: (folders: string[]) => Promise<Result<string[]>>
  /** The maps keyed by ids the next nexus doesn't share — the adopt path reaches here without a
   *  following load(), so anything left behind would write back under foreign keys. */
  resetCaches: () => void
}

const inFlightTitles = new Set<string>()
const failedTitles = new Set<string>()

export const createCacheSlice: Slice<CacheSlice> = (set, get) => {
  // One writer for both alias gestures — a page left with nothing loses its key rather than
  // holding an empty list, the same rule the write applies on disk.
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
          // A late fetch resolving after a nexus switch merges harmlessly: a URL's <title> is
          // identical in any nexus, and main won't persist it cross-nexus.
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
      // Most recently given first, and never twice: an alias already given promotes rather than
      // duplicates.
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
    // Stabilize buys the echo case: an unchanged push returns the held map and zustand no-ops; a
    // real add or unlink is a new object and re-renders every mounted banner.
    applyAssetMap: (map) => {
      set({ assetMap: stabilize(map, get().assetMap) })
    },
    // The tree leaf is what the field reads, patched on the write's own confirm — a refusal
    // needs no local rollback.
    setAssetDirectory: async (dir) => {
      await window.nexus.setAssetDir(dir)
    },
    setExclusions: (folders) => window.nexus.setExclusions(folders),

    resetCaches: () =>
      set({ pageAliases: {}, activeViews: {}, linkTitles: {}, assetMap: EMPTY_ASSET_MAP }),
  }
}
