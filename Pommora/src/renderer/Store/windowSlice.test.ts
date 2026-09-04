// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { ReconcileIndex } from '../Actions/selection'
import { useSession } from '../store'

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
