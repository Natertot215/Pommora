import { describe, expect, it } from 'vitest'
import type { NexusTree } from '../Nexus/tree'
import type { PropertyDefinition } from '../Properties/properties'
import { linkedSpacesTree, makeTree } from '../Testing/testTree'
import type { FilterGroup, StandaloneFilter } from '../Views/filterRules'
import { DEFAULT_MATRIX_CONFIG, type MatrixConfig } from './matrixConfig'
import type { MatrixGraphReply, MatrixLink } from './matrixGraph'
import { matrixConnections, matrixTree, matrixVisible } from './matrixInput'

const link = (
  pageId: string,
  target: string,
  kind: MatrixLink['kind'] = 'body',
  key = '',
): MatrixLink => ({
  pageId,
  path: `${pageId}.md`,
  kind,
  target,
  key,
})

const replyOf = (links: MatrixLink[]): MatrixGraphReply => ({ links, values: {} })

const configWith = (filter: Partial<StandaloneFilter>): MatrixConfig => ({
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

const matrixInput = (tree: NexusTree, reply: MatrixGraphReply, config: MatrixConfig) => ({
  input: { ...matrixTree(tree), connections: matrixConnections(tree, reply.links) },
  visible: matrixVisible(tree, reply.values, config.filter),
})

describe('matrixInput', () => {
  it('lands every page, folder and space with its parent and space ids', () => {
    const tree = makeTree()
    tree.collections[0].pages[0].contextValues = { g1: ['a1'] }
    const { input } = matrixInput(tree, replyOf([]), DEFAULT_MATRIX_CONFIG)
    expect(input.pages).toEqual([
      { id: 'p1', title: 'Alpha', folderId: 'c1', spaceIds: ['a1'] },
      { id: 'p2', title: 'Nested Beta', folderId: 's1', spaceIds: [] },
    ])
    expect(input.folders).toEqual([
      { id: 'c1', title: 'Notes', parentId: null },
      { id: 's1', title: 'Ideas', parentId: 'c1' },
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

  it('draws one connection for a body linking one page as a title and as a path', () => {
    const links = [link('p2', 'Alpha'), link('p2', 'Notes/Alpha')]
    expect(matrixConnections(makeTree(), links)).toEqual([{ from: 'p2', to: 'p1', kind: 'body' }])
  })

  it('draws a path link’s edge to the page its path names, a twin title notwithstanding', () => {
    const links = [link('p2', 'Notes/Ideas/Alpha'), link('p2', 'Notes/Alpha')]
    expect(matrixConnections(withTwin(), links)).toEqual([
      { from: 'p2', to: 'p3', kind: 'body' },
      { from: 'p2', to: 'p1', kind: 'body' },
    ])
  })

  it('relates a value row only under a key that holds links, asked of the registry at hand', () => {
    const tree = makeTree()
    const number: PropertyDefinition = { id: 'prop_rank', name: 'Rank', type: 'number' }
    tree.config.registry = [number]
    const under = (key: string) => replyOf([link('p2', 'Alpha', 'value', key)]).links
    expect(matrixConnections(tree, under('Rank'))).toEqual([])
    expect(matrixConnections(tree, under('Related'))).toEqual([
      { from: 'p2', to: 'p1', kind: 'value' },
    ])
    tree.config.registry = [{ ...number, name: 'Related' }]
    expect(matrixConnections(tree, under('Related'))).toEqual([])
  })

  it('draws one connection for a target held under two keys, a Number key never shadowing a Link key', () => {
    const tree = makeTree()
    tree.config.registry = [
      { id: 'prop_rank', name: 'Rank', type: 'number' },
      { id: 'prop_source', name: 'Source', type: 'link' },
      { id: 'prop_site', name: 'Site', type: 'link' },
    ]
    const rows = (...keys: string[]) => keys.map((key) => link('p2', 'Alpha', 'value', key))
    expect(matrixConnections(tree, rows('Rank', 'Source'))).toEqual([
      { from: 'p2', to: 'p1', kind: 'value' },
    ])
    expect(matrixConnections(tree, rows('Source', 'Site'))).toEqual([
      { from: 'p2', to: 'p1', kind: 'value' },
    ])
  })

  it('excludes a Collection at every depth and admits every page when the filter is off', () => {
    const rules = {
      match: 'all' as const,
      rules: [{ property_id: '_location', op: 'is_not_inside', value: 'c1' }],
    }
    const outside = matrixInput(makeTree(), replyOf([]), configWith({ rules, enabled: true }))
    expect([...(outside.visible ?? [])].sort()).toEqual(['a1', 'pr1', 't1'])

    const off = matrixInput(makeTree(), replyOf([]), configWith({ rules, enabled: false }))
    expect(off.visible).toBeNull()
  })

  it('judges nothing until the values a filter reads have landed', () => {
    const rules = { match: 'all' as const, rules: [] }
    expect(matrixVisible(makeTree(), null, configWith({ rules, enabled: true }).filter)).toBeNull()
  })
})

const STATUS: PropertyDefinition = {
  id: 'prop_status',
  name: 'Status',
  type: 'select',
  select_options: [{ value: 'Active' }, { value: 'Done' }],
}

const spacesTree = (aValues: Record<string, unknown> = { Status: 'Done' }): NexusTree => {
  const tree = linkedSpacesTree({
    aValues,
    aContextValues: { g2: ['b1'] },
  })
  tree.config.registry = [STATUS]
  return tree
}

const spacesVisible = (rules: FilterGroup, aValues?: Record<string, unknown>): string[] => {
  const visible = matrixVisible(
    spacesTree(aValues),
    {},
    {
      ...DEFAULT_MATRIX_CONFIG.filter,
      rules,
      enabled: true,
    },
  )
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

  it('abstains on a rule for a Space holding another casing of the property’s key', () => {
    const rule = all({ property_id: 'prop_status', op: 'is', value: 'Active' })
    expect(spacesVisible(rule, { status: 'Done' })).toEqual(['a1', 'b1'])
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
