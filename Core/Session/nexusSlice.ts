import {
  clearNotification,
  notifyReport,
  notifyUnreadable,
  reportRefusal,
  unrestoredLine,
} from '../Interface/Notifications/notifications'
import type { MutateOutcome, MutateRequest } from '../Nexus/mutateRequest'
import { caught, type PommoraError, type Result, valueOr } from '../Contract/result'
import type { NexusChange, NexusTree } from '../Nexus/tree'
import type { SyncStatus } from '../Sync/Contract/wire'
import { patch } from '../Nexus/treeDelta'
import { stabilize } from '../Nexus/treeStabilize'
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
import { withOwnSettings } from './configSlice'

export interface NexusSlice {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'empty'
  tree: NexusTree | null
  version: number
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
  applyTree: (tree: NexusTree, version: number) => void
  applyChange: (change: NexusChange) => void
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

  const install = (tree: NexusTree, version: number): void => {
    const prev = get().tree
    set({ status: 'ready', tree, version })
    const index = reconcileIndexOf(tree)
    get().reconcileNavigation(index)
    get().reconcileWindow(index)
    get().reconcileGlance(index)
    if (tree.config.personalization !== prev?.config.personalization)
      applyPersonalization(tree.config.personalization)
    const fresh =
      tree.unreadable !== prev?.unreadable &&
      tree.unreadable?.find((u) => !prev?.unreadable?.some((p) => p.path === u.path))
    if (fresh)
      notifyUnreadable(fresh, () => void get().mutate({ op: 'retryUnreadable', path: fresh.path }))
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
    get().applyTree(res.value.tree, res.value.version)
    return true
  }

  return {
    status: 'idle',
    tree: null,
    version: 0,
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

    // A whole tree arrives without identity, so stabilize() spares every consumer whose part didn't change.
    applyTree: (incoming, version) => {
      const held = get().tree
      install(stabilize(withOwnSettings(incoming, held), held), version)
    },

    // A difference that doesn't follow the tree held, or doesn't fit it, asks for the whole tree.
    applyChange: ({ version, delta }) => {
      if ('set' in delta) return get().applyTree(delta.set as NexusTree, version)
      const held = get().tree
      if (!held || version !== get().version + 1) return void get().refetch()
      let next: NexusTree
      try {
        next = patch(held, delta)
      } catch {
        return void get().refetch()
      }
      install(stabilize(withOwnSettings(next, held), held), version)
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
      // The host pushed what this write changed before it replied, so the tree already holds it.
      get().patchPagesFor(req)
      if (res.value.created && onCreated) await onCreated(res.value.created)
      return res.value
    },
  }
}
