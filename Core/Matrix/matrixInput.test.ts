import { describe, expect, it } from 'vitest'
import type { NexusTree } from '../Nexus/tree'
import type { PropertyDefinition } from '../Properties/properties'
import { linkedSpacesTree, makeTree } from '../Testing/testTree'
import type { FilterGroup } from '../Views/views'
import { DEFAULT_MATRIX_CONFIG, type MatrixConfig } from './matrixConfig'
import type { MatrixGraphReply, MatrixLink } from './matrixGraph'
import { filterSetTree, matrixTree, matrixVisible, matrixWalk } from './matrixInput'

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
  const walk = matrixWalk(matrixTree(tree), reply)
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
    expect([...(inside.visible ?? [])].sort()).toEqual(['a1', 'p1', 'p2', 'pr1', 't1'])

    const off = matrixInput(makeTree(), replyOf([]), configWith({ rules, enabled: false }))
    expect(off.visible).toBeNull()
  })

  it('roots the filter set tree at the Collections', () => {
    expect(filterSetTree(makeTree())).toEqual([
      { id: 'c1', children: [{ id: 's1', children: [] }] },
    ])
  })
})

const STATUS: PropertyDefinition = {
  id: 'prop_status',
  name: 'Status',
  type: 'select',
  select_options: [
    { value: 'Active', label: 'Active' },
    { value: 'Done', label: 'Done' },
  ],
}

const spacesTree = (): NexusTree => {
  const tree = linkedSpacesTree({
    aValues: { Status: 'Done' },
    aContextValues: { g2: ['b1'] },
  })
  tree.registry = [STATUS]
  return tree
}

const spacesVisible = (rules: FilterGroup): string[] => {
  const walk = matrixWalk(matrixTree(spacesTree()), replyOf([]))
  const visible = matrixVisible(walk, { ...DEFAULT_MATRIX_CONFIG.filter, rules, enabled: true })
  return [...(visible ?? [])].filter((id) => id === 'a1' || id === 'b1').sort()
}

const all = (...rules: FilterGroup['rules']): FilterGroup => ({ match: 'all', rules })

describe('matrixVisible over Spaces', () => {
  it('judges a Space on the rules it can answer and abstains on the rest', () => {
    expect(spacesVisible(all({ property_id: 'prop_status', op: 'is', value: 'Active' }))).toEqual([
      'b1',
    ])
    expect(spacesVisible(all({ property_id: 'prop_status', op: 'is_not_empty' }))).toEqual(['a1'])
  })

  it('keeps a Space under its own Context and the Spaces linked to it', () => {
    expect(spacesVisible(all({ property_id: 'g1', op: 'contains_any', values: ['a1'] }))).toEqual([
      'a1',
      'b1',
    ])
    expect(spacesVisible(all({ property_id: 'g1', op: 'is_empty' }))).toEqual([])
  })

  it('drops a rule no Space can answer, at any depth', () => {
    expect(spacesVisible(all({ property_id: '_location', op: 'is', value: 'c1' }))).toEqual([
      'a1',
      'b1',
    ])
    expect(
      spacesVisible(all({ property_id: '_created_at', op: 'on_or_after', value: '2026-01-01' })),
    ).toEqual(['a1', 'b1'])
    expect(
      spacesVisible(
        all(all({ property_id: '_location', op: 'is', value: 'c1' }), {
          property_id: '_created_at',
          op: 'on_or_after',
          value: '2026-01-01',
        }),
      ),
    ).toEqual(['a1', 'b1'])
  })
})
