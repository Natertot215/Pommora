import type { MutateRequest } from '@pommora/core/Nexus/mutateRequest'
import { caught, type PommoraError, type Result, valueOr } from '@pommora/core/Contract/result'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import {
  insertCreatedInTree,
  patchContextGroupsInTree,
  patchNodeInTree,
  relocateNodeInTree,
  removeNodeInTree,
  renameNodeInTree,
  reorderChildrenInTree,
  reorderPagesInTree,
} from '@pommora/core/Nexus/treePatch'
import { stabilize } from '@pommora/core/Nexus/treeStabilize'
import { applyAccent, applySystemAccent } from '@pommora/uix/Theme/ramp'
import { applyPersonalization } from '../Settings/applyPersonalization'
import { reconcileIndexOf } from '../Nexus/treeIndex'
import { clampWidth, INSPECTOR_WIDTH, SIDEBAR_WIDTH } from './layoutSlice'
import { flushAllPageSaves, flushAllSessionSaves } from './saveScheduler'
import type { Slice } from './sessionState'
import { host } from '../Platform/dialer'

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
// Once per nexus, never per reconcile: applyTree runs on every tree change and must not round-trip.
let devicePrefsLoaded = false

export const createNexusSlice: Slice<NexusSlice> = (set, get) => {
  const resetNexusSession = (): void => {
    devicePrefsLoaded = false
    // Every key here is per machine PER NEXUS, so a refused re-fetch must leave nothing of the old one behind for the next setDevicePref to write into this Nexus's own store.
    set({ devicePrefs: {} })
    const s = get()
    s.resetNavigation()
    s.resetWindow()
    s.resetChrome()
    s.resetLayout()
    s.resetCaches()
    s.resetGlance()
  }

  const openVia = async (attempt: () => Promise<Result<boolean>>): Promise<void> => {
    try {
      // Closed before the root can flip even if the adopt is canceled: data safety over persistence.
      set({ navOpen: false, pageWindow: null })
      // Awaited so main binds the OLD root: a late flush would overwrite a same-path file there.
      await flushAllPageSaves()
      await flushAllSessionSaves()
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
      // Only the first load shows it; a refetch keeps the tree mounted so selection survives.
      if (!get().tree) set({ status: 'loading', error: undefined })
      void host()
        .ask('theme:systemAccent')
        .then((r) => {
          systemAccentCache = valueOr(r, null)
        })
      try {
        const res = await host().ask('nexus:state')
        if (!res.ok) {
          set({ status: 'error', error: res.error })
          return
        }
        switch (res.value.status) {
          case 'open':
            await get().applyTree(res.value.tree)
            await Promise.all([
              host()
                .ask('subfield:get')
                .then((r) => {
                  const cfg = valueOr(r, null)
                  if (cfg) set({ subfieldExpanded: cfg.expanded })
                }),
              host()
                .ask('navViewModes:get')
                .then((r) => {
                  const modes = valueOr(r, null)
                  if (modes) set({ navWindowMode: modes.window, navViewMode: modes.view })
                }),
              host()
                .ask('citations:get')
                .then((r) => set({ citationsShown: valueOr(r, {}) })),
              host()
                .ask('linkTitles:get')
                .then((r) => set({ linkTitles: valueOr(r, {}) })),
              host()
                .ask('aliases:get')
                .then((r) => set({ pageAliases: valueOr(r, {}) })),
            ])
            // A refetch must not re-read the sidecar: its debounced write trails the live tab set.
            if (get().activeTabId === '') {
              // Disk leads only here and on the external-edit push, never again mid-session.
              const [read, windows, stored] = await Promise.all([
                host().ask('nav:read'),
                host().ask('windows:load'),
                host().ask('tabs:load'),
              ])
              if (windows.ok) set({ windowsFile: windows.value })
              get().restoreNavigation(valueOr(read, null), valueOr(stored, null))
            }
            break
          case 'empty':
            set({ status: 'empty', tree: null })
            break
        }
      } catch (e) {
        set({ status: 'error', error: caught(e) })
      }
    },

    applyTree: async (incoming) => {
      // A reload-state adopt bypasses openVia's clear, so a foreign tree wipes session state here.
      const prevRoot = get().tree?.nexus.rootPath
      if (prevRoot !== undefined && prevRoot !== incoming.nexus.rootPath) resetNexusSession()
      // IPC strips identity, so without stabilize() every push would re-render every consumer.
      const tree = stabilize(incoming, get().tree)
      // Ahead of the ready paint so the panes land at their stored widths rather than settling after it. A width is seeded only when `panes` holds it; an absent key leaves the slice as it stands.
      if (!devicePrefsLoaded) {
        devicePrefsLoaded = true
        const prefs = await host().ask('devicePrefs:load')
        if (prefs.ok) {
          const panes = prefs.value?.panes
          set({
            devicePrefs: prefs.value ?? {},
            ...(panes?.sidebar !== undefined && {
              sidebarWidth: clampWidth(SIDEBAR_WIDTH, panes.sidebar),
            }),
            ...(panes?.inspector !== undefined && {
              inspectorWidth: clampWidth(INSPECTOR_WIDTH, panes.inspector),
            }),
          })
        }
      }
      set({ status: 'ready', tree })
      const index = reconcileIndexOf(tree)
      get().reconcileNavigation(index)
      get().reconcileWindow(index)
      get().reconcileGlance(index)
      // From the module cache: an awaited round-trip here would gate the whole reconcile.
      if (systemAccentCache === undefined)
        systemAccentCache = valueOr(await host().ask('theme:systemAccent'), null)
      else
        void host()
          .ask('theme:systemAccent')
          .then((r) => {
            systemAccentCache = valueOr(r, null)
          })
      const systemColor = systemAccentCache
      applyAccent(tree.accent, systemColor)
      applySystemAccent(systemColor)
      set({ personalization: tree.personalization, commands: tree.commands })
      applyPersonalization(tree.personalization)
    },

    choose: () => openVia(() => host().ask('nexus:choose')),
    openDropped: (file) => openVia(() => host().openDropped(file)),

    mutate: async (req, onCreated, onAdopted, onTrashed) => {
      const res = await host().ask('mutate', req)
      if (!res.ok) {
        await host().ask('error:show', res.error.message)
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
            // A same-parent moveSet is a pure reorder; the patch keeps the drop from snapping back.
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
            patched = reorderChildrenInTree(cur, '', req.order) ?? cur
            break
          case 'setIcon':
            patched = patchNodeInTree(cur, req.path, { icon: req.icon })
            break
          case 'setDisclosureLock':
            patched = patchNodeInTree(cur, req.path, { disclosureLocked: req.locked })
            break
          case 'setActiveView':
            patched = patchNodeInTree(cur, req.path, { activeView: req.viewId })
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
      // Without the optimistic create the rename input mounts only after the full re-walk.
      let createdShown = false
      if (cur && res.value.created && onCreated) {
        const optimistic = insertCreatedInTree(cur, req, res.value.created)
        if (optimistic) {
          // The sync body runs first, so its state lands in the commit that mounts the newborn.
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
