import { describe, it, expect } from 'vitest'
import { buildSetIcons, buildSetNames, findOption, groupLabel } from './cellResolve'
import type { CollectionNode } from '@pommora/core/Nexus/tree'
import { UNGROUPED, type ResolvedGroup } from '@pommora/core/Views/viewRow'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'

const schema: PropertyDefinition[] = [
  {
    id: 'prop_tag',
    name: 'Tag',
    type: 'select',
    select_options: [{ value: 'opt_a', color: 'green' }],
  },
]

describe('findOption', () => {
  it('returns the option with its color (the chip tint)', () => {
    expect(findOption('prop_tag', 'opt_a', schema)).toEqual({ value: 'opt_a', color: 'green' })
  })
  it('returns undefined for an unknown value', () => {
    expect(findOption('prop_tag', 'nope', schema)).toBeUndefined()
  })
})

describe('groupLabel', () => {
  const setNames = new Map([['set1', 'Inbox']])

  it('resolves a structural Set group to its name', () => {
    const g = {
      key: 'set1',
      kind: 'structural-set',
      items: [],
    } as ResolvedGroup
    expect(groupLabel(g, setNames)).toBe('Inbox')
  })
  it('resolves a property group to its bucket value', () => {
    const g = { key: 'doing', kind: 'property', items: [] } as ResolvedGroup
    expect(groupLabel(g, setNames)).toBe('doing')
  })
  it('returns empty for the no-value band', () => {
    const g = { key: UNGROUPED, kind: 'ungrouped', items: [] } as ResolvedGroup
    expect(groupLabel(g, setNames)).toBe('')
  })
  it('resolves a sub-band inside a Set band to its bucket value', () => {
    const g = { key: 'set1/doing', bucket: 'doing', kind: 'property', items: [] } as ResolvedGroup
    expect(groupLabel(g, setNames)).toBe('doing')
  })
})

describe('buildSetNames', () => {
  it('maps set ids to titles across the subtree', () => {
    const source = {
      kind: 'collection',
      sets: [
        {
          id: 's1',
          kind: 'set',
          title: 'Top',
          pages: [],
          sets: [{ id: 's2', kind: 'set', title: 'Nested', pages: [] }],
        },
      ],
    } as unknown as CollectionNode
    const m = buildSetNames(source)
    expect(m.get('s1')).toBe('Top')
    expect(m.get('s2')).toBe('Nested')
  })
})

describe('buildSetIcons', () => {
  it('maps set ids to their icon across the subtree (undefined when unset)', () => {
    const source = {
      kind: 'collection',
      sets: [
        {
          id: 's1',
          kind: 'set',
          title: 'Top',
          icon: 'star',
          pages: [],
          sets: [{ id: 's2', kind: 'set', title: 'Nested', pages: [] }],
        },
      ],
    } as unknown as CollectionNode
    const m = buildSetIcons(source)
    expect(m.get('s1')).toBe('star')
    expect(m.get('s2')).toBeUndefined()
  })
})
