// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import type { GlanceSize } from '@pommora/core/Interface/Windows/windowRecord'
import type { PinnedGlance } from './glanceSlice'
import type { ReconcileIndex } from './reconcileSelection'
import { useSession } from './store'

const SIZE: GlanceSize = { w: 260, h: 120 }

const pin = (tabId: string, id: string, path: string): Omit<PinnedGlance, 'pinId'> => ({
  tabId,
  target: { kind: 'page', id, path },
  anchorX: 10,
  anchorY: 20,
  anchorHeight: 16,
  size: SIZE,
})

const indexOf = (pages: Record<string, string>): ReconcileIndex => ({
  spaces: new Set(),
  collections: new Set(),
  sets: new Map(),
  pages: new Map(Object.entries(pages)),
})

const pins = (): PinnedGlance[] => useSession.getState().pinnedGlances

afterEach(() => useSession.getState().resetGlance())

describe('the pin store', () => {
  it('starts empty', () => {
    expect(pins()).toEqual([])
  })

  it('appends with a fresh pinId', () => {
    useSession.getState().pinGlance(pin('A', 'p1', 'Notes/1.md'))
    useSession.getState().pinGlance(pin('A', 'p2', 'Notes/2.md'))
    expect(pins()).toHaveLength(2)
    expect(pins()[0].pinId).not.toBe(pins()[1].pinId)
    expect(pins()[0].pinId).toBeTruthy()
  })

  it('holds the same page under two tabs as two entries', () => {
    useSession.getState().pinGlance(pin('A', 'p1', 'Notes/1.md'))
    useSession.getState().pinGlance(pin('B', 'p1', 'Notes/1.md'))
    expect(pins()).toHaveLength(2)
    expect(pins().map((p) => p.tabId)).toEqual(['A', 'B'])
  })

  it('unpins by pinId, and unpinning an unknown id is a no-op', () => {
    useSession.getState().pinGlance(pin('A', 'p1', 'Notes/1.md'))
    const before = pins()
    useSession.getState().unpinGlance('nope')
    expect(pins()).toEqual(before)
    useSession.getState().unpinGlance(before[0].pinId)
    expect(pins()).toEqual([])
  })

  it('scrubs only the closed tab’s pins', () => {
    useSession.getState().pinGlance(pin('A', 'p1', 'Notes/1.md'))
    useSession.getState().pinGlance(pin('A', 'p2', 'Notes/2.md'))
    useSession.getState().pinGlance(pin('B', 'p3', 'Notes/3.md'))
    useSession.getState().scrubTabPins('A')
    expect(pins().map((p) => p.tabId)).toEqual(['B'])
  })

  it('re-tags a surviving tab’s pins oldId→newId', () => {
    useSession.getState().pinGlance(pin('A', 'p1', 'Notes/1.md'))
    useSession.getState().pinGlance(pin('B', 'p2', 'Notes/2.md'))
    useSession.getState().retagTabPins('A', 'B')
    expect(pins()).toHaveLength(2)
    expect(pins().map((p) => p.tabId)).toEqual(['B', 'B'])
  })

  it('resetGlance empties the list', () => {
    useSession.getState().pinGlance(pin('A', 'p1', 'Notes/1.md'))
    useSession.getState().resetGlance()
    expect(pins()).toEqual([])
  })
})

describe('reconcileGlance', () => {
  it('repaths a moved page to the same path reconcileWith gives a tab', () => {
    useSession.getState().pinGlance(pin('A', 'p1', 'Notes/Old.md'))
    useSession.getState().reconcileGlance(indexOf({ p1: 'Notes/New.md' }))
    expect(pins()[0].target.path).toBe('Notes/New.md')
  })

  it('drops a deleted page', () => {
    useSession.getState().pinGlance(pin('A', 'p1', 'Notes/1.md'))
    useSession.getState().reconcileGlance(indexOf({}))
    expect(pins()).toEqual([])
  })

  it('is a reference-preserving no-op when nothing changed', () => {
    useSession.getState().pinGlance(pin('A', 'p1', 'Notes/1.md'))
    const before = pins()
    useSession.getState().reconcileGlance(indexOf({ p1: 'Notes/1.md' }))
    expect(pins()).toBe(before)
  })
})
