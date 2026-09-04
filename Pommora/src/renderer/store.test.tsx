// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ASSETS_DIR_REL } from '@shared/nexusPaths'
import type { NexusTree, PageDetail, SelectTarget, Tab } from '@shared/types'
import {
  frozenOf,
  type PageSlot,
  type PageTarget,
  windowTargetOf,
  shownDetail,
  shownPage,
  useSession,
} from './store'
import { newTabTab } from './Tabs/tabsModel'
import { navKey } from './Navigation/navRecents'
import { clearCache } from './Store/tabState'

// Stub the narrow window.nexus surface the tab glue reaches (page fetch, recents save, tab persist,
// the mutation gateway, the applyTree accent read) so it runs in isolation.
beforeEach(() => {
  clearCache() // module state — never leaks across tests
  ;(window as unknown as { nexus: unknown }).nexus = {
    openPage: vi.fn(async () => ({ ok: true, value: {} })),
    nav: { write: vi.fn(async () => ({ ok: true, value: null })) },
    tabs: {
      save: vi.fn(async () => ({ ok: true, value: null })),
      load: vi.fn(async () => ({ ok: true, value: null })),
    },
    systemAccent: vi.fn(async () => '#000000'),
    devicePrefs: { load: vi.fn(async () => ({ ok: true, value: null })) },
    mutate: vi.fn(async () => ({ ok: true, value: {} })),
  }
})

const ctx = (id: string): SelectTarget => ({ kind: 'context', id })
const uTab = (
  id: string,
  target: Tab['target'],
  navStack: SelectTarget[] = [],
  navIndex = -1,
): Tab => ({
  id,
  target,
  navStack,
  navIndex,
})

type State = ReturnType<typeof useSession.getState>
const seed = (partial: Partial<State>): void => {
  useSession.setState({
    tabs: [],
    activeTabId: '',
    tabMru: [],
    pinned: [],
    pinnedTabs: [],
    recents: [],
    selection: { kind: 'none' },
    pages: {},
    tree: null,
    ...partial,
  })
}

describe('store — tab wiring (Phase 0)', () => {
  it('activateTab re-surfaces the target without recording (C-5)', () => {
    seed({
      tabs: [uTab('t1', ctx('a'), [ctx('a')], 0), uTab('t2', ctx('b'), [ctx('b')], 0)],
      activeTabId: 't1',
    })
    useSession.getState().activateTab('t2')
    const s = useSession.getState()
    expect(s.activeTabId).toBe('t2')
    expect(s.selection).toEqual({ kind: 'context', id: 'b' })
    expect(s.recents).toEqual([]) // a plain activate never records
    expect(s.tabMru[0]).toBe('t2')
  })

  it('activating a newtab tab routes to the empty state (E-2)', () => {
    seed({ tabs: [newTabTab('n')], activeTabId: 't-prev' })
    useSession.getState().activateTab('n')
    expect(useSession.getState().selection).toEqual({ kind: 'none' })
  })

  it('a genuine select replaces the scratch tab in place and records recents', async () => {
    seed({ tabs: [uTab('t1', ctx('a'), [ctx('a')], 0)], activeTabId: 't1' })
    await useSession.getState().select(ctx('b'))
    const s = useSession.getState()
    expect(s.tabs).toHaveLength(1)
    expect(s.tabs[0].target).toEqual(ctx('b'))
    expect(s.tabs[0].navStack).toEqual([ctx('a'), ctx('b')])
    expect(s.selection).toEqual({ kind: 'context', id: 'b' })
    expect(s.recents.map((r) => ('id' in r ? r.id : r.kind))).toEqual(['b'])
  })

  it('re-selecting the shown entity after Back is a dedup no-op — Forward preserved', async () => {
    // target must move in lockstep with navIndex: after Back to b, clicking b in the sidebar must
    // dedup against the LIVE shown entity (not the pre-Back target) and leave the Forward stack alone.
    seed({ tabs: [uTab('t1', ctx('c'), [ctx('a'), ctx('b'), ctx('c')], 2)], activeTabId: 't1' })
    useSession.getState().goBack()
    expect(useSession.getState().tabs[0].target).toEqual(ctx('b'))
    await useSession.getState().select(ctx('b'))
    let s = useSession.getState()
    expect(s.tabs[0].navStack).toEqual([ctx('a'), ctx('b'), ctx('c')])
    expect(s.tabs[0].navIndex).toBe(1)
    expect(s.recents).toEqual([]) // a dedup-focus never records
    useSession.getState().goForward()
    s = useSession.getState()
    expect(s.selection).toEqual({ kind: 'context', id: 'c' })
  })

  it('per-tab Back/Forward walks the active tab own history (D-7)', () => {
    seed({ tabs: [uTab('t1', ctx('c'), [ctx('a'), ctx('b'), ctx('c')], 2)], activeTabId: 't1' })
    useSession.getState().goBack()
    let s = useSession.getState()
    expect(s.tabs[0].navIndex).toBe(1)
    expect(s.selection).toEqual({ kind: 'context', id: 'b' })
    useSession.getState().goForward()
    s = useSession.getState()
    expect(s.tabs[0].navIndex).toBe(2)
    expect(s.selection).toEqual({ kind: 'context', id: 'c' })
  })

  it('closing the active tab focuses the MRU top (D-9)', () => {
    seed({
      tabs: [uTab('t1', ctx('a'), [ctx('a')], 0), uTab('t2', ctx('b'), [ctx('b')], 0)],
      activeTabId: 't2',
      tabMru: ['t2', 't1'],
    })
    useSession.getState().closeTab('t2')
    const s = useSession.getState()
    expect(s.activeTabId).toBe('t1')
    expect(s.selection).toEqual({ kind: 'context', id: 'a' })
  })

  it('closing the last tab reseeds a NavView, routing to the empty state (I-5)', () => {
    seed({ tabs: [uTab('t1', ctx('a'), [ctx('a')], 0)], activeTabId: 't1', tabMru: ['t1'] })
    useSession.getState().closeTab('t1')
    const s = useSession.getState()
    expect(s.tabs).toHaveLength(1)
    expect(s.tabs[0].target).toEqual({ kind: 'newtab' })
    expect(s.selection).toEqual({ kind: 'none' })
  })
})

const pg = (id: string): PageTarget => ({ kind: 'page', id, path: `Notes/${id}.md` })
const detail = (id: string, path = `Notes/${id}.md`): PageDetail => ({
  id,
  title: id.toUpperCase(),
  path,
  frontmatter: {},
  body: 'x',
})
const ready = (id: string): PageSlot => ({
  status: 'ready',
  target: pg(id),
  detail: detail(id),
  body: 'x',
})

/** Holds B's fetch open while A resolves at once; the returned resolver lands B's response. */
const pauseFetchOfB = (): ((v: unknown) => void) => {
  let resolveB!: (v: unknown) => void
  ;(window.nexus.openPage as ReturnType<typeof vi.fn>).mockImplementation((path: string) =>
    path === pg('b').path
      ? new Promise((r) => (resolveB = r))
      : Promise.resolve({ ok: true, value: detail('a') }),
  )
  return (v) => resolveB(v)
}

describe('store — warm tabs (B-2/B-3)', () => {
  it('a page keeps its slot while its tab is parked; switching back is instant — no fetch, no flash', () => {
    seed({
      tabs: [uTab('t1', pg('a'), [pg('a')], 0), uTab('t2', pg('b'), [pg('b')], 0)],
      activeTabId: 't1',
      selection: pg('a'),
      pages: { a: ready('a') },
    })
    useSession.getState().activateTab('t2')
    expect(useSession.getState().pages.a?.status).toBe('ready')
    ;(window.nexus.openPage as ReturnType<typeof vi.fn>).mockClear()
    useSession.getState().activateTab('t1')
    const s = useSession.getState()
    expect(shownPage(s)?.status).toBe('ready')
    expect(shownDetail(s)?.id).toBe('a')
    expect(window.nexus.openPage).not.toHaveBeenCalled()
  })

  it('a renamed entity misses the loaded slot and the warm detail (path check) and falls through to the cold fetch', async () => {
    seed({
      tabs: [uTab('t1', pg('a'), [pg('a')], 0)],
      activeTabId: 't1',
      selection: pg('a'),
      pages: { a: ready('a') },
    })
    useSession.getState().activateTab('t2-nonexistent')
    await useSession
      .getState()
      .select({ kind: 'page', id: 'a', path: '/a-renamed' }, { record: false })
    expect(window.nexus.openPage).toHaveBeenCalledWith('/a-renamed')
  })

  it('a stale cold fetch resolving after a warm switch-back never clobbers the shown page', async () => {
    // Warm-instant finishes synchronously, so an earlier in-flight fetch resolves LAST — the fence
    // must drop it or the wrong file renders (and autosaves) under the wrong tab.
    const resolveB = pauseFetchOfB()
    seed({
      tabs: [uTab('t1', pg('a'), [pg('a')], 0), uTab('t2', pg('b'), [pg('b')], 0)],
      activeTabId: 't1',
      selection: pg('a'),
      pages: { a: ready('a') },
    })
    useSession.getState().activateTab('t2') // cold fetch of /b now in flight
    useSession.getState().activateTab('t1') // instant back to A's slot
    expect(shownDetail(useSession.getState())?.id).toBe('a')
    resolveB({ ok: true, value: detail('b') }) // the stale response lands last
    await new Promise((r) => setTimeout(r, 0))
    const s = useSession.getState()
    expect(shownDetail(s)?.id).toBe('a') // fence held — B never clobbered the shown page
    expect(s.pages.b).toBeUndefined()
    expect(s.selection).toEqual(pg('a'))
  })

  it('a cold switch pauses on the outgoing view — no loading intermediate, one-commit swap', async () => {
    const resolveB = pauseFetchOfB()
    seed({
      tabs: [uTab('t1', pg('a'), [pg('a')], 0)],
      activeTabId: 't1',
      selection: pg('a'),
      pages: { a: ready('a') },
    })
    const p = useSession.getState().select(pg('b'))
    let s = useSession.getState()
    expect(s.selection).toEqual(pg('a')) // outgoing view still shown
    expect(shownPage(s)?.status).toBe('ready') // its slot survives the pause
    expect(frozenOf(s)).toBe(true) // ...but it's a held frame, not a live surface
    resolveB({ ok: true, value: detail('b') })
    await p
    s = useSession.getState()
    expect(s.selection).toEqual(pg('b'))
    expect(shownDetail(s)?.id).toBe('b')
    expect(s.pages.a).toBeUndefined() // nothing points at A any more
    expect(frozenOf(s)).toBe(false)
  })

  it('a navigation mid-pause supersedes the fetch — the stale response never lands', async () => {
    const resolveB = pauseFetchOfB()
    seed({
      tabs: [uTab('t1', pg('a'), [pg('a')], 0)],
      activeTabId: 't1',
      selection: pg('a'),
      pages: { a: ready('a') },
    })
    const p = useSession.getState().select(pg('b')) // paused on A
    await useSession.getState().select({ kind: 'homepage' }) // user moves on mid-pause
    let s = useSession.getState()
    expect(s.selection).toEqual({ kind: 'homepage' })
    expect(frozenOf(s)).toBe(false)
    resolveB({ ok: true, value: detail('b') })
    await p
    s = useSession.getState()
    expect(s.selection).toEqual({ kind: 'homepage' }) // the stale B response was dropped
    expect(s.pages).toEqual({})
  })

  it('a slow cold fetch falls back to the loading view at the deadline', async () => {
    vi.useFakeTimers()
    try {
      const resolveB = pauseFetchOfB()
      seed({
        tabs: [uTab('t1', pg('a'), [pg('a')], 0)],
        activeTabId: 't1',
        selection: pg('a'),
        pages: { a: ready('a') },
      })
      const p = useSession.getState().select(pg('b'))
      expect(frozenOf(useSession.getState())).toBe(true)
      vi.advanceTimersByTime(300) // past the deadline — the loading view takes over
      let s = useSession.getState()
      expect(s.selection).toEqual(pg('b'))
      expect(shownPage(s)).toBeUndefined()
      expect(frozenOf(s)).toBe(false)
      resolveB({ ok: true, value: detail('b') })
      await p
      s = useSession.getState()
      expect(shownDetail(s)?.id).toBe('b')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('store — page slots', () => {
  const openPage = (): ReturnType<typeof vi.fn> => window.nexus.openPage as ReturnType<typeof vi.fn>

  it('a slot outlives one tab while another points at its page, and dies with the last', () => {
    seed({
      tabs: [uTab('t1', pg('a'), [pg('a')], 0), uTab('t2', pg('a'), [pg('a')], 0)],
      activeTabId: 't1',
      tabMru: ['t1', 't2'],
      selection: pg('a'),
      pages: { a: ready('a') },
    })
    useSession.getState().closeTab('t2')
    expect(useSession.getState().pages.a?.status).toBe('ready')
    useSession.getState().closeTab('t1')
    expect(useSession.getState().pages.a).toBeUndefined()
  })

  it('a rename deletes every parked slot and reloads the shown one', async () => {
    openPage().mockImplementation(async (path: string) => ({
      ok: true,
      value: detail(path.slice(6, 7), path),
    }))
    seed({
      tree: treeWith([
        { id: 'a', path: 'Notes/a.md' },
        { id: 'b', path: 'Notes/b.md' },
      ]),
      tabs: [uTab('t1', pg('a'), [pg('a')], 0), uTab('t2', pg('b'), [pg('b')], 0)],
      activeTabId: 't1',
      tabMru: ['t1', 't2'],
      selection: pg('a'),
      pages: { a: ready('a'), b: ready('b') },
    })
    await useSession
      .getState()
      .mutate({ op: 'rename', path: 'Notes/b.md', kind: 'page', newName: 'd' })
    const s = useSession.getState()
    expect(s.pages.b).toBeUndefined()
    expect(s.pages.a?.status).toBe('ready')
    expect(openPage()).toHaveBeenCalledWith('Notes/a.md')
    // Returning to the parked page fetches cold at its re-pathed file — nothing warm survived.
    openPage().mockClear()
    useSession.getState().activateTab('t2')
    expect(openPage()).toHaveBeenCalledWith('Notes/d.md')
  })

  it('a tree push that re-paths the shown page spares its slot while the re-select is in flight', async () => {
    let resolveA!: (v: unknown) => void
    openPage().mockImplementation(() => new Promise((r) => (resolveA = r)))
    seed({
      tree: treeWith([{ id: 'a', path: 'Notes/a.md' }]),
      tabs: [uTab('t1', pg('a'), [pg('a')], 0)],
      activeTabId: 't1',
      tabMru: ['t1'],
      selection: pg('a'),
      pages: { a: ready('a') },
    })
    const p = useSession.getState().applyTree(treeWith([{ id: 'a', path: 'Notes/moved.md' }]))
    let s = useSession.getState()
    expect(s.pages.a?.status).toBe('ready') // the pause holds on the old slot
    expect(frozenOf(s)).toBe(true)
    expect(openPage()).toHaveBeenCalledWith('Notes/moved.md')
    resolveA({ ok: true, value: detail('a', 'Notes/moved.md') })
    await p
    await new Promise((r) => setTimeout(r, 0))
    s = useSession.getState()
    expect(shownDetail(s)?.path).toBe('Notes/moved.md')
    expect(frozenOf(s)).toBe(false)
  })
})

/** A minimal tree with one Collection holding the given top-level pages (selection.test.ts's shape). */
function treeWith(pages: { id: string; path: string }[]): NexusTree {
  return {
    nexus: { id: 'nx', rootPath: '/x', name: 'x', profileImage: null, profileSubtitle: '' },
    homepage: { headingIconHidden: false },
    crops: {},
    contexts: [],
    collections: [
      {
        kind: 'collection',
        id: 'c1',
        title: 'Notes',
        path: 'Notes',
        sets: [],
        pages: pages.map((p) => ({ kind: 'page', id: p.id, title: 'P', path: p.path })),
      },
    ],
    accent: 'lavender',
    personalization: {},
    commands: {},
    assetDirectory: ASSETS_DIR_REL,
    excluded: [],
    registry: [],
  }
}

describe('store — applyTree reconciles EVERY tab (I-2a)', () => {
  const page = (id: string, path: string): SelectTarget => ({ kind: 'page', id, path })

  it('refreshes an inactive tab on a rename and closes it on a delete, without activating it', async () => {
    const col: SelectTarget = { kind: 'collection', id: 'c1' }
    const t1: Tab = { id: 't1', target: col, navStack: [col], navIndex: 0 }
    const t2: Tab = {
      id: 't2',
      target: page('b', 'Notes/B.md'),
      navStack: [page('b', 'Notes/B.md')],
      navIndex: 0,
    }
    seed({ tabs: [t1, t2], activeTabId: 't1', tabMru: ['t1', 't2'] })

    // Rename: page b moves — the inactive t2 refreshes in place, the active tab stays put.
    await useSession.getState().applyTree(treeWith([{ id: 'b', path: 'Notes/Renamed.md' }]))
    let s = useSession.getState()
    expect(s.activeTabId).toBe('t1')
    expect(s.tabs.find((t) => t.id === 't2')?.target).toEqual(page('b', 'Notes/Renamed.md'))

    // Delete: page b is gone — the inactive unpinned t2 closes; the active tab is untouched.
    await useSession.getState().applyTree(treeWith([]))
    s = useSession.getState()
    expect(s.tabs.map((t) => t.id)).toEqual(['t1'])
    expect(s.activeTabId).toBe('t1')
  })
})

describe('store — applyTree reconciles the window tabs (D-6)', () => {
  it('re-paths a renamed tab, re-parents on a dead origin, closes the window when all tabs die', async () => {
    useSession.getState().openWindow({ id: 'b', path: 'Notes/B.md' })
    useSession.getState().openWindowTab({ id: 'c', path: 'Notes/C.md' })

    await useSession.getState().applyTree(
      treeWith([
        { id: 'b', path: 'Notes/Renamed.md' },
        { id: 'c', path: 'Notes/C.md' },
      ]),
    )
    let p = useSession.getState().pageWindow
    expect(p?.tabs[0].target).toMatchObject({ id: 'b', path: 'Notes/Renamed.md' })
    expect(windowTargetOf(useSession.getState())).toMatchObject({ id: 'c', path: 'Notes/C.md' })

    await useSession.getState().applyTree(treeWith([{ id: 'c', path: 'Notes/C.md' }]))
    p = useSession.getState().pageWindow
    expect(p?.originId).toBe('c')
    expect(p?.tabs).toHaveLength(1)

    await useSession.getState().applyTree(treeWith([]))
    expect(useSession.getState().pageWindow).toBeNull()
    expect(windowTargetOf(useSession.getState())).toBeNull()
  })

  it('folds multiple simultaneous dead tabs: a dead active with a dead left neighbor lands on the survivor', async () => {
    useSession.getState().openWindow({ id: 'a', path: 'Notes/A.md' })
    useSession.getState().openWindowTab({ id: 'b', path: 'Notes/B.md' })
    useSession.getState().openWindowTab({ id: 'c', path: 'Notes/C.md' })
    useSession.getState().openWindowTab({ id: 'd', path: 'Notes/D.md' })

    // c and d (the active) die in one push — the active walks left past dead c onto b.
    await useSession.getState().applyTree(
      treeWith([
        { id: 'a', path: 'Notes/A.md' },
        { id: 'b', path: 'Notes/B.md' },
      ]),
    )
    const p = useSession.getState().pageWindow
    expect(p?.tabs.map((t) => (t.target.kind === 'page' ? t.target.id : ''))).toEqual(['a', 'b'])
    expect(p?.tabs.find((t) => t.id === p.activeTabId)?.target).toMatchObject({ id: 'b' })
    expect(p?.originId).toBe('a')
  })

  it('a tree from a DIFFERENT nexus resets the session before any reconcile can leak state', async () => {
    useSession.getState().openWindow({ id: 'b', path: 'Notes/B.md' })
    await useSession.getState().applyTree(treeWith([{ id: 'b', path: 'Notes/B.md' }]))
    expect(useSession.getState().windowsFile.origins.b).toBeDefined()

    // The menu's reload-state path: a foreign-root tree lands with NO openVia clear before it.
    const base = treeWith([])
    await useSession
      .getState()
      .applyTree({ ...base, nexus: { ...base.nexus, id: 'other', rootPath: '/other' } })
    const s = useSession.getState()
    expect(s.pageWindow).toBeNull()
    expect(s.windowsFile).toEqual({ navSet: null, origins: {}, open: null })
    expect(s.activeTabId).toBe('') // the once-per-nexus load gate re-opens
  })

  it('a summon reconciles the remembered set against the live tree (H-10 restore)', async () => {
    await useSession.getState().applyTree(
      treeWith([
        { id: 'x', path: 'Notes/x.md' },
        { id: 'y', path: 'Notes/Renamed.md' },
      ]),
    )
    useSession.setState({
      windowsFile: {
        navSet: null,
        origins: {
          x: {
            tabs: [
              { target: { kind: 'page', id: 'x' } },
              { target: { kind: 'page', id: 'y' } },
              { target: { kind: 'page', id: 'z' } },
            ],
            activeIndex: 2,
          },
        },
        open: null,
      },
    })
    useSession.getState().openWindow({ id: 'x', path: 'Notes/x.md' })
    const p = useSession.getState().pageWindow
    // Dead z drops; y re-paths to its rename; the dead stored-active falls to the first survivor.
    expect(p?.tabs.map((t) => (t.target.kind === 'page' ? t.target.path : ''))).toEqual([
      'Notes/x.md',
      'Notes/Renamed.md',
    ])
    expect(p?.tabs.find((t) => t.id === p.activeTabId)?.target).toMatchObject({ id: 'x' })
  })

  it('keeps the nav flavor alive through a reconcile: dead page tabs drop, the map tab stays', async () => {
    useSession.getState().openNavWindow()
    useSession.getState().openWindowTab({ id: 'b', path: 'Notes/B.md' })

    await useSession.getState().applyTree(treeWith([]))
    const p = useSession.getState().pageWindow
    expect(p?.flavor).toBe('nav')
    expect(p?.tabs.map((t) => t.target.kind)).toEqual(['navwindow'])
    expect(windowTargetOf(useSession.getState())).toBeNull()
  })
})

describe('store — recents reorder + batched close', () => {
  const savedRecents = (): unknown =>
    (window as unknown as { nexus: { nav: { write: { mock: { calls: unknown[][] } } } } }).nexus.nav
      .write

  it('reorderRecent rewrites the order to the source and persists immediately (drag)', () => {
    const a = ctx('a')
    const b = ctx('b')
    const c = ctx('c')
    seed({ recents: [a, b, c] })
    useSession.getState().reorderRecent(navKey(a), navKey(c)) // drop a onto c's slot
    expect(useSession.getState().recents).toEqual([b, c, a])
    expect(savedRecents()).toHaveBeenCalledWith({ recents: [b, c, a] })
  })

  it('reorderRecent is a no-op on same/unknown key (no state churn, no write)', () => {
    const a = ctx('a')
    const b = ctx('b')
    seed({ recents: [a, b] })
    useSession.getState().reorderRecent(navKey(a), navKey(a))
    useSession.getState().reorderRecent('missing', navKey(b))
    expect(useSession.getState().recents).toEqual([a, b])
    expect(savedRecents()).not.toHaveBeenCalled()
  })
})

// The memory is a slice rather than a tree-keyed derivation because neither gesture pushes a tree:
// what these assert is that a write and a forget are visible immediately, with no reload between.
describe('store — the aliases a page has been given', () => {
  const aliasWrites = (): ReturnType<typeof vi.fn> =>
    (window as unknown as { nexus: { aliases: { set: ReturnType<typeof vi.fn> } } }).nexus.aliases
      .set

  beforeEach(() => {
    ;(window as unknown as { nexus: Record<string, unknown> }).nexus.aliases = {
      set: vi.fn(async () => ({ ok: true, value: null })),
    }
    useSession.setState({ pageAliases: {} })
  })

  it('remembers an alias, most recently given first', () => {
    useSession.getState().rememberAlias('p1', 'the notes')
    useSession.getState().rememberAlias('p1', 'my draft')
    expect(useSession.getState().pageAliases.p1).toEqual(['my draft', 'the notes'])
    expect(aliasWrites()).toHaveBeenLastCalledWith('p1', ['my draft', 'the notes'])
  })

  it('re-giving an alias promotes it rather than storing it twice', () => {
    useSession.getState().rememberAlias('p1', 'the notes')
    useSession.getState().rememberAlias('p1', 'my draft')
    useSession.getState().rememberAlias('p1', 'the notes')
    expect(useSession.getState().pageAliases.p1).toEqual(['the notes', 'my draft'])
  })

  it('forgets one and leaves the rest, without a reload', () => {
    useSession.getState().rememberAlias('p1', 'the notes')
    useSession.getState().rememberAlias('p1', 'my draft')
    useSession.getState().forgetAlias('p1', 'the notes')
    expect(useSession.getState().pageAliases.p1).toEqual(['my draft'])
    expect(aliasWrites()).toHaveBeenLastCalledWith('p1', ['my draft'])
  })

  // A reload reads no row for a page with nothing left, so the slice must not hold an empty list.
  it('forgetting the last one drops the page’s key entirely', () => {
    useSession.getState().rememberAlias('p1', 'the notes')
    useSession.getState().forgetAlias('p1', 'the notes')
    expect(useSession.getState().pageAliases).not.toHaveProperty('p1')
    expect(aliasWrites()).toHaveBeenLastCalledWith('p1', [])
  })

  it('an empty or unknown alias writes nothing at all', () => {
    useSession.getState().rememberAlias('p1', '   ')
    useSession.getState().forgetAlias('p1', 'never given')
    expect(useSession.getState().pageAliases).toEqual({})
    expect(aliasWrites()).not.toHaveBeenCalled()
  })
})
