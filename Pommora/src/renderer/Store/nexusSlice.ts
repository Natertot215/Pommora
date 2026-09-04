import type { MutateRequest } from '@shared/mutate'
import { caught, type PommoraError, type Result } from '@shared/result'
import type { NexusTree } from '@shared/types'
import {
  insertCreatedInTree,
  patchContextGroupsInTree,
  patchNodeInTree,
  relocateNodeInTree,
  removeNodeInTree,
  renameNodeInTree,
  reorderChildrenInTree,
  reorderPagesInTree,
  reorderTopInTree,
} from '@shared/treePatch'
import { stabilize } from '@shared/treeStabilize'
import { applyAccent, applySystemAccent } from '@renderer/DesignSystem/Tokens/accent'
import { applyPersonalization } from '@renderer/DesignSystem/Tokens/personalization'
import { reconcileIndexOf } from '../treeIndex'
import { flushAllPageSaves } from '../Interface/pageFlush'
import type { Slice } from './sessionState'

export interface NexusSlice {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'empty'
  tree: NexusTree | null
  error?: PommoraError
  load: () => Promise<void>
  applyTree: (tree: NexusTree) => Promise<void>
  choose: () => Promise<void>
  openDropped: (file: File) => Promise<void>
  mutate: (
    req: MutateRequest,
    onCreated?: (created: { id: string; path: string }) => void | Promise<void>,
    onAdopted?: (adopted: string | undefined) => void,
    onTrashed?: (trashed: { bundlePath: string } | undefined) => void,
  ) => Promise<boolean>
}

let systemAccentCache: string | null | undefined
// Read once per nexus, not per reconcile — applyTree runs on every tree change and must never
// carry a round trip; nexus.db travels inside the Nexus, so a different one reads again.
let devicePrefsLoaded = false

export const createNexusSlice: Slice<NexusSlice> = (set, get) => {
  const resetNexusSession = (): void => {
    devicePrefsLoaded = false
    const s = get()
    s.resetNavigation()
    s.resetPreview()
    s.resetChrome()
    s.resetCaches()
  }

  const openVia = async (attempt: () => Promise<Result<boolean>>): Promise<void> => {
    try {
      // Close before the root can flip, even if the adopt is then canceled — data safety
      // beats window persistence.
      set({ navOpen: false, preview: null })
      // Awaited so main binds the old root: a debounce or an embed's exit flush landing after
      // the flip would otherwise bind the new nexus and overwrite a same-path file there.
      await flushAllPageSaves()
      const opened = await attempt()
      if (!opened.ok) {
        set({ status: 'error', error: opened.error })
        return
      }
      if (opened.value) {
        resetNexusSession()
        await get().load()
      }
    } catch (e) {
      set({ status: 'error', error: caught(e) })
    }
  }

  return {
    status: 'idle',
    tree: null,
    error: undefined,

    load: async () => {
      // Only the first load shows the full-screen loading state — a mutation refetch keeps the
      // tree mounted so the sidebar's expand/collapse + selection survive.
      if (!get().tree) set({ status: 'loading', error: undefined })
      void window.nexus.systemAccent().then((c) => {
        systemAccentCache = c
      })
      try {
        const res = await window.nexus.state()
        switch (res.status) {
          case 'open':
            await get().applyTree(res.tree)
            // Independent fetches, one round of latency; the raw database reads keep a catch,
            // since the envelope channels structurally cannot reject.
            await Promise.all([
              window.nexus.subfield.get().then((cfg) => {
                if (cfg) set({ subfieldExpanded: cfg.expanded, subfieldOrder: cfg.order })
              }),
              window.nexus.navViewModes.get().then((modes) => {
                if (modes) set({ navWindowMode: modes.window, navViewMode: modes.view })
              }),
              window.nexus.citations
                .get()
                .then((all) => set({ citationsShown: all }))
                .catch(() => undefined), // every page falls back to the nexus-wide default
              window.nexus.linkTitles
                .get()
                .then((titles) => set({ linkTitles: titles }))
                .catch(() => undefined), // url cells fall back to the domain
              window.nexus.activeViews
                .get()
                .then((views) => set({ activeViews: views }))
                .catch(() => undefined), // surfaces fall back to the first saved view
              window.nexus.aliases
                .get()
                .then((aliases) => set({ pageAliases: aliases }))
                .catch(() => undefined), // the picker offers titles only
            ])
            // A mutation refetch must NOT re-read the sidecar — its debounced write trails the
            // in-memory tab set, so a re-read would roll the tabs backward.
            if (get().activeTabId === '') {
              // Disk leads only here and on the external-edit push; navigation is never re-read
              // mid-session, so a just-made change can't roll back.
              const [read, windows, stored] = await Promise.all([
                window.nexus.nav.read().catch(() => null),
                window.nexus.windows?.load().catch(() => null),
                window.nexus.tabs.load().catch(() => null),
              ])
              if (windows?.ok) set({ previewsFile: windows.value })
              get().restoreNavigation(
                read?.ok ? read.value : null,
                stored?.ok ? stored.value : null,
              )
            }
            break
          case 'empty':
            set({ status: 'empty', tree: null })
            break
          case 'error':
            set({ status: 'error', error: res.error })
            break
        }
      } catch (e) {
        set({ status: 'error', error: caught(e) })
      }
    },

    applyTree: async (incoming) => {
      // A tree from a different nexus (a reload-state adopt in main, bypassing openVia's clear)
      // must wipe the per-nexus session state before reconciling.
      const prevRoot = get().tree?.nexus.rootPath
      if (prevRoot !== undefined && prevRoot !== incoming.nexus.rootPath) resetNexusSession()
      // IPC strips identity, so without stabilize() every push would re-render every consumer.
      const tree = stabilize(incoming, get().tree)
      set({ status: 'ready', tree })
      const index = reconcileIndexOf(tree)
      get().reconcileNavigation(index)
      get().reconcilePreview(index)
      // Read from the module cache, not an awaited IPC call — a round-trip here would gate the
      // whole reconcile behind it. Each pass refreshes the cache fire-and-forget.
      if (systemAccentCache === undefined) systemAccentCache = await window.nexus.systemAccent()
      else
        void window.nexus.systemAccent().then((c) => {
          systemAccentCache = c
        })
      const systemColor = systemAccentCache
      applyAccent(tree.accent, systemColor)
      applySystemAccent(systemColor)
      set({ personalization: tree.personalization, commands: tree.commands })
      applyPersonalization(tree.personalization)
      if (!devicePrefsLoaded) {
        devicePrefsLoaded = true
        const prefs = await window.nexus.devicePrefs.load()
        if (prefs.ok) set({ devicePrefs: prefs.value ?? {} })
      }
    },

    choose: () => openVia(() => window.nexus.choose()),
    openDropped: (file) => openVia(() => window.nexus.openDropped(file)),

    mutate: async (req, onCreated, onAdopted, onTrashed) => {
      const res = await window.nexus.mutate(req)
      if (!res.ok) {
        await window.nexus.showError(res.error.message)
        return false
      }
      // Instant optimistic patch; main's confirming push lands a beat later with no flicker.
      const cur = get().tree
      let patched: NexusTree | null = null
      if (cur) {
        get().patchPagesFor(req)
        switch (req.op) {
          case 'movePage': {
            const moved = relocateNodeInTree(cur, req.path, req.newParentPath)
            patched = req.order
              ? (reorderPagesInTree(moved ?? cur, req.newParentPath, req.order) ?? moved)
              : moved
            break
          }
          case 'moveSet': {
            // A same-parent moveSet is a pure reorder — the order patch keeps the drop from
            // snapping back until the confirm walk lands.
            const moved = relocateNodeInTree(cur, req.path, req.newParentPath)
            patched = reorderChildrenInTree(moved ?? cur, req.newParentPath, req.order) ?? moved
            break
          }
          case 'rename':
            // The landed name, never the ask — a from-create rename may have disambiguated.
            patched = renameNodeInTree(cur, req.path, res.value.renamed?.name ?? req.newName)
            break
          case 'delete':
            patched = removeNodeInTree(cur, req.path)
            break
          case 'reorderChildren':
            patched = reorderChildrenInTree(cur, req.parentPath, req.order)
            break
          case 'reorderTop':
            patched = reorderTopInTree(cur, req.key, req.order)
            break
          case 'setIcon':
            patched = patchNodeInTree(cur, req.path, { icon: req.icon })
            break
          case 'setDisclosureLock':
            patched = patchNodeInTree(cur, req.path, { disclosureLocked: req.locked })
            break
          case 'setHeadingIconHidden':
            patched =
              req.kind === 'homepage'
                ? { ...cur, homepage: { ...cur.homepage, headingIconHidden: req.hidden } }
                : req.kind === 'navview'
                  ? null
                  : patchNodeInTree(cur, req.path, { headingIconHidden: req.hidden })
            break
          case 'renameContext':
          case 'renameSpace':
          case 'setSpaceColor':
          case 'reorderContexts':
          case 'reorderSpaces':
            patched = patchContextGroupsInTree(cur, req)
            break
        }
        if (patched) await get().applyTree(patched)
      }
      // Without this optimistic create, the rename input only mounts after the full re-walk,
      // eating the user's first keystrokes on a large vault.
      let createdShown = false
      if (cur && res.value.created && onCreated) {
        const optimistic = insertCreatedInTree(cur, req, res.value.created)
        if (optimistic) {
          // The callback's sync body runs before the tree applies, so its state (order splices,
          // naming state, a held ghost seat) lands in the same commit that mounts the newborn.
          const settled = onCreated(res.value.created)
          await get().applyTree(optimistic)
          await settled
          createdShown = true
        }
      }
      if (!createdShown && res.value.created && onCreated) await onCreated(res.value.created)
      onAdopted?.(res.value.adopted)
      onTrashed?.(res.value.trashed)
      return true
    },
  }
}
