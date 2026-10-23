import { describe, expect, it } from 'vitest'
import type { PageFrontmatter } from '../Nexus/schemas'
import type { NexusTree, SpaceNode } from '../Nexus/tree'
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

  it('lets pending frontmatter stand in for the node values and a Context patch override the union per Context', () => {
    const { tree, node } = linked()
    const fm = { Status: ['Paused'] } as unknown as PageFrontmatter
    const row = spaceRowOf(tree, node, fm, { g2: [] })
    expect(row.frontmatter).toBe(fm)
    expect(row.contextValues).toEqual({ g2: [] })
  })
})
