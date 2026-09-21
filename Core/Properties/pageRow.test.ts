import { describe, expect, it } from 'vitest'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import type { NexusTree, SpaceNode } from '@pommora/core/Nexus/tree'
import { linkedSpacesTree } from '../Testing/testTree'
import { spaceRowOf } from './pageRow'

const linked = (): { tree: NexusTree; node: SpaceNode } => {
  const tree = linkedSpacesTree({
    aValues: { Status: ['Active'] },
    bContextValues: { g1: ['a1'] },
  })
  return { tree, node: tree.contexts[0].spaces[0] }
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
