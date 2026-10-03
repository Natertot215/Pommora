import { describe, it, expect } from 'vitest'
import type { NavRef, SelectTarget, Tab } from './navRef'
import type { NexusTree } from '../Nexus/tree'
import { reconcileIndexOf } from '../Nexus/treeIndex'
import {
  activeUnpinnedTab,
  hydrateTabs,
  closeTab,
  cycle,
  derivePinnedTabs,
  insertUnpinned,
  isPinned,
  newTabTab,
  openNewTab,
  openTab,
  openTabAt,
  pinTabId,
  liveTarget,
  pushMru,
  reconcileTab,
  settleFocus,
} from './tabsModel'

const pt = (id: string): SelectTarget => ({ kind: 'page', id, path: `/${id}` })
const tab = (id: string, targetId: string): Tab => ({
  id,
  target: pt(targetId),
  navStack: [pt(targetId)],
  navIndex: 0,
})
const pin = (id: string): NavRef => ({ kind: 'page', id })
// A minimal tree holding the given page ids at `/${id}` — hydration mints exactly pt(id).
const mkTree = (...ids: string[]): NexusTree =>
  ({
    nexus: { name: 'T' },
    contexts: [],
    collections: [
      {
        kind: 'collection',
        id: 'col',
        title: 'C',
        path: '',
        pages: ids.map((id) => ({ kind: 'page', id, title: id, path: `/${id}` })),
        sets: [],
      },
    ],
    config: { pageMetadata: {}, personalization: {} },
  }) as unknown as NexusTree
const navTab = (id: string): Tab => newTabTab(id)

describe('tabsModel — the Matrix kind', () => {
  it('liveTarget carries the id-less Matrix through untouched', () => {
    expect(liveTarget(reconcileIndexOf(mkTree('a')), { kind: 'matrix' })).toEqual({
      kind: 'matrix',
    })
  })

  it('opening the Matrix twice yields one tab', () => {
    const first = openTab([], 't0', [], { kind: 'matrix' }, { newTab: true }, 'M1')
    const again = openTab(first.tabs, first.activeTabId, [], { kind: 'matrix' }, {}, 'M2')
    expect(again.tabs).toHaveLength(1)
    expect(again.activeTabId).toBe('M1')
  })
})

describe('tabsModel — openTab', () => {
  it('focuses an already-open tab instead of duplicating (I-1)', () => {
    const tabs = [tab('t1', 'a'), tab('t2', 'b')]
    const r = openTab(tabs, 't1', [], pt('b'), {}, 'NEW')
    expect(r.tabs).toBe(tabs)
    expect(r.activeTabId).toBe('t2')
  })

  it('replaces the active unpinned tab in place, pushing its history (D-1)', () => {
    const r = openTab([tab('t1', 'a')], 't1', [], pt('b'), {}, 'NEW')
    expect(r.tabs).toHaveLength(1)
    expect(r.tabs[0].id).toBe('t1')
    expect(r.tabs[0].target).toEqual(pt('b'))
    expect(r.tabs[0].navStack).toEqual([pt('a'), pt('b')])
    expect(r.tabs[0].navIndex).toBe(1)
    expect(r.activeTabId).toBe('t1')
  })

  it('truncates forward history on a replace mid-stack', () => {
    const branched: Tab = {
      id: 't1',
      target: pt('a'),
      navStack: [pt('a'), pt('b'), pt('c')],
      navIndex: 0,
    }
    const r = openTab([branched], 't1', [], pt('z'), {}, 'NEW')
    expect(r.tabs[0].navStack).toEqual([pt('a'), pt('z')])
    expect(r.tabs[0].navIndex).toBe(1)
  })

  it('spawns a new tab when the active tab is pinned (D-2)', () => {
    const pinned = derivePinnedTabs([pin('p')], reconcileIndexOf(mkTree('p')), [])
    const r = openTab([], pinTabId(pt('p')), pinned, pt('b'), {}, 'NEW')
    expect(r.tabs).toHaveLength(1)
    expect(r.tabs[0].id).toBe('NEW')
    expect(r.activeTabId).toBe('NEW')
  })

  it('spawns on explicit New Tab, appended right (D-3, D-12)', () => {
    const r = openTab([tab('t1', 'a')], 't1', [], pt('b'), { newTab: true }, 'NEW')
    expect(r.tabs.map((t) => t.id)).toEqual(['t1', 'NEW'])
    expect(r.activeTabId).toBe('NEW')
  })

  it('focuses a pinned tab when opening its entity from a scratch tab — never replaces the scratch (I-1)', () => {
    const pinned = derivePinnedTabs([pin('p')], reconcileIndexOf(mkTree('p')), [])
    const tabs = [tab('t1', 'a')]
    const r = openTab(tabs, 't1', pinned, pt('p'), {}, 'NEW')
    expect(r.tabs).toBe(tabs)
    expect(r.activeTabId).toBe(pinTabId(pt('p')))
  })

  it('replaces a NavView scratch tab in place (E-2)', () => {
    const r = openTab([navTab('t1')], 't1', [], pt('a'), {}, 'NEW')
    expect(r.tabs).toHaveLength(1)
    expect(r.tabs[0].id).toBe('t1')
    expect(r.tabs[0].target).toEqual(pt('a'))
    expect(r.tabs[0].navStack).toEqual([pt('a')])
    expect(r.tabs[0].navIndex).toBe(0)
  })
})

describe('tabsModel — openNewTab', () => {
  it('appends a NavView tab', () => {
    const r = openNewTab([tab('t1', 'a')], 'NEW')
    expect(r.tabs).toHaveLength(2)
    expect(r.tabs[1].target).toEqual({ kind: 'newtab' })
    expect(r.activeTabId).toBe('NEW')
  })

  it('focuses the existing NavView instead of a second one — no duplicate (I-1)', () => {
    const r = openNewTab([navTab('n')], 'NEW')
    expect(r.tabs).toHaveLength(1)
    expect(r.activeTabId).toBe('n')
  })
})

describe('tabsModel — openTabAt', () => {
  it('splices a new page at the index without activating it', () => {
    const tabs = [tab('t1', 'a'), tab('t2', 'b')]
    expect(openTabAt(tabs, [], pt('c'), 1, 'NEW').map((t) => t.id)).toEqual(['t1', 'NEW', 't2'])
  })

  it('moves an already-open page to the index', () => {
    const tabs = [tab('t1', 'a'), tab('t2', 'b'), tab('t3', 'c')]
    expect(openTabAt(tabs, [], pt('a'), 2, 'NEW').map((t) => t.id)).toEqual(['t2', 't1', 't3'])
  })

  it('moves an already-open page leftward to the index', () => {
    const tabs = [tab('t1', 'a'), tab('t2', 'b'), tab('t3', 'c')]
    expect(openTabAt(tabs, [], pt('c'), 0, 'NEW').map((t) => t.id)).toEqual(['t3', 't1', 't2'])
  })

  it('leaves the row untouched when a page drops into its own gap', () => {
    const tabs = [tab('t1', 'a'), tab('t2', 'b'), tab('t3', 'c')]
    expect(openTabAt(tabs, [], pt('b'), 1, 'NEW')).toBe(tabs)
    expect(openTabAt(tabs, [], pt('b'), 2, 'NEW')).toBe(tabs)
  })

  it('leaves the row untouched when the page is pinned', () => {
    const tabs = [tab('t1', 'a')]
    expect(openTabAt(tabs, [tab(pinTabId(pt('p')), 'p')], pt('p'), 0, 'NEW')).toBe(tabs)
  })
})

describe('tabsModel — closeTab', () => {
  it('focuses the left neighbor over the MRU top when closing the active tab', () => {
    const tabs = [tab('t1', 'a'), tab('t2', 'b'), tab('t3', 'c')]
    const r = closeTab(tabs, 't3', ['t3', 't1', 't2'], [], 't3', 'NEW')
    expect(r.activeTabId).toBe('t2')
    expect(r.tabs.map((t) => t.id)).toEqual(['t1', 't2'])
  })

  it('focuses the left neighbor, not the right, when closing a middle tab', () => {
    const tabs = [tab('t1', 'a'), tab('t2', 'b'), tab('t3', 'c')]
    expect(closeTab(tabs, 't2', [], [], 't2', 'NEW').activeTabId).toBe('t1')
  })

  it('keeps the previous tab when closing the rightmost with an empty MRU', () => {
    expect(closeTab([tab('t1', 'a'), tab('t2', 'b')], 't2', [], [], 't2', 'NEW').activeTabId).toBe(
      't1',
    )
  })

  it('leaves the active tab untouched when closing a background tab', () => {
    const r = closeTab([tab('t1', 'a'), tab('t2', 'b')], 't2', ['t2', 't1'], [], 't1', 'NEW')
    expect(r.activeTabId).toBe('t2')
    expect(r.tabs.map((t) => t.id)).toEqual(['t2'])
  })

  it('reseeds a lone NavView when the last tab closes (I-5)', () => {
    const r = closeTab([tab('t1', 'a')], 't1', ['t1'], [], 't1', 'NEW')
    expect(r.tabs).toHaveLength(1)
    expect(r.tabs[0].target).toEqual({ kind: 'newtab' })
    expect(r.activeTabId).toBe('NEW')
    expect(r.mru).toEqual(['NEW'])
  })

  it('does not reseed when pinned tabs remain — focuses a pin', () => {
    const r = closeTab([tab('t1', 'a')], 't1', ['t1'], ['pin:page:p'], 't1', 'NEW')
    expect(r.tabs).toHaveLength(0)
    expect(r.activeTabId).toBe('pin:page:p')
  })

  it('closing the first unpinned tab focuses the last pinned tab', () => {
    const tabs = [tab('t1', 'a'), tab('t2', 'b')]
    const r = closeTab(tabs, 't1', ['t1', 't2'], ['pin:page:p', 'pin:page:q'], 't1', 'NEW')
    expect(r.activeTabId).toBe('pin:page:q')
  })

  it('closing the first tab with nothing pinned focuses the tab that takes its place', () => {
    const tabs = [tab('t1', 'a'), tab('t2', 'b'), tab('t3', 'c')]
    const r = closeTab(tabs, 't1', ['t1', 't3', 't2'], [], 't1', 'NEW')
    expect(r.activeTabId).toBe('t2')
  })

  it('is a no-op for a pinned tab id (not closable here)', () => {
    const tabs = [tab('t1', 'a')]
    const r = closeTab(tabs, 't1', ['t1'], ['pin:page:p'], 'pin:page:p', 'NEW')
    expect(r.tabs).toBe(tabs)
    expect(r.activeTabId).toBe('t1')
  })
})

describe('tabsModel — insertUnpinned (D-11)', () => {
  it('inserts at the front when the active tab is not the front one', () => {
    const tabs = [tab('t1', 'a'), tab('t2', 'b')]
    expect(insertUnpinned(tabs, 't2', tab('t3', 'c')).map((t) => t.id)).toEqual(['t3', 't1', 't2'])
  })

  it('inserts behind the active tab when it is the front one', () => {
    const tabs = [tab('t1', 'a'), tab('t2', 'b')]
    expect(insertUnpinned(tabs, 't1', tab('t3', 'c')).map((t) => t.id)).toEqual(['t1', 't3', 't2'])
  })
})

describe('tabsModel — cycle (I-11)', () => {
  const ids = ['p1', 'p2', 't1', 't2']

  it('advances forward and wraps', () => {
    expect(cycle(ids, 't2', 1)).toBe('p1')
    expect(cycle(ids, 'p1', 1)).toBe('p2')
  })

  it('advances backward and wraps', () => {
    expect(cycle(ids, 'p1', -1)).toBe('t2')
  })

  it('returns the active id when empty', () => {
    expect(cycle([], 'x', 1)).toBe('x')
  })
})

describe('tabsModel — reconcileTab (I-2a)', () => {
  // A reconcile stub over a live-path map: absent id = deleted, changed path = renamed/moved.
  const against = (live: Record<string, string>) => (t: SelectTarget) => {
    if (!('id' in t)) return t
    const path = live[t.id]
    if (path === undefined) return null
    return 'path' in t && t.path !== path ? ({ ...t, path } as SelectTarget) : t
  }

  it('returns the same tab when nothing moved', () => {
    const t = tab('t1', 'a')
    expect(reconcileTab(t, against({ a: '/a' }))).toBe(t)
  })

  it('refreshes a renamed tab target + history as a new tab', () => {
    const t = tab('t2', 'b')
    const r = reconcileTab(t, against({ b: '/renamed' }))
    expect(r).not.toBe(t)
    expect(r?.target).toEqual({ kind: 'page', id: 'b', path: '/renamed' })
    expect(r?.navStack).toEqual([{ kind: 'page', id: 'b', path: '/renamed' }])
  })

  it('refreshes a renamed history entry behind an unmoved target as a new tab', () => {
    const t: Tab = { id: 't1', target: pt('a'), navStack: [pt('b'), pt('a')], navIndex: 1 }
    const r = reconcileTab(t, against({ a: '/a', b: '/renamed' }))
    expect(r).not.toBe(t)
    expect(r?.navStack[0]).toEqual({ kind: 'page', id: 'b', path: '/renamed' })
  })

  it('returns null for a tab whose entity was deleted', () => {
    expect(reconcileTab(tab('t2', 'b'), against({ a: '/a' }))).toBeNull()
  })

  it('drops dead history entries and recomputes navIndex around them', () => {
    const t: Tab = { id: 't1', target: pt('c'), navStack: [pt('a'), pt('b'), pt('c')], navIndex: 2 }
    const r = reconcileTab(t, against({ a: '/a', c: '/c' }))
    expect(r?.navStack).toEqual([pt('a'), pt('c')])
    expect(r?.navIndex).toBe(1)
  })

  it('re-finds a pointer lost with its entry by the target key', () => {
    const t: Tab = {
      id: 't1',
      target: pt('a'),
      navStack: [pt('a'), pt('b'), pt('c')],
      navIndex: 2,
    }
    const r = reconcileTab(t, against({ a: '/a', b: '/b' }))
    expect(r?.navStack).toEqual([pt('a'), pt('b')])
    expect(r?.navIndex).toBe(0)
  })

  it('keeps a newtab tab through any reconcile', () => {
    const n = navTab('n')
    expect(reconcileTab(n, against({}))).toBe(n)
  })
})

describe('tabsModel — settleFocus', () => {
  const tabs = [tab('t1', 'a'), tab('t2', 'b'), tab('t3', 'c')]

  it('keeps a live active tab', () => {
    const r = settleFocus({ tabs, activeTabId: 't2', mru: ['t3', 't2'] }, [], 'NEW', 't1')
    expect(r.activeTabId).toBe('t2')
    expect(r.mru).toEqual(['t2', 't3'])
  })

  it('falls to the neighbor first', () => {
    const r = settleFocus({ tabs, activeTabId: 'gone', mru: ['t3'] }, [], 'NEW', 't1')
    expect(r.activeTabId).toBe('t1')
  })

  it('then to the most recent live tab', () => {
    const r = settleFocus({ tabs, activeTabId: 'gone', mru: ['gone', 't3', 't1'] }, [], 'NEW')
    expect(r.activeTabId).toBe('t3')
    expect(r.mru).toEqual(['t3', 't1'])
  })

  it('then to the first tab', () => {
    expect(
      settleFocus({ tabs, activeTabId: 'gone', mru: [] }, ['pin:page:p'], 'NEW').activeTabId,
    ).toBe('t1')
  })

  it('then to the last pinned tab', () => {
    const r = settleFocus(
      { tabs: [], activeTabId: 'gone', mru: [] },
      ['pin:page:p', 'pin:page:q'],
      'NEW',
    )
    expect(r.activeTabId).toBe('pin:page:q')
  })

  it('seeds a lone NavView when nothing is left (I-5)', () => {
    const r = settleFocus({ tabs: [], activeTabId: 'gone', mru: ['gone'] }, [], 'NEW')
    expect(r.tabs).toHaveLength(1)
    expect(r.tabs[0].target).toEqual({ kind: 'newtab' })
    expect(r.activeTabId).toBe('NEW')
    expect(r.mru).toEqual(['NEW'])
  })
})

describe('tabsModel — pushMru', () => {
  it('moves an id to the front, deduped', () => {
    expect(pushMru(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b'])
    expect(pushMru(['a', 'b'], 'x')).toEqual(['x', 'a', 'b'])
  })
})

describe('tabsModel — activeUnpinnedTab', () => {
  it('finds the active tab in the unpinned set; a pinned/unknown active id reads undefined', () => {
    const tabs = [tab('t1', 'a')]
    expect(activeUnpinnedTab(tabs, 't1')?.id).toBe('t1')
    expect(activeUnpinnedTab(tabs, 'pin:page:p')).toBeUndefined()
  })
})

describe('tabsModel — isPinned', () => {
  it('derives membership from the pinned refs; never the newtab sentinel', () => {
    const pinned = [pin('a')]
    expect(isPinned(pt('a'), pinned)).toBe(true)
    expect(isPinned(pt('b'), pinned)).toBe(false)
    expect(isPinned({ kind: 'newtab' }, pinned)).toBe(false)
  })
})

describe('tabsModel — hydrateTabs (the lockstep owner)', () => {
  const stored = (id: string, targetId: string, stack: string[], navIndex: number) => ({
    id,
    target: { kind: 'page' as const, id: targetId },
    navStack: stack.map((s) => ({ kind: 'page' as const, id: s })),
    navIndex,
  })

  it('mints paths and preserves a pointer that survives pruning', () => {
    const [t] = hydrateTabs(
      [stored('t1', 'b', ['a', 'gone', 'b'], 2)],
      reconcileIndexOf(mkTree('a', 'b')),
    )
    expect(t.target).toEqual(pt('b'))
    expect(t.navStack).toEqual([pt('a'), pt('b')])
    expect(t.navIndex).toBe(1)
  })

  it('re-points a desynced stored index at the target by key', () => {
    const [t] = hydrateTabs([stored('t1', 'a', ['a', 'b'], 1)], reconcileIndexOf(mkTree('a', 'b')))
    expect(t.navIndex).toBe(0)
  })

  it('degrades a target absent from its history to a single-entry stack', () => {
    const [t] = hydrateTabs([stored('t1', 'a', ['b'], 0)], reconcileIndexOf(mkTree('a', 'b')))
    expect(t.navStack).toEqual([pt('a')])
    expect(t.navIndex).toBe(0)
  })

  it('drops a tab whose target no longer resolves; newtab passes through empty', () => {
    const tabs = hydrateTabs(
      [
        stored('t1', 'gone', ['gone'], 0),
        { id: 'n', target: { kind: 'newtab' as const }, navStack: [], navIndex: -1 },
      ],
      reconcileIndexOf(mkTree('a')),
    )
    expect(tabs.map((t) => t.id)).toEqual(['n'])
  })
})

describe('tabsModel — derivePinnedTabs', () => {
  it('hydrates in array order with minted paths, stable ids + a one-entry history', () => {
    const tabs = derivePinnedTabs([pin('a'), pin('b')], reconcileIndexOf(mkTree('a', 'b')), [])
    expect(tabs.map((t) => t.id)).toEqual(['pin:page:a', 'pin:page:b'])
    expect(tabs[0].target).toEqual(pt('a'))
    expect(tabs[0].navStack).toEqual([pt('a')])
    expect(tabs[0].navIndex).toBe(0)
  })

  it('drops refs that no longer resolve', () => {
    expect(
      derivePinnedTabs([pin('gone'), pin('a')], reconcileIndexOf(mkTree('a')), []).map((t) => t.id),
    ).toEqual(['pin:page:a'])
  })
})
