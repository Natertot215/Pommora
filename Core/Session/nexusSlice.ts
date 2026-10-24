import {
  clearNotification,
  notifyReport,
  notifyRetry,
  warnCascade,
  notifyUnreadable,
  reportRefusal,
  unrestoredLine,
} from '../Interface/Notifications/notifications'
import {
  changesSettled,
  changesStores,
  type MutateOutcome,
  type MutateRequest,
} from '../Nexus/mutateRequest'
import { caught, type PommoraError, type Result, valueOr } from '../Contract/result'
import type { NexusChange, NexusTree } from '../Nexus/tree'
import type { SyncStatus } from '../Sync/Contract/wire'
import { applyDelta } from '../Nexus/treeDelta'
import { stabilize } from '../Nexus/treeStabilize'
import { applyPersonalization } from '../Settings/applyPersonalization'
import { pageMoves, pagesByIdOf } from '../Nexus/record'
import { reconcileIndexOf } from '../Nexus/treeIndex'
import { headingKeys, type PageHeadings } from '../Connections/pageIndex'
import { tileDocsSettled } from '../Tiles/tileDocStore'
import { cancelAllWriters, flushAllWriters, holdSaves, releaseSaves } from './saveScheduler'
import type { Slice } from './sessionState'
import { pushUndo, resetUndo } from './undo'
import { dialer } from '../Platform/dialer'
import { inTurns } from '../Platform/inTurns'
import { withOwnSettings } from './configSlice'
import { emitter } from '@pommora/uix/Utilities/subscribable'

export function movedHeadings(
  headings: Record<string, PageHeadings>,
  before: ReadonlyMap<string, { path: string }>,
  after: ReadonlyMap<string, { path: string }>,
): Record<string, PageHeadings> {
  let next = headings
  for (const id of pageMoves(before, after).moved) {
    const was = before.get(id)!.path
    const now = after.get(id)!.path
    if (!(was in headings)) continue
    if (next === headings) next = { ...headings }
    next[now] = headings[was]
    delete next[was]
  }
  return next
}

export interface NexusSlice {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'empty'
  tree: NexusTree | null
  version: number
  error?: PommoraError
  syncStatus: SyncStatus | null
  headings: Record<string, PageHeadings>
  /** Opens the bound Nexus into the window: its device preferences, its tree, then what the window restores from it. */
  load: () => Promise<void>
  /** Re-reads the bound Nexus's tree, for a root that moved under a Nexus the window already holds. */
  refetch: () => Promise<void>
  applySyncStatus: (status: SyncStatus) => void
  applyChange: (change: NexusChange) => void
  loadHeadings: (paths?: string[]) => Promise<void>
  choose: () => Promise<void>
  openPath: (path: string) => Promise<void>
  openDropped: (file: File) => Promise<void>
  /** `quiet` posts nothing — no refusal, report, warning, or store change — for a batch that reports once for all its rows. */
  mutate: (req: MutateRequest, opts?: { quiet?: true }) => Promise<MutateOutcome | null>
  /** Sends the one Try Again: finishes every entry the notes file holds. */
  finishOwed: () => void
}

/** Every save the window still owes, landed ahead of a switch, a quit, or a write that moves, renames, or deletes: a page write after a switch's root flip would overwrite a same-relative-path file in the new Nexus. */
export async function flushAllSaves(): Promise<void> {
  await Promise.all([flushAllWriters(), tileDocsSettled()])
}

/** What a store holds changed, so an open browser of it lists again. */
export const storesChanged = emitter()

export const createNexusSlice: Slice<NexusSlice> = (set, get) => {
  // One headings ask at a time, so an answer never lands over one asked after it.
  const headingsInTurn = inTurns()
  const resetNexusSession = (): void => {
    cancelAllWriters()
    // Device preferences are per machine PER NEXUS, so nothing of the old one's stays on screen while this one's is read, or after a refused read.
    set({ headings: {}, devicePrefs: {}, devicePrefsLive: false })
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

  // A whole tree arrives without identity, so stabilize() spares every consumer whose part didn't change.
  const install = (incoming: NexusTree, version: number): void => {
    const prev = get().tree
    const tree = stabilize(withOwnSettings(incoming, prev), prev)
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
    install(res.value.tree, res.value.version)
    return true
  }

  return {
    status: 'idle',
    tree: null,
    version: 0,
    error: undefined,
    syncStatus: null,
    headings: {},

    applySyncStatus: (status) => set({ syncStatus: status }),

    loadHeadings: (paths) =>
      headingsInTurn(async () => {
        const res = await dialer().ask('index:headings', paths)
        if (!res.ok) return
        const read = Object.fromEntries(
          Object.entries(res.value).map(([path, outline]) => [
            path,
            { keys: headingKeys(outline), texts: outline.map((h) => h.text), outline },
          ]),
        )
        const held = get().headings
        if (paths && Object.entries(read).every(([p, h]) => stabilize(h, held[p]) === held[p]))
          return
        set({ headings: stabilize(paths ? { ...held, ...read } : read, held) })
      }),

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
        const [, , read, matrix, windows, stored] = await Promise.all([
          dialer()
            .ask('citations:get')
            .then((r) => set({ citationsShown: valueOr(r, {}) })),
          dialer()
            .ask('linkTitles:get')
            .then((r) => set({ linkTitles: valueOr(r, {}) })),
          dialer().ask('nav:read'),
          dialer().ask('matrix:read'),
          dialer().ask('windows:load'),
          dialer().ask('tabs:load'),
        ])
        if (matrix.ok) get().applyMatrixChanged(matrix.value)
        if (windows.ok) set({ windowsFile: windows.value })
        get().restoreNavigation(valueOr(read, null), valueOr(stored, null))
      } catch (e) {
        set({ status: 'error', error: caught(e) })
      }
    },

    refetch: () => readTree().then(() => undefined),

    // A difference that doesn't follow the tree held, or doesn't fit it, asks for the whole tree.
    applyChange: ({ version, delta }) => {
      if ('set' in delta) return install(delta.set, version)
      const held = get().tree
      if (!held || version !== get().version + 1) return void get().refetch()
      let next: NexusTree
      try {
        next = applyDelta(held, delta)
      } catch {
        return void get().refetch()
      }
      install(next, version)
    },

    choose: () => openVia(() => dialer().ask('nexus:choose')),
    openPath: (path) => openVia(() => dialer().ask('nexus:openPath', path)),
    openDropped: (file) => openVia(() => dialer().openDropped(file)),

    mutate: async (req, { quiet } = {}) => {
      const held = get().tree
      const moves = req.op === 'rename' || req.op === 'movePage' || req.op === 'moveSet'
      if (changesSettled(req.op)) await flushAllSaves()
      // A flush held by a Nexus switch resumes after it, when the path this op names belongs to the Nexus it left.
      if (get().tree?.nexus.id !== held?.nexus.id) return null
      let res = await dialer().ask('mutate', req)
      if (!res.ok && res.error.code === 'owed') {
        await dialer().ask('mutate', { op: 'finishOwed' })
        res = await dialer().ask('mutate', req)
      }
      if (!res.ok) {
        if (quiet) return null
        if (res.error.code === 'owed') notifyRetry(res.error.message, get().finishOwed)
        // A value write sets the whole value, so sending it again is safe, and a file it couldn't reach may read on a retry.
        else if (
          (req.op === 'setProperty' || req.op === 'setContext') &&
          res.error.code === 'operation-failed'
        )
          notifyRetry(res.error.message, async () => {
            const undo = (await get().mutate(req))?.undo
            if (undo)
              pushUndo(() => {
                void get().mutate(undo)
                return true
              })
          })
        else reportRefusal(res)
        return null
      }
      if (!quiet) {
        if (res.value.unrestored) notifyReport(unrestoredLine(res.value.unrestored), true)
        const { cascade, retry, missed } = res.value
        if (req.op !== 'delete' && req.op !== 'deleteProperty' && cascade)
          warnCascade(
            cascade,
            cascade.owed
              ? get().finishOwed
              : retry
                ? () => void get().mutate(retry)
                : missed
                  ? () => void get().mutate({ op: 'putBack', entries: missed })
                  : undefined,
          )
        if (res.value.created && res.value.landedAs)
          notifyReport(`Created “${res.value.landedAs}”.`, false)
        if (changesStores(req)) storesChanged.emit()
      }
      // The host pushed what this write changed before it replied, so the tree already holds it.
      get().patchPagesFor(req)
      const tree = get().tree
      if (moves && held && tree)
        set((s) => ({ headings: movedHeadings(s.headings, pagesByIdOf(held), pagesByIdOf(tree)) }))
      return res.value
    },
    finishOwed: () => void get().mutate({ op: 'finishOwed' }),
  }
}
