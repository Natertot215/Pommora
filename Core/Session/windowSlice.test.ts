// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { ReconcileIndex } from './reconcileSelection'
import { useSession } from './store'
import { stubDialer } from '../vitest.setup'

beforeEach(() => {
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({})
  useSession.getState().resetWindow()
})

const indexOf = (pages: Record<string, string>): ReconcileIndex => ({
  spaces: new Set(),
  collections: new Set(),
  sets: new Map(),
  pages: new Map(Object.entries(pages)),
  pagesByPath: new Map(Object.entries(pages).map(([id, path]) => [path, id])),
  withheld: () => false,
})

describe('reconcileWindow', () => {
  it('keeps the history window while the tree holds its page, and closes it once the page is gone', () => {
    useSession.setState({ historyTarget: { kind: 'page', id: 'a', path: 'Notes/a.md' } })
    useSession.getState().reconcileWindow(indexOf({ a: 'Notes/a.md' }))
    expect(useSession.getState().historyTarget).toEqual({
      kind: 'page',
      id: 'a',
      path: 'Notes/a.md',
    })
    useSession.getState().reconcileWindow(indexOf({}))
    expect(useSession.getState().historyTarget).toBeNull()
  })
})

describe('reconcileWindow — a page re-keyed at its path', () => {
  it('re-keys a window tab and the history target to the page now at their path', () => {
    const dead = { kind: 'page', id: '01KZSWEW0WPF1PFWWJSKE8Q83P', path: 'Notes/x.md' } as const
    useSession.getState().openWindowTab(dead)
    useSession.setState({ historyTarget: dead })
    useSession.getState().reconcileWindow(indexOf({ x: 'Notes/x.md' }))
    const live = { kind: 'page', id: 'x', path: 'Notes/x.md' }
    expect(useSession.getState().windowSlot?.tabs.map((t) => t.target)).toEqual([live])
    expect(useSession.getState().historyTarget).toEqual(live)
  })
})

describe('the Matrix window — one slot, three kinds', () => {
  const page = { kind: 'page', id: 'x', path: 'Notes/x.md' } as const

  it('overtakes an open page window, whose set survives for the next Preview', () => {
    useSession.getState().openWindowTab(page)
    expect(useSession.getState().windowSlot?.kind).toBe('page')
    useSession.getState().openMatrixWindow()
    const win = useSession.getState().windowSlot!
    expect(win.kind).toBe('matrix')
    expect(win.tabs).toEqual([])
    expect(useSession.getState().windowExit).toBe('dismiss')
    expect(useSession.getState().windowsFile.sets.page?.tabs).toEqual([
      { target: { kind: 'page', id: 'x' } },
    ])
  })

  it('the toggle opens it, then closes the slot', () => {
    useSession.getState().toggleMatrixWindow()
    expect(useSession.getState().windowSlot?.kind).toBe('matrix')
    useSession.getState().toggleMatrixWindow()
    expect(useSession.getState().windowSlot).toBeNull()
  })

  it('a Preview while it stands overtakes it — the Matrix has no tabs to join', () => {
    useSession.getState().openMatrixWindow()
    useSession.getState().openWindowTab(page)
    const win = useSession.getState().windowSlot!
    expect(win.kind).toBe('page')
    expect(win.tabs.map((t) => t.target)).toEqual([page])
  })
})

describe('a window action writes the store once', () => {
  it('activating a tab writes once and saves no file, since the record holds no active tab', () => {
    const s = useSession.getState()
    s.openWindowTab({ kind: 'page', id: 'a', path: 'a.md' })
    s.openWindowTab({ kind: 'page', id: 'b', path: 'b.md' })
    const first = useSession.getState().windowSlot!.tabs[0].id
    const file = useSession.getState().windowsFile
    let writes = 0
    const off = useSession.subscribe(() => writes++)
    useSession.getState().activateWindowTab(first)
    off()
    expect(writes).toBe(1)
    expect(useSession.getState().windowsFile).toBe(file)
  })

  it('a heading Preview writes once, its travel riding the same write', () => {
    let writes = 0
    const off = useSession.subscribe(() => writes++)
    useSession
      .getState()
      .openWindowTab({ kind: 'page', id: 'a', path: 'a.md' }, { heading: 'Setup' })
    off()
    expect(writes).toBe(1)
    expect(useSession.getState().pendingTravel).toEqual({
      route: 'window',
      path: 'a.md',
      heading: 'Setup',
    })
  })

  it('a repeat Preview of the shown page summons the window without replacing it', () => {
    const page = { kind: 'page', id: 'a', path: 'a.md' } as const
    const before = useSession.getState().windowSummon
    useSession.getState().openWindowTab(page)
    const slot = useSession.getState().windowSlot
    useSession.getState().openWindowTab(page)
    expect(useSession.getState().windowSummon).toBe(before + 2)
    expect(useSession.getState().windowSlot).toBe(slot)
  })
})

describe('reconcileWindow — dead tabs', () => {
  it('a dead active tab falls to its surviving left neighbor, and an emptied window closes', () => {
    const s = useSession.getState()
    s.openWindowTab({ kind: 'page', id: 'a', path: 'a.md' })
    s.openWindowTab({ kind: 'page', id: 'b', path: 'b.md' })
    s.openWindowTab({ kind: 'page', id: 'c', path: 'c.md' })
    useSession.getState().reconcileWindow(indexOf({ a: 'a.md' }))
    const win = useSession.getState().windowSlot!
    expect(win.tabs.map((t) => t.target)).toEqual([{ kind: 'page', id: 'a', path: 'a.md' }])
    expect(win.activeTabId).toBe(win.tabs[0].id)
    useSession.getState().reconcileWindow(indexOf({}))
    expect(useSession.getState().windowSlot).toBeNull()
  })
})
