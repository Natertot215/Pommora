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

describe('reconcilePreview', () => {
  it('closes the history window of a page the tree no longer holds', () => {
    useSession.setState({ historyTarget: { id: 'a', path: 'Notes/a.md' } })
    useSession.getState().reconcilePreview(indexOf({ a: 'Notes/a.md' }))
    expect(useSession.getState().historyTarget).toEqual({ id: 'a', path: 'Notes/a.md' })
    useSession.getState().reconcilePreview(indexOf({}))
    expect(useSession.getState().historyTarget).toBeNull()
  })
})
