import { describe, expect, it } from 'vitest'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import type { NexusTree, SpaceNode } from '@pommora/core/Nexus/tree'
import { makeTree } from '../Testing/testTree'
import { spaceRowOf } from './pageRow'

const linked = (): { tree: NexusTree; node: SpaceNode } => {
  const base = makeTree()
  const home: SpaceNode = {
    kind: 'space',
    id: 'a1',
    title: 'Work',
    path: '.nexus/contexts/Realms/Work',
    contextId: 'g1',
    values: { Status: ['Active'] },
  }
  const other: SpaceNode = {
    kind: 'space',
    id: 'b1',
    title: 'Reading',
    path: '.nexus/contexts/Themes/Reading',
    contextId: 'g2',
    contextValues: { g1: ['a1'] },
  }
  const tree: NexusTree = {
    ...base,
    contexts: [
      { def: { id: 'g1', title: 'Realms', singular: 'Realm' }, spaces: [home] },
      { def: { id: 'g2', title: 'Themes', singular: 'Theme' }, spaces: [other] },
    ],
  }
  return { tree, node: home }
}

describe('spaceRowOf', () => {
  it('carries the node values plus the ID key, and the link union as contextValues', () => {
    const { tree, node } = linked()
    const row = spaceRowOf(tree, node)
    expect(row.frontmatter).toEqual({ Status: ['Active'], ID: 'a1' })
    expect(row.contextValues).toEqual({ g2: ['b1'] })
    expect(row.id).toBe('a1')
    expect(row.path).toBe('.nexus/contexts/Realms/Work')
  })

  it('lets a frontmatter rider stand in for the node values and override the union per Context', () => {
    const { tree, node } = linked()
    const fm = {
      Status: ['Paused'],
      contextValues: { g2: [] },
    } as unknown as PageFrontmatter
    const row = spaceRowOf(tree, node, fm)
    expect(row.frontmatter).toBe(fm)
    expect(row.contextValues).toEqual({ g2: [] })
  })
})
