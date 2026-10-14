import { describe, expect, it } from 'vitest'
import type { PropertyDefinition } from '../Properties/properties'
import type { NexusTree } from '../Nexus/tree'
import { decodeFilter, filterTargets, operatorsFor } from './filterModel'

const r = (
  id: string,
  op = 'is',
  value = 'x',
): { property_id: string; op: string; value: string } => ({
  property_id: id,
  op,
  value,
})

describe('decodeFilter', () => {
  it('a flat group decodes as rows under its own mode', () => {
    expect(decodeFilter({ match: 'any', rules: [r('a'), r('b')] })).toEqual({
      kind: 'rows',
      mode: 'any',
      rules: [r('a'), r('b')],
    })
  })

  it('locks an any of all-runs and an any with an all-run inside', () => {
    expect(
      decodeFilter({
        match: 'any',
        rules: [{ match: 'all', rules: [r('a'), r('b')] }, r('c')],
      }).kind,
    ).toBe('locked')
    expect(
      decodeFilter({ match: 'any', rules: [{ match: 'all', rules: [r('a')] }, r('b')] }).kind,
    ).toBe('locked')
  })

  it('locks any group nested under an all root, which the frame never writes', () => {
    for (const match of ['any', 'all'] as const) {
      expect(
        decodeFilter({ match: 'all', rules: [r('a'), { match, rules: [r('b'), r('c')] }] }).kind,
      ).toBe('locked')
    }
  })

  it('locks 3-deep nesting', () => {
    expect(
      decodeFilter({
        match: 'any',
        rules: [{ match: 'all', rules: [r('a'), { match: 'any', rules: [r('b')] }] }],
      }).kind,
    ).toBe('locked')
  })

  it('undefined → empty rows in the any mode', () => {
    expect(decodeFilter(undefined)).toEqual({ kind: 'rows', mode: 'any', rules: [] })
  })
})

describe('vocabulary', () => {
  const schema: PropertyDefinition[] = [
    { id: 'prop_sel', name: 'Sel', type: 'select' },
    { id: 'prop_done', name: 'Done', type: 'checkbox' },
    { id: 'prop_tags', name: 'Tags', type: 'multiSelect' },
  ]

  it("text reads Link's seven operators", () => {
    const linkAndText: PropertyDefinition[] = [
      { id: 'prop_url', name: 'Link', type: 'link' },
      { id: 'prop_notes', name: 'Notes', type: 'text' },
    ]
    expect(operatorsFor('prop_notes', linkAndText)).toEqual(operatorsFor('prop_url', linkAndText))
    expect(operatorsFor('prop_notes', linkAndText)).toHaveLength(7)
  })

  it('checkbox operators carry the whole clause (slot none, implied values)', () => {
    const ops = operatorsFor('prop_done', schema)
    expect(ops.map((o) => o.label)).toEqual(['Is Checked', "Isn't Checked"])
    expect(ops.every((o) => o.slot === 'none')).toBe(true)
    expect(ops.map((o) => o.impliedValue)).toEqual(['true', 'false'])
  })

  it("select reads Is / Isn't / Is Empty / Isn't Empty with chip slots on the membership ops", () => {
    const ops = operatorsFor('prop_sel', schema)
    expect(ops.map((o) => o.label)).toEqual(['Is', "Isn't", 'Is Empty', "Isn't Empty"])
    expect(ops[0].slot).toBe('chips')
    expect(ops[2].slot).toBe('none')
  })

  it("multi-select reads Is Any / Is All / Isn't + empties", () => {
    expect(operatorsFor('prop_tags', schema).map((o) => o.op)).toEqual([
      'contains_any',
      'contains_all',
      'does_not_contain',
      'is_empty',
      'is_not_empty',
    ])
  })

  it('targets lead Title · Location · the stamps, then registry Contexts, then schema', () => {
    const tree = {
      contexts: [
        { def: { id: 'ctx_areas', title: 'Areas', singular: 'Area' }, spaces: [] },
        { def: { id: 'ctx-crew', title: 'Crew', singular: 'Member' }, spaces: [] },
      ],
      config: { personalization: {} },
    } as unknown as NexusTree
    expect(filterTargets(schema, tree).map((t) => t.label)).toEqual([
      'Title',
      'Location',
      'Creation Time',
      'Last Modified',
      'Areas',
      'Crew',
      'Sel',
      'Done',
      'Tags',
    ])
  })

  it('a user-defined Context is a target on the same footing as a seeded one', () => {
    const tree = {
      contexts: [{ def: { id: 'ctx-crew', title: 'Crew', singular: 'Member' }, spaces: [] }],
      config: { personalization: {} },
    } as unknown as NexusTree
    const crew = filterTargets(schema, tree).find((t) => t.id === 'ctx-crew')
    expect(crew?.label).toBe('Crew')
    expect(operatorsFor('ctx-crew', schema, ['ctx-crew']).map((o) => o.op)).toEqual([
      'contains_any',
      'contains_all',
      'does_not_contain',
      'is_empty',
      'is_not_empty',
    ])
  })

  it("a Context reads Is Any / Is All / Isn't + empties", () => {
    const ops = operatorsFor('ctx-crew', schema, ['ctx-crew'])
    expect(ops.map((o) => o.label)).toEqual([
      'Is Any',
      'Is All',
      "Isn't",
      'Is Empty',
      "Isn't Empty",
    ])
    expect(ops.slice(0, 3).map((o) => o.op)).toEqual([
      'contains_any',
      'contains_all',
      'does_not_contain',
    ])
    expect(ops[0].slot).toBe('chips')
  })

  it("Location Contains and Doesn't Contain take folder names; Is and Isn't take ids alone", () => {
    const ops = operatorsFor('_location', schema)
    expect(ops.map((o) => [o.label, o.names])).toEqual([
      ['Is', undefined],
      ["Isn't", undefined],
      ['Contains', true],
      ["Doesn't Contain", true],
    ])
  })

  it('offers no Context targets when there is no tree', () => {
    expect(filterTargets(schema, null).map((t) => t.label)).toEqual([
      'Title',
      'Location',
      'Creation Time',
      'Last Modified',
      'Sel',
      'Done',
      'Tags',
    ])
  })
})
