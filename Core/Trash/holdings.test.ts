import { describe, expect, it } from 'vitest'
import { frozenWorld } from './holdings'
import { buildPageIndex } from '../Connections/pageIndex'

describe('frozenWorld', () => {
  it('answers a recorded key by the page it named, and any other by the name', () => {
    const world = frozenWorld(
      buildPageIndex([
        { id: 'pA', title: 'A', path: 'Notes/A.md' },
        { id: 'pD', title: 'D', path: 'Notes/Deep/D.md' },
        { id: 'alpha0', title: 'Alpha', path: 'Notes/Alpha.md' },
        { id: 'back', title: 'Landing', path: 'Ideas/Old/Landing.md' },
      ]),
      new Map([
        ['old a', { id: 'pA' }],
        ['alpha', { id: 'gone' }],
      ]),
    )
    expect(world.holds?.('Ideas/Old/Landing')).toBe(true)
    expect(world.holds?.('landing')).toBe(true)
    expect(world.holds?.('Old A')).toBe(true)
    expect(world.holds?.('Alpha')).toBe(false)
    expect(world.holds?.('d')).toBe(true)
    expect(world.holds?.('ghost')).toBe(false)
  })
})
