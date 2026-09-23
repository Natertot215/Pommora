// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { ReconcileIndex } from './reconcileSelection'
import { useSession } from './store'
import { stubDialer } from '../vitest.setup'

beforeEach(() => {
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({})
  useSession.setState({
    pageWindow: null,
    navOpen: false,
    windowsFile: { navSet: null, pageSet: null },
  })
})

const indexOf = (pages: Record<string, string>): ReconcileIndex => ({
  spaces: new Set(),
  collections: new Set(),
  sets: new Map(),
  pages: new Map(Object.entries(pages)),
  pagesByPath: new Map(Object.entries(pages).map(([id, path]) => [path, id])),
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
    const dead = { kind: 'page', id: 'adopted-x', path: 'Notes/x.md' } as const
    useSession.getState().openWindowTab(dead)
    useSession.setState({ historyTarget: dead })
    useSession.getState().reconcileWindow(indexOf({ x: 'Notes/x.md' }))
    const live = { kind: 'page', id: 'x', path: 'Notes/x.md' }
    expect(useSession.getState().pageWindow?.tabs.map((t) => t.target)).toEqual([live])
    expect(useSession.getState().historyTarget).toEqual(live)
  })
})

describe('the Matrix window — one slot, three kinds', () => {
  const page = { kind: 'page', id: 'x', path: 'Notes/x.md' } as const

  it('overtakes an open page window, whose set survives for the next Preview', () => {
    useSession.getState().openWindowTab(page)
    expect(useSession.getState().pageWindow?.kind).toBe('page')
    useSession.getState().openMatrixWindow()
    const win = useSession.getState().pageWindow!
    expect(win.kind).toBe('matrix')
    expect(win.tabs).toEqual([])
    expect(useSession.getState().windowExit).toBe('dismiss')
    expect(useSession.getState().windowsFile.pageSet?.tabs).toEqual([
      { target: { kind: 'page', id: 'x' } },
    ])
  })

  it('the toggle opens it, then closes the slot', () => {
    useSession.getState().toggleMatrixWindow()
    expect(useSession.getState().pageWindow?.kind).toBe('matrix')
    useSession.getState().toggleMatrixWindow()
    expect(useSession.getState().pageWindow).toBeNull()
  })

  it('a Preview while it stands overtakes it — the Matrix has no tabs to join', () => {
    useSession.getState().openMatrixWindow()
    useSession.getState().openWindowTab(page)
    const win = useSession.getState().pageWindow!
    expect(win.kind).toBe('page')
    expect(win.tabs.map((t) => t.target)).toEqual([page])
  })
})
