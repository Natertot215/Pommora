// @vitest-environment jsdom
import { detail as pageDetail } from '../Testing/fixtures'
import { beforeEach, describe, expect, it, vi, onTestFinished } from 'vitest'
import { clearNotification, currentNotification } from '../Interface/Notifications/notifications'
import { ok } from '../Contract/result'
import { ASSETS_DIR_REL } from '../Paths/nexusPaths'
import type { NexusTree } from '../Nexus/tree'
import { diff } from '../Nexus/treeDelta'
import type { PageDetail } from '../Pages/pageDetail'
import {
  type PageTarget,
  type SelectTarget,
  type Tab,
  navKey,
  toNavRef,
  type StoredTabSet,
} from '../Navigation/navRef'
import {
  frozenOf,
  type PageSlot,
  windowTargetOf,
  shownDetail,
  shownPage,
  useSession,
} from './store'
import { newTabTab, pinTabId } from '../Navigation/tabsModel'
import { captureWarm, readWarm } from './warmCache'
import {
  clearCache,
  dropPageDetail,
  readBodyBase,
  readPageDetail,
  setBodyBase,
} from './pageDetailCache'
import { flushAllSessionSaves, schedulePageSave, scheduleTabsSave } from './saveScheduler'
import { makeTree } from '../Testing/testTree'
import { tileBodyWriter } from '../Tiles/tileDocStore'
import { dialer } from '../Platform/dialer'
import { stubDialer } from '../vitest.setup'
import { DEFAULT_COMMANDS } from '../Actions/commands'

// Stub the narrow channel set the tab glue reaches (page fetch, recents save, tab persist, the mutation gateway, the load's device-prefs read) so it runs in isolation.
let channels: Record<string, ReturnType<typeof vi.fn>>
const openPage = (): ReturnType<typeof vi.fn> => channels['page:open']

beforeEach(() => {
  clearCache()
  channels = {
    'page:open': vi.fn(async () => ({ ok: true, value: {} })),
    'nav:write': vi.fn(async () => ({ ok: true, value: null })),
    'tabs:save': vi.fn(async () => ({ ok: true, value: null })),
    'tabs:load': vi.fn(async () => ({ ok: true, value: null })),
    'devicePrefs:load': vi.fn(async () => ({ ok: true, value: {} })),
    mutate: vi.fn(async () => ({ ok: true, value: {} })),
    'windows:save': vi.fn(async () => ok(null)),
  }
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer(channels)
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
    expect(s.recents).toEqual([])
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
    // target must move in lockstep with navIndex: after Back to b, clicking b in the sidebar must dedup against the LIVE shown entity (not the pre-Back target) and leave the Forward stack alone.
    seed({ tabs: [uTab('t1', ctx('c'), [ctx('a'), ctx('b'), ctx('c')], 2)], activeTabId: 't1' })
    useSession.getState().goBack()
    expect(useSession.getState().tabs[0].target).toEqual(ctx('b'))
    await useSession.getState().select(ctx('b'))
    let s = useSession.getState()
    expect(s.tabs[0].navStack).toEqual([ctx('a'), ctx('b'), ctx('c')])
    expect(s.tabs[0].navIndex).toBe(1)
    expect(s.recents).toEqual([])
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

  it('reorderTabs moves a tab before another and to the end on null; a no-move persists nothing', async () => {
    const order = (): string[] => useSession.getState().tabs.map((t) => t.id)
    seed({
      tabs: [uTab('t1', ctx('a')), uTab('t2', ctx('b')), uTab('t3', ctx('c'))],
      activeTabId: 't1',
    })
    useSession.getState().reorderTabs('t3', 't1')
    expect(order()).toEqual(['t3', 't1', 't2'])
    useSession.getState().reorderTabs('t3', null)
    expect(order()).toEqual(['t1', 't2', 't3'])
    await flushAllSessionSaves()
    channels['tabs:save'].mockClear()
    useSession.getState().reorderTabs('t3', null)
    useSession.getState().reorderTabs('t2', 't3')
    useSession.getState().reorderTabs('missing', 't1')
    await flushAllSessionSaves()
    expect(order()).toEqual(['t1', 't2', 't3'])
    expect(channels['tabs:save']).not.toHaveBeenCalled()
  })
})

const pg = (id: string): PageTarget => ({ kind: 'page', id, path: `Notes/${id}.md` })
const detail = (id: string, path = `Notes/${id}.md`): PageDetail =>
  pageDetail({ id, title: id.toUpperCase(), path, body: 'x' })
const ready = (id: string): PageSlot => ({
  status: 'ready',
  target: pg(id),
  detail: detail(id),
  body: 'x',
})

/** Holds B's fetch open while A resolves at once; the returned resolver lands B's response. */
const pauseFetchOfB = (): ((v: unknown) => void) => {
  let resolveB!: (v: unknown) => void
  openPage().mockImplementation((path: string) =>
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
    openPage().mockClear()
    useSession.getState().activateTab('t1')
    const s = useSession.getState()
    expect(shownPage(s)?.status).toBe('ready')
    expect(shownDetail(s)?.id).toBe('a')
    expect(openPage()).not.toHaveBeenCalled()
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
    expect(openPage()).toHaveBeenCalledWith('/a-renamed')
  })

  it('a cold page fetch seeds the shared detail cache, so a panel on that path reads without a fetch', async () => {
    openPage().mockImplementation(async () => ok(detail('a')))
    seed({ tabs: [uTab('t1', pg('a'), [pg('a')], 0)], activeTabId: 't1' })
    await useSession.getState().select(pg('a'), { record: false })
    expect(readPageDetail(pg('a').path)).toEqual(detail('a'))
  })

  it('a reload refreshes the shown slot and the shared cache while keeping the typed body', async () => {
    openPage().mockImplementation(async () => ok(detail('a')))
    seed({
      selection: pg('a'),
      pages: { a: { status: 'ready', target: pg('a'), detail: detail('a'), body: 'typed' } },
    })
    await useSession.getState().reloadPage()
    expect(shownPage(useSession.getState())).toMatchObject({ status: 'ready', body: 'typed' })
    expect(readPageDetail(pg('a').path)).toEqual(detail('a'))
  })

  it('a cold fetch a drop disowned mid-flight still lands its slot but leaves the cache unseeded', async () => {
    const resolveB = pauseFetchOfB()
    seed({ tabs: [uTab('t1', pg('b'), [pg('b')], 0)], activeTabId: 't1' })
    const landing = useSession.getState().select(pg('b'), { record: false })
    dropPageDetail(pg('b').path)
    resolveB(ok(detail('b')))
    await landing
    expect(shownDetail(useSession.getState())?.id).toBe('b')
    expect(readPageDetail(pg('b').path)).toBeUndefined()
  })

  it('a stale cold fetch resolving after a warm switch-back never clobbers the shown page', async () => {
    // Warm-instant finishes synchronously, so an earlier in-flight fetch resolves LAST — the fence must drop it or the wrong file renders (and autosaves) under the wrong tab.
    const resolveB = pauseFetchOfB()
    seed({
      tabs: [uTab('t1', pg('a'), [pg('a')], 0), uTab('t2', pg('b'), [pg('b')], 0)],
      activeTabId: 't1',
      selection: pg('a'),
      pages: { a: ready('a') },
    })
    useSession.getState().activateTab('t2')
    useSession.getState().activateTab('t1')
    expect(shownDetail(useSession.getState())?.id).toBe('a')
    resolveB({ ok: true, value: detail('b') })
    await new Promise((r) => setTimeout(r, 0))
    const s = useSession.getState()
    expect(shownDetail(s)?.id).toBe('a')
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
    expect(s.selection).toEqual(pg('a'))
    expect(shownPage(s)?.status).toBe('ready')
    expect(frozenOf(s)).toBe(true)
    resolveB({ ok: true, value: detail('b') })
    await p
    s = useSession.getState()
    expect(s.selection).toEqual(pg('b'))
    expect(shownDetail(s)?.id).toBe('b')
    expect(s.pages.a).toBeUndefined()
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
    const p = useSession.getState().select(pg('b'))
    await useSession.getState().select({ kind: 'homepage' })
    let s = useSession.getState()
    expect(s.selection).toEqual({ kind: 'homepage' })
    expect(frozenOf(s)).toBe(false)
    resolveB({ ok: true, value: detail('b') })
    await p
    s = useSession.getState()
    expect(s.selection).toEqual({ kind: 'homepage' })
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
      vi.advanceTimersByTime(300)
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

  const seedLinkerAndParked = (): void => {
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
  }

  it('a rename re-paths only the renamed page’s slot and leaves the shown linker to the push', async () => {
    seedLinkerAndParked()
    setBodyBase('Notes/tile.md', { text: 'seen', hash: 'h' })
    const slotA = useSession.getState().pages.a
    channels.mutate = vi.fn(async () => {
      hostPushes(
        treeWith([
          { id: 'a', path: 'Notes/a.md' },
          { id: 'b', path: 'Notes/d.md' },
        ]),
      )
      return ok({})
    })
    await useSession
      .getState()
      .mutate({ op: 'rename', path: 'Notes/b.md', kind: 'page', newName: 'd' })
    const s = useSession.getState()
    expect(readBodyBase('Notes/tile.md')).toEqual({ text: 'seen', hash: 'h' })
    expect(s.pages.b).toBeUndefined()
    expect(s.pages.a).toBe(slotA)
    expect(openPage()).not.toHaveBeenCalledWith('Notes/a.md')
    // Returning to the parked page fetches cold at its re-pathed file.
    openPage().mockClear()
    useSession.getState().activateTab('t2')
    expect(openPage()).toHaveBeenCalledWith('Notes/d.md')
  })

  it('a heading rename leaves every page slot and warm capture alone and posts its warning', async () => {
    seedLinkerAndParked()
    channels.mutate = vi.fn(async () => ok({ cascade: { pages: [], hosts: [], warning: 'W' } }))
    const { a, b } = useSession.getState().pages
    captureWarm('t2', navKey(pg('b')), { pageDetail: detail('b', 'Notes/b.md') })
    const warm = readWarm('t2', navKey(pg('b')))
    await useSession
      .getState()
      .mutate({ op: 'renameHeading', path: 'Notes/a.md', heading: 'Setup', to: 'Intro' })
    const s = useSession.getState()
    expect(s.pages.a).toBe(a)
    expect(s.pages.b).toBe(b)
    expect(readWarm('t2', navKey(pg('b')))).toBe(warm)
    expect(openPage()).not.toHaveBeenCalled()
    expect(currentNotification()?.message).toBe('W')
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
    useSession.getState().applyTree(treeWith([{ id: 'a', path: 'Notes/moved.md' }]), 0)
    let s = useSession.getState()
    expect(s.pages.a?.status).toBe('ready')
    expect(frozenOf(s)).toBe(true)
    expect(openPage()).toHaveBeenCalledWith('Notes/moved.md')
    resolveA({ ok: true, value: detail('a', 'Notes/moved.md') })
    await new Promise((r) => setTimeout(r, 0))
    s = useSession.getState()
    expect(shownDetail(s)?.path).toBe('Notes/moved.md')
    expect(frozenOf(s)).toBe(false)
  })
})

// What the host does before it replies to a write: pushes the difference its settle found.
function hostPushes(next: NexusTree): void {
  const { tree, version, applyChange } = useSession.getState()
  const delta = diff(tree, next)
  if (delta) applyChange({ version: version + 1, delta })
}

/** A minimal tree with one Collection holding the given top-level pages (selection.test.ts's shape). */
function treeWith(pages: { id: string; path: string }[], spaces: string[] = []): NexusTree {
  return {
    nexus: { id: 'nx', rootPath: '/x', name: 'x' },
    contexts:
      spaces.length === 0
        ? []
        : [
            {
              def: { id: 'ctx1', title: 'Areas' },
              spaces: spaces.map((id) => ({
                kind: 'space' as const,
                id,
                title: 'S',
                path: `Areas/${id}`,
                contextId: 'ctx1',
              })),
            },
          ],
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
    config: {
      profileImage: null,
      homepage: { headingIconHidden: false },
      crops: {},
      pageMetadata: {},
      order: { spaces: {} },
      personalization: {},
      commands: DEFAULT_COMMANDS,
      assetDirectory: ASSETS_DIR_REL,
      excluded: [],
      registry: [],
    },
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

    useSession.getState().applyTree(treeWith([{ id: 'b', path: 'Notes/Renamed.md' }]), 0)
    let s = useSession.getState()
    expect(s.activeTabId).toBe('t1')
    expect(s.tabs.find((t) => t.id === 't2')?.target).toEqual(page('b', 'Notes/Renamed.md'))

    useSession.getState().applyTree(treeWith([]), 0)
    s = useSession.getState()
    expect(s.tabs.map((t) => t.id)).toEqual(['t1'])
    expect(s.activeTabId).toBe('t1')
  })

  it('a deleted active tab falls to the most recent tab', async () => {
    const [a, b, c] = (['a', 'b', 'c'] as const).map((id) => page(id, `Notes/${id}.md`))
    seed({
      tabs: [uTab('t1', a, [a], 0), uTab('t2', b, [b], 0), uTab('t3', c, [c], 0)],
      activeTabId: 't1',
      tabMru: ['t1', 't3', 't2'],
    })
    useSession.getState().applyTree(
      treeWith([
        { id: 'b', path: 'Notes/b.md' },
        { id: 'c', path: 'Notes/c.md' },
      ]),
    )
    const s = useSession.getState()
    expect(s.tabs.map((t) => t.id)).toEqual(['t2', 't3'])
    expect(s.activeTabId).toBe('t3')
  })
})

describe('store — applyTree reconciles the window tabs (D-6)', () => {
  it('re-paths a renamed tab and closes the window when all tabs die', async () => {
    useSession.getState().openWindowTab({ kind: 'page', id: 'b', path: 'Notes/B.md' })
    useSession.getState().openWindowTab({ kind: 'page', id: 'c', path: 'Notes/C.md' })

    useSession.getState().applyTree(
      treeWith([
        { id: 'b', path: 'Notes/Renamed.md' },
        { id: 'c', path: 'Notes/C.md' },
      ]),
    )
    let p = useSession.getState().windowSlot
    expect(p?.tabs[0].target).toMatchObject({ id: 'b', path: 'Notes/Renamed.md' })
    expect(windowTargetOf(useSession.getState())).toMatchObject({ id: 'c', path: 'Notes/C.md' })

    useSession.getState().applyTree(treeWith([{ id: 'c', path: 'Notes/C.md' }]), 0)
    p = useSession.getState().windowSlot
    expect(p?.tabs).toHaveLength(1)

    useSession.getState().applyTree(treeWith([]), 0)
    expect(useSession.getState().windowSlot).toBeNull()
    expect(windowTargetOf(useSession.getState())).toBeNull()
  })

  it('closes a Space tab once its Space is gone', async () => {
    useSession.getState().applyTree(treeWith([{ id: 'a', path: 'Notes/A.md' }], ['s1']), 0)
    useSession.getState().openWindowTab({ kind: 'page', id: 'a', path: 'Notes/A.md' })
    useSession.getState().openWindowTab({ kind: 'space', id: 's1' })
    expect(useSession.getState().windowSlot?.tabs).toHaveLength(2)

    useSession.getState().applyTree(treeWith([{ id: 'a', path: 'Notes/A.md' }]), 0)
    const p = useSession.getState().windowSlot
    expect(p?.tabs.map((t) => (t.target.kind === 'map' ? 'map' : t.target.id))).toEqual(['a'])
  })

  it('folds multiple simultaneous dead tabs: a dead active with a dead left neighbor lands on the survivor', async () => {
    useSession.getState().openWindowTab({ kind: 'page', id: 'a', path: 'Notes/A.md' })
    useSession.getState().openWindowTab({ kind: 'page', id: 'b', path: 'Notes/B.md' })
    useSession.getState().openWindowTab({ kind: 'page', id: 'c', path: 'Notes/C.md' })
    useSession.getState().openWindowTab({ kind: 'page', id: 'd', path: 'Notes/D.md' })

    // c and d (the active) die in one push — the active walks left past dead c onto b.
    hostPushes(
      treeWith([
        { id: 'a', path: 'Notes/A.md' },
        { id: 'b', path: 'Notes/B.md' },
      ]),
    )
    const p = useSession.getState().windowSlot
    expect(p?.tabs.map((t) => (t.target.kind === 'page' ? t.target.id : ''))).toEqual(['a', 'b'])
    expect(p?.tabs.find((t) => t.id === p.activeTabId)?.target).toMatchObject({ id: 'b' })
  })

  it('a Preview reconciles the remembered set against the live tree, then lands on its own tab', async () => {
    useSession.getState().applyTree(
      treeWith([
        { id: 'x', path: 'Notes/x.md' },
        { id: 'y', path: 'Notes/Renamed.md' },
      ]),
    )
    useSession.setState({
      windowsFile: {
        sets: {
          page: {
            tabs: [
              { target: { kind: 'page', id: 'x' } },
              { target: { kind: 'page', id: 'y' } },
              { target: { kind: 'page', id: 'z' } },
            ],
          },
        },
      },
    })
    useSession.getState().openWindowTab({ kind: 'page', id: 'x', path: 'Notes/x.md' })
    const p = useSession.getState().windowSlot
    // Dead z drops; y re-paths to its rename; the asked tab takes the focus, which the record never named.
    expect(p?.tabs.map((t) => (t.target.kind === 'map' ? '' : t.target.id))).toEqual(['x', 'y'])
    expect(p?.tabs[1].target).toMatchObject({ path: 'Notes/Renamed.md' })
    expect(windowTargetOf(useSession.getState())).toMatchObject({ id: 'x' })
  })

  it('keeps the nav kind alive through a reconcile: dead page tabs drop, the map tab stays', async () => {
    useSession.getState().openNav()
    useSession.getState().openWindowTab({ kind: 'page', id: 'b', path: 'Notes/B.md' })

    useSession.getState().applyTree(treeWith([]), 0)
    const p = useSession.getState().windowSlot
    expect(p?.kind).toBe('nav')
    expect(p?.tabs.map((t) => t.target.kind)).toEqual(['map'])
    expect(windowTargetOf(useSession.getState())).toBeNull()
  })
})

describe('store — a Set whose sidecar doesn’t parse keeps what belongs to its pages', () => {
  const P2: SelectTarget = { kind: 'page', id: 'p2', path: 'Notes/Ideas/Beta.md' }
  const P3: SelectTarget = { kind: 'page', id: 'p3', path: 'Notes/Ideas/Gamma.md' }
  const readable = (): NexusTree => {
    const t = makeTree()
    const ideas = t.collections[0].sets[0]
    ideas.pages = [...ideas.pages, { kind: 'page', id: 'p3', title: 'Gamma', path: P3.path }]
    return t
  }
  const withheld = (): NexusTree => {
    const t = makeTree()
    t.collections[0].sets = []
    t.unreadable = [{ path: 'Notes/Ideas', reason: 'unparsed' }]
    return t
  }

  beforeEach(() => {
    useSession.getState().resetGlance()
    useSession.getState().resetWindow()
  })

  it('corrupted mid-session: the tabs, window tabs, glance pins, and pinned tabs on its pages stay open', () => {
    seed({ tabs: [uTab('t1', P2, [P2], 0)], activeTabId: 't1', tabMru: ['t1'] })
    useSession.getState().applyTree(readable(), 0)
    useSession.getState().applyNavChanged({ pinned: [toNavRef(P3)], banner: undefined })
    useSession.getState().openWindowTab(P2 as PageTarget)
    useSession.getState().pinGlance({
      tabId: 't1',
      target: P2 as PageTarget,
      anchorX: 0,
      anchorY: 0,
      anchorHeight: 0,
      size: { w: 260, h: 120 },
    })

    useSession.getState().applyTree(withheld(), 0)
    const s = useSession.getState()
    expect(s.tabs.map((t) => t.target)).toEqual([P2])
    expect(s.pinned).toEqual([toNavRef(P3)])
    expect(s.pinnedTabs.map((t) => t.target)).toEqual([P3])
    expect(s.windowSlot?.tabs.map((t) => t.target)).toEqual([P2])
    expect(s.pinnedGlances.map((g) => g.tabId)).toEqual(['t1'])
  })

  it('already corrupt at the open: its pages’ pinned refs stay, and their tabs return when it reads', () => {
    seed({})
    useSession.getState().applyTree(withheld(), 0)
    useSession.getState().applyNavChanged({ pinned: [toNavRef(P3)], banner: undefined })
    expect(useSession.getState().pinned).toEqual([toNavRef(P3)])
    expect(useSession.getState().pinnedTabs).toEqual([])

    useSession.getState().applyTree(readable(), 0)
    expect(useSession.getState().pinnedTabs.map((t) => t.target)).toEqual([P3])
  })
})

describe('store — a file the Nexus can’t read posts a notice with Try Again', () => {
  const listing = (...unreadable: NonNullable<NexusTree['unreadable']>): NexusTree => {
    const t = makeTree()
    t.unreadable = unreadable
    return t
  }

  beforeEach(() => {
    seed({})
    useSession.getState().applyTree(listing(), 0)
    clearNotification()
  })

  it('a malformed entry posts the unreadable notice, whose Try Again retries that file', async () => {
    useSession.getState().applyTree(listing({ path: 'Notes/Foreign.md', reason: 'malformed' }), 0)
    const notice = currentNotification()
    expect(notice?.message).toBe("'Foreign' contains unreadable metadata")
    expect(notice?.action?.label).toBe('Try Again')
    await notice?.action?.run()
    await vi.waitFor(() =>
      expect(channels.mutate).toHaveBeenCalledWith({
        op: 'retryUnreadable',
        path: 'Notes/Foreign.md',
      }),
    )
  })

  it('a contradicting entry posts the invalid notice', () => {
    useSession.getState().applyTree(listing({ path: 'Notes/Task.md', reason: 'contradicting' }), 0)
    expect(currentNotification()?.message).toBe("'Task' contains invalid metadata")
    expect(currentNotification()?.action?.label).toBe('Try Again')
  })

  it('an unparsed entry posts the invalid notice', () => {
    useSession.getState().applyTree(listing({ path: 'Notes/Ideas', reason: 'unparsed' }), 0)
    expect(currentNotification()?.message).toBe("'Ideas' contains invalid metadata")
    expect(currentNotification()?.action?.label).toBe('Try Again')
  })

  it('a tree whose list didn’t change posts nothing', () => {
    useSession.getState().applyTree(listing({ path: 'Notes/Foreign.md', reason: 'malformed' }), 0)
    clearNotification()
    useSession.getState().applyTree(listing({ path: 'Notes/Foreign.md', reason: 'malformed' }), 0)
    expect(currentNotification()).toBeNull()
  })
})

describe('store — recents reorder + batched close', () => {
  const savedRecents = (): ReturnType<typeof vi.fn> => channels['nav:write']

  it('setRecentsOrder rewrites the order to the source and persists immediately (drag)', () => {
    const a = ctx('a')
    const b = ctx('b')
    const c = ctx('c')
    seed({ recents: [a, b, c] })
    useSession.getState().setRecentsOrder([b, c, a].map(navKey))
    expect(useSession.getState().recents).toEqual([b, c, a])
    expect(savedRecents()).toHaveBeenCalledWith({ recents: [b, c, a] })
  })

  it('setRecentsOrder is a no-op on the standing order and on unknown keys', () => {
    const a = ctx('a')
    const b = ctx('b')
    seed({ recents: [a, b] })
    useSession.getState().setRecentsOrder([a, b].map(navKey))
    useSession.getState().setRecentsOrder(['missing'])
    expect(useSession.getState().recents).toEqual([a, b])
    expect(savedRecents()).not.toHaveBeenCalled()
  })

  it('setRecentsOrder leaves an entry the list hides in its own slot', () => {
    const a = ctx('a')
    const hidden = ctx('hidden')
    const b = ctx('b')
    seed({ recents: [a, hidden, b] })
    useSession.getState().setRecentsOrder([b, a].map(navKey))
    expect(useSession.getState().recents).toEqual([b, hidden, a])
  })
})

describe('glance pin lifecycle wiring (Task 10)', () => {
  const P: SelectTarget = { kind: 'page', id: 'p1', path: 'Notes/A.md' }
  const Q: SelectTarget = { kind: 'page', id: 'p2', path: 'Notes/B.md' }
  const glancePin = (tabId: string, target = P): Parameters<State['pinGlance']>[0] => ({
    tabId,
    target: target as { kind: 'page'; id: string; path: string },
    anchorX: 0,
    anchorY: 0,
    anchorHeight: 0,
    size: { w: 260, h: 120 },
  })
  const tags = (): string[] => useSession.getState().pinnedGlances.map((p) => p.tabId)

  beforeEach(() => useSession.getState().resetGlance())

  it('closing a tab scrubs its pins and leaves other tabs untouched', () => {
    seed({
      tabs: [uTab('t1', P, [P], 0), uTab('t2', Q, [Q], 0)],
      activeTabId: 't1',
      tabMru: ['t1', 't2'],
    })
    useSession.getState().pinGlance(glancePin('t1'))
    useSession.getState().pinGlance(glancePin('t2', Q))
    useSession.getState().closeTab('t1')
    expect(tags()).toEqual(['t2'])
  })

  it('pinning a tab re-tags its pins to the pinned id, not scrubbing them', () => {
    seed({ tabs: [uTab('t1', P, [P], 0)], activeTabId: 't1', tabMru: ['t1'] })
    useSession.getState().pinGlance(glancePin('t1'))
    useSession.getState().pinTab('t1')
    expect(tags()).toEqual([pinTabId(P)])
  })

  it('unpinning a tab re-tags its pins to the exact fresh id it mints', () => {
    const pinId = pinTabId(P)
    seed({
      tabs: [],
      activeTabId: pinId,
      pinned: [toNavRef(P)],
      pinnedTabs: [{ id: pinId, target: P, navStack: [P], navIndex: 0 }],
    })
    useSession.getState().pinGlance(glancePin(pinId))
    useSession.getState().unpinTab(pinId)
    const freshId = useSession.getState().tabs[0].id
    expect(freshId).not.toBe(pinId)
    expect(tags()).toEqual([freshId])
  })

  it('removing a nav pin from the list scrubs that pinned tab’s glance pins, leaving others', () => {
    const pinId = pinTabId(P)
    seed({
      tabs: [uTab('t2', Q, [Q], 0)],
      activeTabId: pinId,
      pinned: [toNavRef(P)],
      pinnedTabs: [{ id: pinId, target: P, navStack: [P], navIndex: 0 }],
    })
    useSession.getState().pinGlance(glancePin(pinId))
    useSession.getState().pinGlance(glancePin('t2', Q))
    useSession.getState().unpinTarget(navKey(P))
    expect(tags()).toEqual(['t2'])
  })

  it('a pinned active tab removed by a nav push falls to the most recent tab, and the repair is saved', async () => {
    const pinId = pinTabId(P)
    const R: SelectTarget = { kind: 'page', id: 'p3', path: 'Notes/C.md' }
    seed({
      tabs: [uTab('t2', Q, [Q], 0), uTab('t3', R, [R], 0)],
      activeTabId: pinId,
      tabMru: [pinId, 't3', 't2'],
      pinned: [toNavRef(P)],
      pinnedTabs: [{ id: pinId, target: P, navStack: [P], navIndex: 0 }],
    })
    useSession.getState().applyNavChanged({ pinned: [], banner: undefined })
    expect(useSession.getState().activeTabId).toBe('t3')
    await flushAllSessionSaves()
    expect(channels['tabs:save']).toHaveBeenLastCalledWith(
      expect.objectContaining({ activeTabId: 't3' }),
    )
  })

  it('unpinning the active pinned tab from the list leaves the focus on a live tab', () => {
    const pinId = pinTabId(P)
    seed({
      tabs: [uTab('t2', Q, [Q], 0)],
      activeTabId: pinId,
      tabMru: [pinId, 't2'],
      pinned: [toNavRef(P)],
      pinnedTabs: [{ id: pinId, target: P, navStack: [P], navIndex: 0 }],
    })
    useSession.getState().unpinTarget(navKey(P))
    expect(useSession.getState().activeTabId).toBe('t2')
  })

  it('unpinning the active pinned tab keeps the focus on the tab it becomes, with no detour', () => {
    const pinId = pinTabId(P)
    seed({
      tabs: [uTab('t2', Q, [Q], 0)],
      activeTabId: pinId,
      tabMru: [pinId, 't2'],
      pinned: [toNavRef(P)],
      pinnedTabs: [{ id: pinId, target: P, navStack: [P], navIndex: 0 }],
    })
    useSession.getState().unpinTab(pinId)
    const s = useSession.getState()
    const fresh = s.tabs.find((t) => t.id !== 't2')
    expect(s.activeTabId).toBe(fresh?.id)
    expect(openPage()).not.toHaveBeenCalled()
  })

  it('adding a nav pin scrubs no existing glance pins', () => {
    seed({ tabs: [uTab('t1', P, [P], 0)], activeTabId: 't1', tabMru: ['t1'] })
    useSession.getState().pinGlance(glancePin('t1'))
    useSession.getState().pinTarget(Q)
    expect(tags()).toEqual(['t1'])
  })
})

describe('store — a pushed difference', () => {
  const two = (): NexusTree =>
    treeWith([
      { id: 'a', path: 'Notes/A.md' },
      { id: 'b', path: 'Notes/B.md' },
    ])
  const moved = (): NexusTree =>
    treeWith([
      { id: 'a', path: 'Notes/A.md' },
      { id: 'b', path: 'Notes/Moved.md' },
    ])
  const asked = (): ReturnType<typeof vi.fn> => {
    channels['nexus:state'] = vi.fn(async () => ok({ status: 'open', tree: moved(), version: 9 }))
    return channels['nexus:state']
  }

  it('with the next version applies, and keeps the identity of what it didn’t name', () => {
    useSession.getState().applyTree(two(), 3)
    const held = useSession.getState().tree
    const delta = diff(held, moved())
    if (!delta) throw new Error('no difference')
    useSession.getState().applyChange({ version: 4, delta })
    const s = useSession.getState()
    expect(s.version).toBe(4)
    expect(s.tree?.collections[0]?.pages.map((p) => p.path)).toEqual([
      'Notes/A.md',
      'Notes/Moved.md',
    ])
    expect(s.tree?.collections[0]?.pages[0]).toBe(held?.collections[0]?.pages[0])
    expect(s.tree?.config).toBe(held?.config)
  })

  it('with a gap in its version asks for the whole tree', async () => {
    const state = asked()
    useSession.getState().applyTree(two(), 3)
    const delta = diff(useSession.getState().tree, moved())
    if (!delta) throw new Error('no difference')
    useSession.getState().applyChange({ version: 5, delta })
    await vi.waitFor(() => expect(state).toHaveBeenCalled())
    await vi.waitFor(() => expect(useSession.getState().version).toBe(9))
  })

  it('that doesn’t fit the tree held asks for the whole tree', async () => {
    const state = asked()
    useSession.getState().applyTree(two(), 3)
    useSession.getState().applyChange({
      version: 4,
      delta: { at: { collections: { at: { Ghost: { at: { title: { set: 'x' } } } } } } },
    })
    await vi.waitFor(() => expect(state).toHaveBeenCalled())
  })

  it('a whole tree sent to a window in its error state makes it ready', () => {
    useSession.setState({ status: 'error', tree: null })
    useSession.getState().applyChange({ version: 1, delta: { set: two() } })
    const s = useSession.getState()
    expect(s.status).toBe('ready')
    expect(s.tree).toEqual(two())
    expect(s.version).toBe(1)
  })
})

describe('store — the mutate rail', () => {
  beforeEach(async () => {
    useSession.getState().applyTree(treeWith([]), 0)
  })

  it('a page rename lands the pending save on the old path first', async () => {
    const order: string[] = []
    channels['page:updateBody'] = vi.fn(async (path: string) => {
      order.push(`save ${path}`)
      return ok({ hash: 'h', stale: false })
    })
    channels.mutate = vi.fn(async () => {
      order.push('mutate')
      return ok({})
    })
    schedulePageSave('Notes/A.md', 'typed')
    await useSession
      .getState()
      .mutate({ op: 'rename', path: 'Notes/A.md', kind: 'page', newName: 'B' })
    expect(order).toEqual(['save Notes/A.md', 'mutate'])
  })

  it('a heading rename lands pending tile saves first', async () => {
    const order: string[] = []
    channels['tiles:writeMarkdown'] = vi.fn(async () => {
      order.push('tile')
      return ok(null)
    })
    channels.mutate = vi.fn(async () => {
      order.push('mutate')
      return ok({})
    })
    tileBodyWriter.schedule('t1', () =>
      dialer().ask('tiles:writeMarkdown', { kind: 'homepage' }, 't1', 'x', ''),
    )
    await useSession
      .getState()
      .mutate({ op: 'renameHeading', path: 'Notes/A.md', heading: 'H', to: 'K' })
    expect(order).toEqual(['tile', 'mutate'])
  })

  it('leaves a delete’s pass warning to the Deleted notice and posts a move’s', async () => {
    channels.mutate = vi.fn(async () => ok({ cascade: { pages: [], hosts: [], warning: 'W' } }))
    clearNotification()
    const deleted = await useSession
      .getState()
      .mutate({ op: 'delete', path: 'Notes/Ideas', kind: 'set' })
    expect(deleted).not.toBeNull()
    expect(currentNotification()).toBeNull()
    const moved = await useSession
      .getState()
      .mutate({ op: 'movePage', path: 'Notes/A.md', newParentPath: 'Notes/Ideas' })
    expect(moved).not.toBeNull()
    expect(currentNotification()?.message).toBe('W')
  })

  it('posts a warning that carries a retry with Try Again, which sends the retry', async () => {
    const retry = { op: 'renameSpace', spaceId: 'sp', newName: 'Pom', from: 'Pommora' } as const
    channels.mutate = vi.fn(async () =>
      ok({ cascade: { pages: [], hosts: [], warning: 'W' }, retry }),
    )
    clearNotification()
    await useSession.getState().mutate({ op: 'renameSpace', spaceId: 'sp', newName: 'Pom' })
    const note = currentNotification()
    expect(note?.message).toBe('W')
    expect(note?.action?.label).toBe('Try Again')
    channels.mutate = vi.fn(async () => ok({}))
    await note?.action?.run()
    await vi.waitFor(() => expect(channels.mutate).toHaveBeenCalledWith(retry))
  })
})

describe('store — a Nexus switch lands every owed save first', () => {
  it('writes the page, tile, and tab saves before asking to switch', async () => {
    const order: string[] = []
    const record = (what: string, value: unknown) =>
      vi.fn(async () => {
        order.push(what)
        return ok(value)
      })
    channels['page:updateBody'] = record('page', { hash: 'h', stale: false })
    channels['tiles:writeMarkdown'] = record('tile', null)
    channels['tabs:save'] = record('tabs', null)
    channels['nexus:choose'] = record('choose', false)
    channels['matrixLayout:save'] = vi.fn(async () => ok(null))
    schedulePageSave('Notes/A.md', 'typed')
    tileBodyWriter.schedule('t1', () =>
      dialer().ask('tiles:writeMarkdown', { kind: 'homepage' }, 't1', 'x', ''),
    )
    scheduleTabsSave({ tabs: [], activeTabId: '' } as unknown as StoredTabSet)
    await useSession.getState().choose()
    expect(order.slice(0, 3).sort()).toEqual(['page', 'tabs', 'tile'])
    expect(order[3]).toBe('choose')
  })

  it('holds a save made while the switch is in flight, cancelling it on a switch and landing it on a cancel', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    onTestFinished(() => {
      vi.useRealTimers()
    })
    const tabs = vi.fn(async () => ok(null))
    channels['tabs:save'] = tabs
    channels['nexus:state'] = vi.fn(async () => ok({ status: 'empty' }))
    for (const switched of [true, false]) {
      tabs.mockClear()
      channels['nexus:choose'] = vi.fn(async () => {
        scheduleTabsSave({ tabs: [], activeTabId: '' } as unknown as StoredTabSet)
        await vi.advanceTimersByTimeAsync(1000)
        expect(tabs).not.toHaveBeenCalled()
        return ok(switched)
      })
      await useSession.getState().choose()
      await vi.advanceTimersByTimeAsync(0)
      expect(tabs).toHaveBeenCalledTimes(switched ? 0 : 1)
    }
  })

  it('drops a page move whose flush waited out a switch, since its path named the Nexus it left', async () => {
    const mutate = vi.fn(async () => ok({}))
    channels.mutate = mutate
    channels['page:updateBody'] = vi.fn(async () => ok({ hash: 'h', stale: false }))
    channels['nexus:state'] = vi.fn(async () => ok({ status: 'empty' }))
    useSession.setState({ tree: makeTree() })
    let moved: Promise<unknown> = Promise.resolve(true)
    channels['nexus:choose'] = vi.fn(async () => {
      schedulePageSave('Notes/A.md', 'typed')
      moved = useSession
        .getState()
        .mutate({ op: 'movePage', path: 'Notes/A.md', newParentPath: 'Notes/Ideas' })
      return ok(true)
    })
    await useSession.getState().choose()
    expect(await moved).toBeNull()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('closes every rename field and picker the old Nexus left open', async () => {
    channels['nexus:choose'] = vi.fn(async () => ok(true))
    channels['nexus:state'] = vi.fn(async () => ok({ status: 'empty' }))
    const s = useSession.getState()
    s.beginRename('Notes', false, 'sidebar')
    s.beginIcon('Notes', 'sidebar')
    s.beginColor('Notes', 'sidebar')
    s.beginPropertyRename({ collectionPath: 'Notes', propertyId: 'prop_status' })
    await s.choose()
    expect(useSession.getState()).toMatchObject({
      renamingPath: null,
      iconPath: null,
      iconHost: null,
      colorPath: null,
      colorHost: null,
      renamingProperty: null,
    })
  })
})

describe('store — the headings map (Task 2.3)', () => {
  it('a full load replaces the map; a partial load keeps unrelated keys', async () => {
    channels['index:headings'] = vi.fn(async () => ({
      ok: true,
      value: { 'Notes/A.md': ['setup'] },
    }))
    await useSession.getState().loadHeadings()
    expect(useSession.getState().headings).toEqual({ 'Notes/A.md': ['setup'] })

    channels['index:headings'] = vi.fn(async () => ({
      ok: true,
      value: { 'Notes/B.md': ['intro'] },
    }))
    await useSession.getState().loadHeadings(['Notes/B.md'])
    expect(useSession.getState().headings).toEqual({
      'Notes/A.md': ['setup'],
      'Notes/B.md': ['intro'],
    })

    channels['index:headings'] = vi.fn(async () => ({ ok: true, value: { 'Notes/C.md': ['x'] } }))
    await useSession.getState().loadHeadings()
    expect(useSession.getState().headings).toEqual({ 'Notes/C.md': ['x'] })
  })
})

describe('store — pending travel', () => {
  it('a heading handed to select parks a travel for the tab; clearPendingTravel nulls it', async () => {
    await useSession
      .getState()
      .select({ kind: 'page', id: 'a', path: 'Notes/A.md' }, { record: false, heading: 'Setup' })
    expect(useSession.getState().pendingTravel).toEqual({
      route: 'tab',
      tabId: useSession.getState().activeTabId,
      path: 'Notes/A.md',
      heading: 'Setup',
    })
    useSession.getState().clearPendingTravel()
    expect(useSession.getState().pendingTravel).toBeNull()
  })

  it('a heading handed to openWindowTab parks it for the window', () => {
    useSession
      .getState()
      .openWindowTab({ kind: 'page', id: 'a', path: 'Notes/A.md' }, { heading: 'Setup' })
    expect(useSession.getState().pendingTravel).toEqual({
      route: 'window',
      path: 'Notes/A.md',
      heading: 'Setup',
    })
  })
})

describe('store — view search', () => {
  const col = (id: string): SelectTarget => ({ kind: 'collection', id })
  const onContainer = (search: State['viewSearch'] = {}): void =>
    seed({
      tabs: [uTab('t1', col('c1'), [col('c1')], 0), uTab('t2', ctx('b'), [ctx('b')], 0)],
      activeTabId: 't1',
      tabMru: ['t1', 't2'],
      selection: col('c1'),
      viewSearch: search,
    })

  it('opens on a container and refuses anything else', () => {
    seed({
      tabs: [uTab('t1', ctx('a'), [ctx('a')], 0)],
      activeTabId: 't1',
      selection: ctx('a'),
      viewSearch: {},
    })
    expect(useSession.getState().searchView('t1')).toBe(false)
    expect(useSession.getState().viewSearch).toEqual({})
    onContainer()
    expect(useSession.getState().searchView('t1')).toBe(true)
    expect(useSession.getState().viewSearch).toEqual({
      t1: { key: 'collection:c1', query: '', summon: 1 },
    })
  })

  it('a second summon keeps the query and raises the summon', () => {
    onContainer()
    useSession.getState().searchView('t1')
    useSession.getState().setViewQuery('t1', 'ab')
    const before = useSession.getState().viewSearch.t1?.summon ?? 0
    useSession.getState().searchView('t1')
    expect(useSession.getState().viewSearch.t1?.query).toBe('ab')
    expect(useSession.getState().viewSearch.t1?.summon).toBe(before + 1)
  })

  it('a null query ends it', () => {
    onContainer({ t1: { key: 'collection:c1', query: 'ab', summon: 0 } })
    useSession.getState().setViewQuery('t1', null)
    expect(useSession.getState().viewSearch).toEqual({})
  })

  it('survives a tab switch and clears when its tab shows something else', async () => {
    onContainer({ t1: { key: 'collection:c1', query: 'ab', summon: 0 } })
    useSession.getState().activateTab('t2')
    useSession.getState().activateTab('t1')
    expect(useSession.getState().viewSearch.t1?.query).toBe('ab')
    await useSession.getState().select(ctx('z'), { newTab: false })
    expect(useSession.getState().viewSearch).toEqual({})
  })

  it('opens on a pinned container under its pinned id', () => {
    const pinId = pinTabId(col('c1'))
    seed({
      tabs: [],
      activeTabId: pinId,
      pinned: [toNavRef(col('c1'))],
      pinnedTabs: [{ id: pinId, target: col('c1'), navStack: [col('c1')], navIndex: 0 }],
      selection: col('c1'),
      viewSearch: {},
    })
    expect(useSession.getState().searchView(pinId)).toBe(true)
    expect(useSession.getState().viewSearch).toEqual({
      [pinId]: { key: 'collection:c1', query: '', summon: 1 },
    })
  })

  it('follows its tab to the pinned id when the tab is pinned', () => {
    onContainer({ t1: { key: 'collection:c1', query: 'ab', summon: 0 } })
    useSession.getState().pinTab('t1')
    expect(useSession.getState().viewSearch).toEqual({
      [pinTabId(col('c1'))]: { key: 'collection:c1', query: 'ab', summon: 0 },
    })
  })

  it('follows its tab to the exact fresh id an unpin mints', () => {
    const pinId = pinTabId(col('c1'))
    seed({
      tabs: [],
      activeTabId: pinId,
      pinned: [toNavRef(col('c1'))],
      pinnedTabs: [{ id: pinId, target: col('c1'), navStack: [col('c1')], navIndex: 0 }],
      selection: col('c1'),
      viewSearch: { [pinId]: { key: 'collection:c1', query: 'ab', summon: 0 } },
    })
    useSession.getState().unpinTab(pinId)
    const freshId = useSession.getState().tabs[0].id
    expect(freshId).not.toBe(pinId)
    expect(useSession.getState().viewSearch).toEqual({
      [freshId]: { key: 'collection:c1', query: 'ab', summon: 0 },
    })
  })

  it('a cold switch to an unloaded page refuses a search on the page tab, and the held container writes to its own tab', () => {
    channels['page:open'] = vi.fn(() => new Promise(() => {}))
    const page: SelectTarget = { kind: 'page', id: 'p9', path: 'Notes/Z.md' }
    seed({
      tabs: [uTab('t1', col('c1'), [col('c1')], 0), uTab('t2', page, [page], 0)],
      activeTabId: 't1',
      tabMru: ['t1', 't2'],
      selection: col('c1'),
      viewSearch: { t1: { key: 'collection:c1', query: 'ab', summon: 0 } },
    })
    useSession.getState().activateTab('t2')
    expect(useSession.getState().selection).toEqual(col('c1'))
    expect(useSession.getState().searchView('t2')).toBe(false)
    useSession.getState().setViewQuery('t1', 'abc')
    expect(useSession.getState().viewSearch).toEqual({
      t1: { key: 'collection:c1', query: 'abc', summon: 0 },
    })
  })

  it('clears with its tab', () => {
    onContainer({ t1: { key: 'collection:c1', query: 'ab', summon: 0 } })
    useSession.getState().closeTab('t1')
    expect(useSession.getState().viewSearch).toEqual({})
  })

  it('an empty search closes once its tab is left', () => {
    onContainer()
    useSession.getState().searchView('t1')
    useSession.getState().activateTab('t2')
    expect(useSession.getState().viewSearch).toEqual({})
  })

  it('clears with its pinned tab when the pin is removed', () => {
    const pinId = pinTabId(col('c1'))
    seed({
      tabs: [uTab('t2', ctx('b'), [ctx('b')], 0)],
      activeTabId: 't2',
      pinned: [toNavRef(col('c1'))],
      pinnedTabs: [{ id: pinId, target: col('c1'), navStack: [col('c1')], navIndex: 0 }],
      selection: ctx('b'),
      viewSearch: { [pinId]: { key: 'collection:c1', query: 'ab', summon: 0 } },
    })
    useSession.getState().unpinTarget(navKey(col('c1')))
    expect(useSession.getState().viewSearch).toEqual({})
  })
})
