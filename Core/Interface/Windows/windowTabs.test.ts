// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import { type SelectTarget, windowTargetOf, useSession } from '../../Session/store'
import { captureWindowCache, clearWindowCache, readWindowCache } from './windowCache'
import { stubDialer } from '../../vitest.setup'

const page = (id: string) => ({ kind: 'page' as const, id, path: `Notes/${id}.md` })
const space = (id: string) => ({ kind: 'space' as const, id })
const ids = (s = useSession.getState()): string[] =>
  (s.pageWindow?.tabs ?? []).map((t) => (t.target.kind === 'navwindow' ? 'map' : t.target.id))

// Restore hydrates bare refs against the live tree, so the fixture carries one holding x/y/z/n and two Spaces.
const tree = {
  nexus: { name: 'T' },
  contexts: [
    {
      def: { id: 'ctx', title: 'Areas' },
      spaces: ['s1', 's2'].map((id) => ({
        kind: 'space',
        id,
        title: id,
        path: `Areas/${id}`,
        contextId: 'ctx',
      })),
    },
  ],
  collections: [
    {
      kind: 'collection',
      id: 'col',
      title: 'Notes',
      path: 'Notes',
      pages: ['x', 'y', 'z', 'n'].map((id) => ({
        kind: 'page',
        id,
        title: id,
        path: `Notes/${id}.md`,
      })),
      sets: [],
    },
  ],
  personalization: {},
} as unknown as NexusTree

beforeEach(() => {
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({})
  clearWindowCache()
  useSession.setState({
    pageWindow: null,
    navOpen: false,
    tree,
    windowsFile: { navSet: null, pageSet: null, open: null },
  })
})

describe('windowTabs — the tab model (B-2/B-3)', () => {
  it('a first Preview opens a single-tab window; a Preview of the active tab is a no-op', () => {
    useSession.getState().openWindowTab(page('x'))
    const p1 = useSession.getState().pageWindow
    expect(p1?.tabs.map((t) => t.target)).toEqual([{ kind: 'page', id: 'x', path: 'Notes/x.md' }])
    useSession.getState().openWindowTab(page('x'))
    expect(useSession.getState().pageWindow).toBe(p1)
  })

  it('a Preview while a window stands ADDS a tab and leaves the warm cache alone', () => {
    useSession.getState().openWindowTab(page('x'))
    const xTab = useSession.getState().pageWindow!.tabs[0]
    captureWindowCache(xTab.id, { scrollTop: 7 })
    useSession.getState().openWindowTab(page('z'))
    expect(ids()).toEqual(['x', 'z'])
    expect(windowTargetOf(useSession.getState())).toMatchObject({ id: 'z' })
    expect(readWindowCache(xTab.id)?.scrollTop).toBe(7)
  })

  it('a Space Preview opens a Space tab, deduped by id like a page', () => {
    useSession.getState().openWindowTab(space('s1'))
    useSession.getState().openWindowTab(space('s2'))
    useSession.getState().openWindowTab(space('s1'))
    expect(ids()).toEqual(['s1', 's2'])
    expect(windowTargetOf(useSession.getState())).toEqual({ kind: 'space', id: 's1' })
  })

  it('a wiki-click adds a deduped tab and focuses on re-click', () => {
    useSession.getState().openWindowTab(page('x'))
    useSession.getState().openWindowTab(page('y'))
    expect(useSession.getState().pageWindow?.tabs).toHaveLength(2)
    useSession.getState().activateWindowTab(useSession.getState().pageWindow!.tabs[0].id)
    useSession.getState().openWindowTab(page('y'))
    const p = useSession.getState().pageWindow!
    expect(p.tabs).toHaveLength(2)
    expect(p.tabs.find((t) => t.id === p.activeTabId)?.target).toMatchObject({ id: 'y' })
  })

  it('never touches app tabs/selection', () => {
    const { tabs, activeTabId, selection } = useSession.getState()
    useSession.getState().openWindowTab(page('x'))
    useSession.getState().openWindowTab(page('y'))
    const s = useSession.getState()
    expect(s.tabs).toBe(tabs)
    expect(s.activeTabId).toBe(activeTabId)
    expect(s.selection).toBe(selection)
  })

  it('closing a non-active tab keeps the active one; closing the ACTIVE tab falls left', () => {
    useSession.getState().openWindowTab(page('x'))
    useSession.getState().openWindowTab(page('y'))
    useSession.getState().openWindowTab(page('z'))
    const p = useSession.getState().pageWindow!
    useSession.getState().closeWindowTab(p.tabs[1].id)
    expect(ids()).toEqual(['x', 'z'])
    expect(windowTargetOf(useSession.getState())).toMatchObject({ id: 'z' })
    useSession.getState().closeWindowTab(useSession.getState().pageWindow!.tabs[1].id)
    const p2 = useSession.getState().pageWindow!
    expect(p2.activeTabId).toBe(p2.tabs[0].id)
  })
})

describe('windowTabs — the one durable page set (B-4)', () => {
  it('closing the last tab kills the window and writes the set empty', () => {
    useSession.getState().openWindowTab(page('x'))
    useSession.getState().openWindowTab(page('y'))
    const p = useSession.getState().pageWindow!
    useSession.getState().closeWindowTab(p.tabs[0].id)
    expect(useSession.getState().windowsFile.pageSet?.tabs).toEqual([
      { target: { kind: 'page', id: 'y' } },
    ])
    useSession.getState().closeWindowTab(useSession.getState().pageWindow!.tabs[0].id)
    expect(useSession.getState().pageWindow).toBeNull()
    expect(useSession.getState().windowsFile.pageSet).toBeNull()
    useSession.getState().openWindowTab(page('x'))
    expect(ids()).toEqual(['x'])
  })

  it('the X keeps the set; the next Preview restores it beneath the asked tab', () => {
    useSession.getState().openWindowTab(page('x'))
    useSession.getState().openWindowTab(page('y'))
    useSession.getState().closeWindow()
    expect(useSession.getState().windowsFile.pageSet?.tabs).toHaveLength(2)
    expect(useSession.getState().windowsFile.open).toBeNull()

    useSession.getState().openWindowTab(page('z'))
    expect(ids()).toEqual(['x', 'y', 'z'])
    expect(windowTargetOf(useSession.getState())).toMatchObject({ id: 'z' })
    expect(useSession.getState().windowsFile.open).toEqual({ kind: 'page' })
  })

  it('a restore lands on the ASKED tab, whatever the record last showed', () => {
    useSession.setState({
      windowsFile: {
        navSet: null,
        pageSet: {
          tabs: [{ target: { kind: 'page', id: 'x' } }, { target: { kind: 'page', id: 'y' } }],
        },
        open: null,
      },
    })
    useSession.getState().openWindowTab(page('x'))
    expect(ids()).toEqual(['x', 'y'])
    expect(windowTargetOf(useSession.getState())).toMatchObject({ id: 'x', path: 'Notes/x.md' })
  })

  it('a stored Space ref restores as a Space tab; a dead ref drops', () => {
    useSession.setState({
      windowsFile: {
        navSet: null,
        pageSet: {
          tabs: [
            { target: { kind: 'space', id: 's1' } },
            { target: { kind: 'space', id: 'gone' } },
          ],
        },
        open: null,
      },
    })
    useSession.getState().openWindowTab(page('x'))
    expect(ids()).toEqual(['s1', 'x'])
  })

  it('drag-reorder moves a tab and the mirrored record keeps the new order', () => {
    useSession.getState().openWindowTab(page('x'))
    useSession.getState().openWindowTab(page('y'))
    useSession.getState().openWindowTab(page('z'))
    const p = useSession.getState().pageWindow!
    useSession.getState().reorderWindowTabs(p.tabs[2].id, p.tabs[0].id)
    expect(ids()).toEqual(['z', 'x', 'y'])
    expect(useSession.getState().windowsFile.pageSet?.tabs.map((t) => t.target)).toMatchObject([
      { id: 'z' },
      { id: 'x' },
      { id: 'y' },
    ])
  })

  it('the map sentinel neither moves nor gets landed on', () => {
    useSession.setState({
      windowsFile: {
        navSet: { tabs: [{ target: { kind: 'page', id: 'x' } }] },
        pageSet: null,
        open: null,
      },
    })
    useSession.getState().openNavWindow()
    const p = useSession.getState().pageWindow!
    expect(p.tabs[0].target.kind).toBe('navwindow')
    useSession.getState().reorderWindowTabs(p.tabs[0].id, p.tabs[1].id)
    expect(useSession.getState().pageWindow).toBe(p)
    useSession.getState().reorderWindowTabs(p.tabs[1].id, p.tabs[0].id)
    expect(useSession.getState().pageWindow).toBe(p)
  })
})

describe('windowTabs — the nav kind (B-3)', () => {
  it('a Preview while the NavWindow stands lands as a NavWindow tab', () => {
    useSession.getState().openNav()
    useSession.getState().openWindowTab(page('x'))
    const p = useSession.getState().pageWindow!
    expect(p.kind).toBe('nav')
    expect(useSession.getState().navOpen).toBe(true)
    expect(ids()).toEqual(['map', 'x'])
    const file = useSession.getState().windowsFile
    expect(file.navSet?.tabs).toEqual([{ target: { kind: 'page', id: 'x' } }])
    expect(file.pageSet).toBeNull()
    expect(file.open).toEqual({ kind: 'nav' })
  })

  it('the map sentinel tab refuses to close; tabs around it close normally', () => {
    useSession.getState().openNavWindow()
    useSession.getState().openWindowTab(page('x'))
    const p = useSession.getState().pageWindow!
    const mapId = p.tabs[0].id
    useSession.getState().closeWindowTab(mapId)
    expect(useSession.getState().pageWindow).toBe(p)
    useSession.getState().closeWindowTab(p.tabs[1].id)
    expect(ids()).toEqual(['map'])
  })

  it('an indexed open splices among the tabs, past the map sentinel, without activating', () => {
    useSession.getState().openNavWindow()
    useSession.getState().openWindowTab(page('x'))
    useSession.getState().openWindowTab(page('y'))
    useSession.getState().openWindowTab(page('z'), 1)
    expect(ids()).toEqual(['map', 'x', 'z', 'y'])
    expect(windowTargetOf(useSession.getState())).toMatchObject({ id: 'y' })
  })

  it('an indexed open of a tab already there moves it, keeping the active tab', () => {
    useSession.getState().openNavWindow()
    useSession.getState().openWindowTab(page('x'))
    useSession.getState().openWindowTab(page('y'))
    useSession.getState().openWindowTab(page('x'), 2)
    expect(ids()).toEqual(['map', 'y', 'x'])
    expect(windowTargetOf(useSession.getState())).toMatchObject({ id: 'y' })
  })

  it('openNav seeds the nav kind with the remembered set; closeNav keeps it durable', () => {
    useSession.setState({
      windowsFile: {
        navSet: { tabs: [{ target: { kind: 'page', id: 'n' } }] },
        pageSet: null,
        open: null,
      },
    })
    useSession.getState().openNav()
    const p = useSession.getState().pageWindow!
    expect(useSession.getState().navOpen).toBe(true)
    expect(p.kind).toBe('nav')
    expect(ids()).toEqual(['map', 'n'])
    expect(p.activeTabId).toBe(p.tabs[0].id)

    useSession.getState().closeNav()
    expect(useSession.getState().pageWindow).toBeNull()
    expect(useSession.getState().navOpen).toBe(false)
    expect(useSession.getState().windowsFile.navSet?.tabs).toEqual([
      { target: { kind: 'page', id: 'n' } },
    ])
  })
})

describe('windowTabs — warmth (B-8)', () => {
  it('round-trips per tab id; a tab close evicts its entry; the window close clears all', () => {
    useSession.getState().openWindowTab(page('x'))
    useSession.getState().openWindowTab(page('y'))
    const [xTab, yTab] = useSession.getState().pageWindow!.tabs
    captureWindowCache(xTab.id, { editorState: { doc: 'X' }, scrollTop: 5 })
    captureWindowCache(yTab.id, { editorState: { doc: 'Y' }, scrollTop: 9 })
    expect(readWindowCache(xTab.id)?.scrollTop).toBe(5)

    useSession.getState().closeWindowTab(yTab.id)
    expect(readWindowCache(yTab.id)).toBeUndefined()
    expect(readWindowCache(xTab.id)?.scrollTop).toBe(5)

    useSession.getState().closeWindow()
    expect(readWindowCache(xTab.id)).toBeUndefined()
  })

  it('an overtake clears prior warmth — the entry is seeded after the Matrix stands', () => {
    useSession.getState().openMatrixWindow()
    captureWindowCache('stale', { scrollTop: 7 })
    useSession.getState().openWindowTab(page('z'))
    expect(readWindowCache('stale')).toBeUndefined()
  })
})

describe('windowTabs — the Matrix kind entry', () => {
  it('the mirror names the open Matrix window and keeps no set for it', () => {
    useSession.getState().openMatrixWindow()
    const file = useSession.getState().windowsFile
    expect(useSession.getState().pageWindow?.kind).toBe('matrix')
    expect(file.open).toEqual({ kind: 'matrix' })
    expect(file.pageSet).toBeNull()
    expect(file.navSet).toBeNull()
  })
})

describe('windowTabs — the engulf exit flag', () => {
  it("a promote's engulf flag never leaks onto the next window's close", () => {
    useSession.getState().openWindowTab(page('x'))
    useSession.getState().closeWindow('engulf')
    expect(useSession.getState().windowExit).toBe('engulf')
    useSession.getState().openWindowTab(page('y'))
    expect(useSession.getState().windowExit).toBe('dismiss')
  })
})

describe('windowTabs — the slide stamp', () => {
  it('stamps fwd on spawn, direction by strip order on activate, monotonic seq', () => {
    useSession.getState().openWindowTab(page('x'))
    useSession.getState().openWindowTab(page('y'))
    const s1 = useSession.getState().windowSlide!
    expect(s1.dir).toBe('fwd')
    const p = useSession.getState().pageWindow!
    useSession.getState().activateWindowTab(p.tabs[0].id)
    const s2 = useSession.getState().windowSlide!
    expect(s2.dir).toBe('back')
    expect(s2.seq).toBeGreaterThan(s1.seq)
    useSession.getState().activateWindowTab(p.tabs[1].id)
    expect(useSession.getState().windowSlide!.dir).toBe('fwd')
  })
})

const makeSelect = () =>
  vi.fn((_t: SelectTarget, _o?: { record?: boolean; newTab?: boolean }) => Promise.resolve())

describe('windowTabs — promote (C-8)', () => {
  const realSelect = useSession.getState().select
  let select = makeSelect()
  beforeEach(() => {
    select = makeSelect()
    useSession.setState({ select })
  })
  afterEach(() => useSession.setState({ select: realSelect }))

  it('lifts one tab into the main pane and leaves the window standing', () => {
    useSession.getState().openWindowTab(page('x'))
    useSession.getState().openWindowTab(page('y'))
    const first = useSession.getState().pageWindow!.tabs[0]
    useSession.getState().promoteWindowTab(first.id)
    expect(ids()).toEqual(['y'])
    expect(select).toHaveBeenCalledWith({ kind: 'page', id: 'x', path: 'Notes/x.md' }, undefined)
    expect(useSession.getState().windowExit).toBe('dismiss')
  })

  it('promoting the last tab closes the window on the engulf, and a new-tab promote asks for one', () => {
    useSession.getState().openWindowTab(space('s1'))
    useSession.getState().promoteWindowTab(useSession.getState().pageWindow!.tabs[0].id, true)
    expect(useSession.getState().pageWindow).toBeNull()
    expect(useSession.getState().windowExit).toBe('engulf')
    expect(select).toHaveBeenCalledWith({ kind: 'space', id: 's1' }, { newTab: true })
  })
})
