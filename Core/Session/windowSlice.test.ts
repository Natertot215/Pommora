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
    windowsFile: { navSet: null, origins: {}, open: null },
  })
})

const indexOf = (pages: Record<string, string>): ReconcileIndex => ({
  spaces: new Set(),
  collections: new Set(),
  sets: new Map(),
  pages: new Map(Object.entries(pages)),
})

describe('reconcileWindow', () => {
  it('keeps the history window while the tree holds its page, and closes it once the page is gone', () => {
    useSession.setState({ historyTarget: { id: 'a', path: 'Notes/a.md' } })
    useSession.getState().reconcileWindow(indexOf({ a: 'Notes/a.md' }))
    expect(useSession.getState().historyTarget).toEqual({ id: 'a', path: 'Notes/a.md' })
    useSession.getState().reconcileWindow(indexOf({}))
    expect(useSession.getState().historyTarget).toBeNull()
  })
})

describe('the Matrix window — one slot, three kinds', () => {
  const page = { id: 'x', path: 'Notes/x.md' }

  it('overtakes an open page window, whose set survives for a re-summon', () => {
    useSession.getState().openWindow(page)
    expect(useSession.getState().pageWindow?.kind).toBe('page')
    useSession.getState().openMatrixWindow()
    const win = useSession.getState().pageWindow!
    expect(win.kind).toBe('matrix')
    expect(win.tabs).toEqual([])
    expect(useSession.getState().windowExit).toBe('dismiss')
    // A summon retires no origin — only a re-parent does — so the overtaken window re-opens with its tabs.
    expect(useSession.getState().windowsFile.origins.x?.tabs).toEqual([
      { target: { kind: 'page', id: 'x' } },
    ])
  })

  it('the toggle opens it, then closes the slot', () => {
    useSession.getState().toggleMatrixWindow()
    expect(useSession.getState().pageWindow?.kind).toBe('matrix')
    useSession.getState().toggleMatrixWindow()
    expect(useSession.getState().pageWindow).toBeNull()
    expect(useSession.getState().windowsFile.open).toBeNull()
  })

  it('a tab asked for while it stands opens a page window instead', () => {
    useSession.getState().openMatrixWindow()
    useSession.getState().openWindowTab(page)
    const win = useSession.getState().pageWindow!
    expect(win.kind).toBe('page')
    expect(win.tabs.map((t) => t.target)).toEqual([{ kind: 'page', ...page }])
  })
})
