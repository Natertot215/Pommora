// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { NexusTree } from '@shared/types'
import { windowTargetOf, useSession } from '../store'
import { captureWindowCache, clearWindowCache, readWindowCache } from './windowCache'

const page = (id: string) => ({ id, path: `Notes/${id}.md` })

// Restore hydrates bare refs against the live tree, so the fixtures carry one holding x/y/z.
const tree = {
  nexus: { name: 'T' },
  contexts: [],
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
  clearWindowCache()
  useSession.setState({
    pageWindow: null,
    navOpen: false,
    tree,
    windowsFile: { navSet: null, origins: {}, open: null },
  })
})

describe('windowTabs — the tab model (H-1/H-5/H-6/H-7)', () => {
  it('summon opens a single-tab window; re-summon of the same origin is a no-op (I-1)', () => {
    useSession.getState().openWindow(page('x'))
    const p1 = useSession.getState().pageWindow
    expect(p1?.tabs.map((t) => t.target)).toEqual([{ kind: 'page', id: 'x', path: 'Notes/x.md' }])
    useSession.getState().openWindow(page('x'))
    expect(useSession.getState().pageWindow).toBe(p1)
  })

  it('a wiki-click adds a deduped tab and focuses on re-click (H-1)', () => {
    useSession.getState().openWindow(page('x'))
    useSession.getState().openWindowTab(page('y'))
    expect(useSession.getState().pageWindow?.tabs).toHaveLength(2)
    useSession.getState().activateWindowTab(useSession.getState().pageWindow!.tabs[0].id)
    useSession.getState().openWindowTab(page('y'))
    const p = useSession.getState().pageWindow!
    expect(p.tabs).toHaveLength(2)
    expect(p.tabs.find((t) => t.id === p.activeTabId)?.target).toMatchObject({ id: 'y' })
  })

  it('closing the origin re-parents to the left-most survivor; last close kills the window (H-6)', () => {
    useSession.getState().openWindow(page('x'))
    useSession.getState().openWindowTab(page('y'))
    const p = useSession.getState().pageWindow!
    useSession.getState().closeWindowTab(p.tabs[0].id)
    const p2 = useSession.getState().pageWindow!
    expect(p2.originId).toBe('y')
    useSession.getState().closeWindowTab(p2.tabs[0].id)
    expect(useSession.getState().pageWindow).toBeNull()
  })

  it('a new summon overtakes — swaps to the new origin single-tab set (D-2)', () => {
    useSession.getState().openWindow(page('x'))
    useSession.getState().openWindowTab(page('y'))
    useSession.getState().openWindow(page('z'))
    const p = useSession.getState().pageWindow!
    expect(p.originId).toBe('z')
    expect(p.tabs).toHaveLength(1)
  })

  it('never touches app tabs/selection (D-1)', () => {
    const { tabs, activeTabId, selection } = useSession.getState()
    useSession.getState().openWindow(page('x'))
    useSession.getState().openWindowTab(page('y'))
    const s = useSession.getState()
    expect(s.tabs).toBe(tabs)
    expect(s.activeTabId).toBe(activeTabId)
    expect(s.selection).toBe(selection)
  })

  it('closing a non-active, non-origin tab keeps origin and active untouched', () => {
    useSession.getState().openWindow(page('x'))
    useSession.getState().openWindowTab(page('y'))
    useSession.getState().openWindowTab(page('z'))
    const p = useSession.getState().pageWindow!
    const yId = p.tabs[1].id
    useSession.getState().activateWindowTab(p.tabs[2].id)
    useSession.getState().closeWindowTab(yId)
    const p2 = useSession.getState().pageWindow!
    expect(p2.originId).toBe('x')
    expect(p2.tabs.map((t) => (t.target.kind === 'page' ? t.target.id : ''))).toEqual(['x', 'z'])
    expect(p2.tabs.find((t) => t.id === p2.activeTabId)?.target).toMatchObject({ id: 'z' })
  })

  it('closing the ACTIVE tab falls to its left neighbor', () => {
    useSession.getState().openWindow(page('x'))
    useSession.getState().openWindowTab(page('y'))
    const p = useSession.getState().pageWindow!
    useSession.getState().closeWindowTab(p.tabs[1].id)
    const p2 = useSession.getState().pageWindow!
    expect(p2.tabs).toHaveLength(1)
    expect(p2.activeTabId).toBe(p2.tabs[0].id)
  })
})

describe('windowTabs — durable sets (H-3/H-6/H-10)', () => {
  it("a summon restores the origin's remembered set; the active pointer survives", () => {
    useSession.setState({
      windowsFile: {
        navSet: null,
        origins: {
          x: {
            tabs: [{ target: { kind: 'page', id: 'x' } }, { target: { kind: 'page', id: 'y' } }],
            activeIndex: 1,
          },
        },
        open: null,
      },
    })
    useSession.getState().openWindow(page('x'))
    const p = useSession.getState().pageWindow!
    expect(p.tabs.map((t) => (t.target.kind === 'page' ? t.target.id : ''))).toEqual(['x', 'y'])
    expect(p.tabs.find((t) => t.id === p.activeTabId)?.target).toMatchObject({ id: 'y' })
    expect(windowTargetOf(useSession.getState())).toMatchObject({ id: 'y', path: 'Notes/y.md' })
  })

  it('drag-reorder moves a page tab and the mirrored record keeps the new order (H-3)', () => {
    useSession.getState().openWindow(page('x'))
    useSession.getState().openWindowTab(page('y'))
    useSession.getState().openWindowTab(page('z'))
    const p = useSession.getState().pageWindow!
    useSession.getState().reorderWindowTabs(p.tabs[2].id, p.tabs[0].id)
    const next = useSession.getState().pageWindow!
    expect(next.tabs.map((t) => (t.target.kind === 'page' ? t.target.id : '?'))).toEqual([
      'z',
      'x',
      'y',
    ])
    expect(useSession.getState().windowsFile.origins.x?.tabs.map((t) => t.target)).toMatchObject([
      { id: 'z' },
      { id: 'x' },
      { id: 'y' },
    ])
  })

  it('the map sentinel neither moves nor gets landed on (H-2)', () => {
    useSession.setState({
      windowsFile: {
        navSet: {
          tabs: [{ target: { kind: 'page', id: 'x' } }],
          activeIndex: 0,
        },
        origins: {},
        open: null,
      },
    })
    useSession.getState().openNavWindow()
    const p = useSession.getState().pageWindow!
    expect(p.tabs[0].target.kind).toBe('navwindow')
    useSession.getState().reorderWindowTabs(p.tabs[0].id, p.tabs[1].id) // move the map → refused
    expect(useSession.getState().pageWindow).toBe(p)
    useSession.getState().reorderWindowTabs(p.tabs[1].id, p.tabs[0].id) // land on the map → refused
    expect(useSession.getState().pageWindow).toBe(p)
  })

  it('a re-parent re-keys the record: the old origin retires, the survivor keys the set (H-6)', () => {
    useSession.getState().openWindow(page('x'))
    useSession.getState().openWindowTab(page('y'))
    const p = useSession.getState().pageWindow!
    useSession.getState().closeWindowTab(p.tabs[0].id)
    const file = useSession.getState().windowsFile
    expect(file.origins.x).toBeUndefined()
    expect(file.origins.y?.tabs).toEqual([{ target: { kind: 'page', id: 'y' } }])
    expect(file.open).toEqual({ flavor: 'page', originId: 'y' })
  })

  it('closing the last tab retires the set — a re-summon starts fresh; the X keeps it (H-3)', () => {
    useSession.getState().openWindow(page('x'))
    useSession.getState().openWindowTab(page('y'))
    useSession.getState().closeWindow() // X: the set stays remembered, open clears
    let file = useSession.getState().windowsFile
    expect(file.origins.x?.tabs).toHaveLength(2)
    expect(file.open).toBeNull()

    useSession.getState().openWindow(page('x'))
    const p = useSession.getState().pageWindow!
    expect(p.tabs).toHaveLength(2)
    useSession.getState().closeWindowTab(p.tabs[1].id)
    useSession.getState().closeWindowTab(useSession.getState().pageWindow!.tabs[0].id)
    file = useSession.getState().windowsFile
    expect(useSession.getState().pageWindow).toBeNull()
    expect(file.origins.x).toBeUndefined() // emptied → retired
    useSession.getState().openWindow(page('x'))
    expect(useSession.getState().pageWindow?.tabs).toHaveLength(1)
  })
})

describe('windowTabs — the nav flavor (H-2)', () => {
  it('the map sentinel tab refuses to close; page tabs around it close normally', () => {
    useSession.getState().openNavWindow()
    useSession.getState().openWindowTab(page('x'))
    const p = useSession.getState().pageWindow!
    expect(p.flavor).toBe('nav')
    const mapId = p.tabs[0].id
    useSession.getState().closeWindowTab(mapId)
    expect(useSession.getState().pageWindow).toBe(p)
    useSession.getState().closeWindowTab(p.tabs[1].id)
    const p2 = useSession.getState().pageWindow!
    expect(p2.tabs.map((t) => t.target.kind)).toEqual(['navwindow'])
  })
})

describe('windowTabs — warmth (H-8)', () => {
  it('round-trips per tab id; a tab close evicts its entry; the window close clears all', () => {
    useSession.getState().openWindow(page('x'))
    useSession.getState().openWindowTab(page('y'))
    const p = useSession.getState().pageWindow!
    const [xTab, yTab] = p.tabs
    captureWindowCache(xTab.id, { editorState: { doc: 'X' }, scrollTop: 5 })
    captureWindowCache(yTab.id, { editorState: { doc: 'Y' }, scrollTop: 9 })
    expect(readWindowCache(xTab.id)?.scrollTop).toBe(5)

    useSession.getState().closeWindowTab(yTab.id)
    expect(readWindowCache(yTab.id)).toBeUndefined()
    expect(readWindowCache(xTab.id)?.scrollTop).toBe(5)

    useSession.getState().closeWindow()
    expect(readWindowCache(xTab.id)).toBeUndefined()
  })

  it('a summon clears prior warmth — restored ids are fresh, old entries unreachable', () => {
    useSession.getState().openWindow(page('x'))
    const xTab = useSession.getState().pageWindow!.tabs[0]
    captureWindowCache(xTab.id, { scrollTop: 7 })
    useSession.getState().openWindow(page('z'))
    expect(readWindowCache(xTab.id)).toBeUndefined()
  })
})

describe('windowTabs — the NavWindow flavor entry (H-2/H-3)', () => {
  it('openNav seeds the nav flavor with the remembered set (map tab active); closeNav keeps it durable', () => {
    useSession.setState({
      windowsFile: {
        navSet: {
          tabs: [{ target: { kind: 'page', id: 'n' } }],
          activeIndex: 0,
        },
        origins: {},
        open: null,
      },
    })
    useSession.getState().openNav()
    const p = useSession.getState().pageWindow!
    expect(useSession.getState().navOpen).toBe(true)
    expect(p.flavor).toBe('nav')
    expect(p.tabs.map((t) => t.target.kind)).toEqual(['navwindow', 'page'])
    expect(p.activeTabId).toBe(p.tabs[0].id) // the map tab lands active (the gallery is the landing)

    useSession.getState().closeNav()
    expect(useSession.getState().pageWindow).toBeNull()
    expect(useSession.getState().navOpen).toBe(false)
    // Only the page tab persists — the gallery sentinel re-seeds on every openNav.
    expect(useSession.getState().windowsFile.navSet?.tabs).toEqual([
      { target: { kind: 'page', id: 'n' } },
    ])
  })

  it('the B-2 override toggle persists in the windows file', () => {
    expect(useSession.getState().windowsFile.navOverride ?? true).toBe(true)
    useSession.getState().setNavOverride(false)
    expect(useSession.getState().windowsFile.navOverride).toBe(false)
  })
})

describe('windowTabs — the engulf exit flag (A-4)', () => {
  it("a promote's engulf flag never leaks onto the next window's close", () => {
    useSession.getState().openWindow(page('x'))
    useSession.getState().closeWindow('engulf')
    expect(useSession.getState().windowExit).toBe('engulf')
    // Re-opening re-seeds — the close paths that never write the flag can't replay the FLIP.
    useSession.getState().openWindow(page('y'))
    expect(useSession.getState().windowExit).toBe('dismiss')
  })
})

describe('windowTabs — the slide stamp (Task 1.3)', () => {
  it('stamps fwd on spawn, direction by strip order on activate, monotonic seq', () => {
    useSession.getState().openWindow(page('x'))
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
