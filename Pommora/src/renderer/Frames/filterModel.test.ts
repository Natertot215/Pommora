import { describe, expect, it } from 'vitest'
import type { PropertyDefinition } from '@shared/properties'
import type { NexusTree } from '@shared/types'
import { decodeFilter, encodeFilter, filterTargets, operatorsFor } from './filterModel'

const r = (
  id: string,
  op = 'is',
  value = 'x',
): { property_id: string; op: string; value: string } => ({
  property_id: id,
  op,
  value,
})

describe('encodeFilter', () => {
  it('all-and → flat all group', () => {
    expect(
      encodeFilter('all', [
        { connector: null, rule: r('a') },
        { connector: 'and', rule: r('b') },
      ]),
    ).toEqual({ match: 'all', rules: [r('a'), r('b')] })
  })

  it('A and B, or C → any of [all-run, leaf]', () => {
    expect(
      encodeFilter('all', [
        { connector: null, rule: r('a') },
        { connector: 'and', rule: r('b') },
        { connector: 'or', rule: r('c') },
      ]),
    ).toEqual({ match: 'any', rules: [{ match: 'all', rules: [r('a'), r('b')] }, r('c')] })
  })

  it('no rows → undefined, whatever the mode', () => {
    expect(encodeFilter('all', [])).toBeUndefined()
    expect(encodeFilter('any', [])).toBeUndefined()
  })
})

describe('decodeFilter', () => {
  it('round-trips every editable shape bit-identically', () => {
    const shapes = [
      encodeFilter('all', [{ connector: null, rule: r('a') }]),
      encodeFilter('any', [
        { connector: null, rule: r('a') },
        { connector: 'or', rule: r('b') },
      ]),
      encodeFilter('all', [
        { connector: null, rule: r('a') },
        { connector: 'and', rule: r('b') },
        { connector: 'or', rule: r('c') },
      ]),
    ]
    for (const tree of shapes) {
      const d = decodeFilter(tree)
      expect(d.kind).toBe('rows')
      if (d.kind === 'rows') expect(encodeFilter(d.mode, d.rows)).toEqual(tree)
    }
  })

  it('mixed connectors read mode all; pure or reads any (D-10)', () => {
    const mixed = decodeFilter({
      match: 'any',
      rules: [{ match: 'all', rules: [r('a'), r('b')] }, r('c')],
    })
    expect(mixed.kind === 'rows' && mixed.mode).toBe('all')
    const pureOr = decodeFilter({ match: 'any', rules: [r('a'), r('b')] })
    expect(pureOr.kind === 'rows' && pureOr.mode).toBe('any')
  })

  it('locks the shallow trap: an any nested under an all root', () => {
    expect(
      decodeFilter({ match: 'all', rules: [r('a'), { match: 'any', rules: [r('b'), r('c')] }] })
        .kind,
    ).toBe('locked')
  })

  it('locks 3-deep nesting', () => {
    expect(
      decodeFilter({
        match: 'any',
        rules: [{ match: 'all', rules: [r('a'), { match: 'any', rules: [r('b')] }] }],
      }).kind,
    ).toBe('locked')
  })

  it('undefined → empty rows in the all mode', () => {
    expect(decodeFilter(undefined)).toEqual({ kind: 'rows', mode: 'all', rows: [] })
  })
})

describe('vocabulary', () => {
  const schema: PropertyDefinition[] = [
    { id: 'prop_sel', name: 'Sel', type: 'select' },
    { id: 'prop_done', name: 'Done', type: 'checkbox' },
    { id: 'prop_tags', name: 'Tags', type: 'multi_select' },
  ]

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
    expect(ops[0].multi).toBe(true)
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
      personalization: {},
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
      personalization: {},
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
