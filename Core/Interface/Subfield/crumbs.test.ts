import { describe, expect, it } from 'vitest'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import { makeTree } from '../../Testing/testTree'
import { subfieldCrumbs } from './crumbs'

const deepTree = (): NexusTree => {
  const t = makeTree()
  const col = t.collections[0]
  const set = col?.sets[0]
  if (!col || !set) throw new Error('fixture')
  const page = { kind: 'page' as const, id: 'p3', title: 'Leaf', path: 'Notes/Ideas/Deep/Leaf.md' }
  const sub = {
    kind: 'set' as const,
    id: 's2',
    title: 'Deep',
    path: 'Notes/Ideas/Deep',
    pages: [page],
  }
  return { ...t, collections: [{ ...col, sets: [{ ...set, sets: [sub] }] }] }
}

describe('subfieldCrumbs', () => {
  it('leaves a Sub-Set crumb plain on the way up and on the way forward', () => {
    const t = deepTree()
    const leaf = { kind: 'page' as const, id: 'p3', path: 'Notes/Ideas/Deep/Leaf.md' }
    const up = subfieldCrumbs(t, leaf, null, () => {})
    expect(up.map((c) => [c.title, !!c.onSelect])).toEqual([
      ['Notes', true],
      ['Ideas', true],
      ['Deep', false],
      ['Leaf', false],
    ])
    const forward = subfieldCrumbs(t, { kind: 'collection', id: 'c1' }, leaf, () => {})
    expect(forward.map((c) => [c.title, !!c.onSelect])).toEqual([
      ['Notes', false],
      ['Ideas', true],
      ['Deep', false],
      ['Leaf', true],
    ])
  })
})
