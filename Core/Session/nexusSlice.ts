import {
  clearNotification,
  notifyReport,
  reportRefusal,
  unrestoredLine,
} from '@pommora/core/Interface/Notifications/notifications'
import type { MutateOutcome, MutateRequest } from '@pommora/core/Nexus/mutateRequest'
import { caught, type PommoraError, type Result, valueOr } from '@pommora/core/Contract/result'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import type { SyncStatus } from '@pommora/core/Sync/Contract/wire'
import {
  insertCreatedInTree,
  orderInTree,
  patchContextGroupsInTree,
  patchNodeInTree,
  removeNodeInTree,
  renameNodeInTree,
} from '@pommora/core/Nexus/treePatch'
import { stabilize } from '@pommora/core/Nexus/treeStabilize'
import { applyPersonalization } from '../Settings/applyPersonalization'
import { reconcileIndexOf } from '../Nexus/treeIndex'
import { flushAllTileDocs, tileBodyWriter } from '../Tiles/tileDocStore'
import {
  cancelAllSaves,
  flushAllPageSaves,
  flushAllSessionSaves,
  flushPageSave,
  holdSaves,
  releaseSaves,
} from './saveScheduler'
import type { Slice } from './sessionState'
import { resetUndo } from './undo'
import { dialer } from '../Platform/dialer'

export interface NexusSlice {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'empty'
  tree: NexusTree | null
  error?: PommoraError
  syncStatus: SyncStatus | null
  headings: Record<string, string[]>
  /** Bumped by every delete, restore, and empty that lands, so an open Trash pane lists again. */
  trashRevision: number
  bumpTrashRevision: () => void
  /** Opens the bound Nexus into the window: its device preferences, its tree, then what the window restores from it. */
  load: () => Promise<void>
  /** Re-reads the bound Nexus's tree, for a root that moved under a Nexus the window already holds. */
  refetch: () => Promise<void>
  applySyncStatus: (status: SyncStatus) => void
  applyTree: (tree: NexusTree) => void
  loadHeadings: (paths?: string[]) => Promise<void>
  choose: () => Promise<void>
  openPath: (path: string) => Promise<void>
  openDropped: (file: File) => Promise<void>
  mutate: (
    req: MutateRequest,
    onCreated?: (created: { id: string; path: string }) => void | Promise<void>,
  ) => Promise<MutateOutcome | null>
}

/** Every save the window still owes, landed: awaited while the OLD root is bound before a switch, and before the host closes its stores on quit. */
export async function flushAllSaves(): Promise<void> {
  await Promise.all([flushAllPageSaves(), flushAllTileDocs(), flushAllSessionSaves()])
}

export const createNexusSlice: Slice<NexusSlice> = (set, get) => {
  const resetNexusSession = (): void => {
    cancelAllSaves()
    set({ headings: {} })
    // Every key here is per machine PER NEXUS, so nothing of the old one stays on screen while this one's is read, or after a refused read.
    set({ devicePrefs: {}, devicePrefsLive: false })
    const s = get()
    s.resetNavigation()
    s.resetWindow()
    s.resetChrome()
    s.resetLayout()
    s.resetCaches()
    s.resetGlance()
    s.resetMatrix()
    s.resetEdit()
    s.resetViewSearch()
    resetUndo()
    clearNotification()
  }

  const openVia = async (attempt: () => Promise<Result<boolean>>): Promise<void> => {
    try {
      // Closed before the root can flip even if the adopt is canceled: data safety over persistence.
      get().closeWindows()
      get().resetGlance()
      await flushAllSaves()
      holdSaves()
      const opened = await attempt()
      if (!opened.ok) {
        set({ status: 'error', error: opened.error, tree: null })
        return
      }
      if (opened.value) {
        resetNexusSession()
        await get().load()
        // The new tree is in: the Matrix may read the new root against it.
        get().unloadMatrix()
      }
    } catch (e) {
      set({ status: 'error', error: caught(e) })
    } finally {
      releaseSaves()
    }
  }

  /** Whether the host holds an open Nexus, whose tree is then applied. */
  const readTree = async (): Promise<boolean> => {
    const res = await dialer().ask('nexus:state')
    if (!res.ok) {
      resetNexusSession()
      set({ status: 'error', error: res.error, tree: null })
      return false
    }
    if (res.value.status === 'empty') {
      set({ status: 'empty', tree: null })
      return false
    }
    get().applyTree(res.value.tree)
    return true
  }

  return {
    status: 'idle',
    tree: null,
    error: undefined,
    syncStatus: null,
    headings: {},
    trashRevision: 0,
    bumpTrashRevision: () => set((s) => ({ trashRevision: s.trashRevision + 1 })),

    applySyncStatus: (status) => set({ syncStatus: status }),

    loadHeadings: async (paths) => {
      const res = await dialer().ask('index:headings', paths)
      if (!res.ok) return
      set((s) => ({ headings: paths ? { ...s.headings, ...res.value } : res.value }))
    },

    load: async () => {
      // Only the first open shows it; a switch keeps the old Nexus drawn until the new tree applies.
      if (!get().tree) set({ status: 'loading', error: undefined })
      try {
        // Ahead of the tree's ask: the panes land at their stored widths in the ready paint, and no push can land between the tree's reply and its apply.
        const prefs = await dialer().ask('devicePrefs:load')
        if (prefs.ok) {
          const { sidebar, sidePane } = prefs.value.panes ?? {}
          set({
            devicePrefsLive: true,
            devicePrefs: prefs.value,
            ...(sidebar !== undefined && { sidebarWidth: sidebar }),
            ...(sidePane !== undefined && { sidePaneWidth: sidePane }),
          })
        }
        if (!(await readTree())) return
        void get().loadHeadings()
        const [, , read, windows, stored] = await Promise.all([
          dialer()
            .ask('citations:get')
            .then((r) => set({ citationsShown: valueOr(r, {}) })),
          dialer()
            .ask('linkTitles:get')
            .then((r) => set({ linkTitles: valueOr(r, {}) })),
          dialer().ask('nav:read'),
          dialer().ask('windows:load'),
          dialer().ask('tabs:load'),
        ])
        if (windows.ok) set({ windowsFile: windows.value })
        get().restoreNavigation(valueOr(read, null), valueOr(stored, null))
      } catch (e) {
        set({ status: 'error', error: caught(e) })
      }
    },

    refetch: async () => {
      try {
        await readTree()
      } catch (e) {
        set({ status: 'error', error: caught(e) })
      }
    },

    applyTree: (incoming) => {
      // IPC strips identity, so without stabilize() every push would re-render every consumer.
      const prev = get().tree
      const tree = stabilize(incoming, prev)
      set({ status: 'ready', tree })
      const index = reconcileIndexOf(tree)
      get().reconcileNavigation(index)
      get().reconcileWindow(index)
      get().reconcileGlance(index)
      // Only a copy the tree itself changed: an optimistic patch, or a push repeating the copy the tree holds, would roll back a newer change the slice already holds.
      if (tree.personalization !== prev?.personalization) {
        set({ personalization: tree.personalization })
        applyPersonalization(tree.personalization)
      }
      if (tree.commands !== prev?.commands) set({ commands: tree.commands })
    },

    choose: () => openVia(() => dialer().ask('nexus:choose')),
    openPath: (path) => openVia(() => dialer().ask('nexus:openPath', path)),
    openDropped: (file) => openVia(() => dialer().openDropped(file)),

    mutate: async (req, onCreated) => {
      const nexus = get().tree?.nexus.id
      // A save queued for a path this op moves would land on the old path and be refused.
      switch (req.op) {
        case 'movePage':
          await flushPageSave(req.path)
          break
        case 'rename':
          // A page rename's cascade rewrites links inside tile files, so their pending saves land first.
          if (req.kind === 'page' && !req.fromCreate) await tileBodyWriter.flushAll()
          await (req.kind === 'page' ? flushPageSave(req.path) : flushAllPageSaves())
          break
        case 'renameHeading':
          await tileBodyWriter.flushAll()
          break
        case 'delete':
          await (req.kind === 'page' ? flushPageSave(req.path) : flushAllPageSaves())
          break
        case 'moveSet':
          await flushAllPageSaves()
          break
      }
      // A flush held by a Nexus switch resumes after it, when the path this op names belongs to the Nexus it left.
      if (get().tree?.nexus.id !== nexus) return null
      const res = await dialer().ask('mutate', req)
      if (!reportRefusal(res)) return null
      if (res.value.unrestored) notifyReport(unrestoredLine(res.value.unrestored), true)
      if (req.op !== 'delete' && res.value.cascade?.warning)
        notifyReport(res.value.cascade.warning, true)
      if (req.op === 'delete' || req.op === 'restore' || req.op === 'emptyBundle')
        get().bumpTrashRevision()
      // Instant optimistic patch; main's confirming push lands a beat later with no flicker.
      const cur = get().tree
      let patched: NexusTree | null = null
      if (cur) {
        get().patchPagesFor(req)
        switch (req.op) {
          case 'movePage':
          case 'moveSet':
          case 'reorderChildren':
          case 'reorderTop':
            patched = orderInTree(cur, req)
            break
          case 'rename':
            // The landed name, never the ask — a from-create rename may have disambiguated.
            patched = renameNodeInTree(cur, req.path, res.value.renamed?.name ?? req.newName)
            break
          case 'delete':
            patched = removeNodeInTree(cur, req.path)
            break
          case 'setIcon':
            if (req.kind !== 'page') patched = patchNodeInTree(cur, req.path, { icon: req.icon })
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
        if (patched) get().applyTree(patched)
      }
      // Without the optimistic create the rename input mounts only after the full re-walk.
      let createdShown = false
      if (cur && res.value.created && onCreated) {
        const optimistic = insertCreatedInTree(cur, req, res.value.created)
        if (optimistic) {
          // The sync body runs first, so its state lands in the commit that mounts the newborn.
          const settled = onCreated(res.value.created)
          get().applyTree(optimistic)
          await settled
          createdShown = true
        }
      }
      if (!createdShown && res.value.created && onCreated) await onCreated(res.value.created)
      return res.value
    },
  }
}
