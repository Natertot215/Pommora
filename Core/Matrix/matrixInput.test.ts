import { describe, expect, it } from 'vitest'
import type { NexusTree } from '../Nexus/tree'
import { makeTree } from '../Testing/testTree'
import { DEFAULT_MATRIX_CONFIG, type MatrixConfig } from './matrixConfig'
import type { MatrixGraphReply, MatrixLink } from './matrixGraph'
import { filterSetTree, matrixVisible, matrixWalk } from './matrixInput'

const link = (pageId: string, target: string): MatrixLink => ({
  pageId,
  path: `${pageId}.md`,
  kind: 'body',
  target,
  qualifier: '',
  count: 1,
})

const replyOf = (links: MatrixLink[]): MatrixGraphReply => ({ links, values: {} })

const configWith = (filter: Partial<MatrixConfig['filter']>): MatrixConfig => ({
  ...DEFAULT_MATRIX_CONFIG,
  filter: { ...DEFAULT_MATRIX_CONFIG.filter, ...filter },
})

const withTwin = (): NexusTree => {
  const tree = makeTree()
  tree.collections[0].sets[0].pages.push({
    kind: 'page',
    id: 'p3',
    title: 'Alpha',
    path: 'Notes/Ideas/Alpha.md',
  })
  return tree
}

const matrixInput = (tree: NexusTree, reply: MatrixGraphReply, config: MatrixConfig) => {
  const walk = matrixWalk(tree, reply)
  return { input: walk.input, visible: matrixVisible(walk, config.filter) }
}

describe('matrixInput', () => {
  it('lands every page, folder and space with its parent and space ids', () => {
    const tree = makeTree()
    tree.collections[0].pages[0].contextValues = { g1: ['a1'] }
    const { input } = matrixInput(tree, replyOf([]), DEFAULT_MATRIX_CONFIG)
    expect(input.pages).toEqual([
      { id: 'p1', title: 'Alpha', icon: undefined, folderId: 'c1', spaceIds: ['a1'] },
      { id: 'p2', title: 'Nested Beta', icon: undefined, folderId: 's1', spaceIds: [] },
    ])
    expect(input.folders).toEqual([
      { id: 'c1', title: 'Notes', icon: undefined, parentId: null },
      { id: 's1', title: 'Ideas', icon: undefined, parentId: 'c1' },
    ])
    expect(input.spaces.map((s) => s.id)).toEqual(['a1', 't1', 'pr1'])
  })

  it('draws a connection for a resolved target and none for ambiguous or phantom ones', () => {
    const resolved = matrixInput(makeTree(), replyOf([link('p2', 'Alpha')]), DEFAULT_MATRIX_CONFIG)
    expect(resolved.input.connections).toEqual([{ from: 'p2', to: 'p1', kind: 'body' }])

    const ambiguous = matrixInput(withTwin(), replyOf([link('p2', 'Alpha')]), DEFAULT_MATRIX_CONFIG)
    expect(ambiguous.input.connections).toEqual([])

    const phantom = matrixInput(makeTree(), replyOf([link('p2', 'Nowhere')]), DEFAULT_MATRIX_CONFIG)
    expect(phantom.input.connections).toEqual([])
  })

  it('admits a Collection rule at every depth and every page when the filter is off', () => {
    const rules = {
      match: 'all' as const,
      rules: [{ property_id: '_location', op: 'is_inside', value: 'c1' }],
    }
    const inside = matrixInput(makeTree(), replyOf([]), configWith({ rules, enabled: true }))
    expect([...(inside.visible ?? [])].sort()).toEqual(['p1', 'p2'])

    const off = matrixInput(makeTree(), replyOf([]), configWith({ rules, enabled: false }))
    expect(off.visible).toBeNull()
  })

  it('roots the filter set tree at the Collections', () => {
    expect(filterSetTree(makeTree())).toEqual([
      { id: 'c1', children: [{ id: 's1', children: [] }] },
    ])
  })
})
