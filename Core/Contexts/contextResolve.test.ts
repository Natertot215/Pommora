import { describe, expect, it } from 'vitest'
import {
  contextWorldOf,
  type GovernedWorld,
  reconcileGovernedRoot,
  resolveContextKeys,
} from './contextResolve'
import { byKey, type PropertyDefinition } from '../Properties/properties'
import { decodeValue } from '../Properties/propertyValue'
import type { ContextGroup, SpaceNode } from '../Nexus/tree'

const space = (id: string, title: string, contextId: string): SpaceNode => ({
  id,
  kind: 'space',
  title,
  path: `.nexus/contexts/X/${title}`,
  contextId,
})

const groups: ContextGroup[] = [
  {
    def: { id: 'ctx_projects', title: 'Projects', singular: 'Project' },
    spaces: [space('sp1', 'Pommora', 'ctx_projects'), space('sp2', 'CS 161', 'ctx_projects')],
  },
  {
    def: { id: 'ctxA', title: 'Classes', singular: 'Class' },
    spaces: [space('sp3', '2024', 'ctxA'), space('sp4', 'true', 'ctxA')],
  },
]

const contexts = contextWorldOf(groups)

describe('resolveContextKeys', () => {
  it('resolves a valid wrapped key + exact values to ids', () => {
    const links = resolveContextKeys({ '<Projects>': ['Pommora', 'CS 161'] }, contexts)
    expect(links.get('ctx_projects')).toEqual(['sp1', 'sp2'])
  })

  it('ignores unbracketed keys and unknown titles', () => {
    const links = resolveContextKeys(
      { Projects: ['Pommora'], '<Nonexistent>': ['Pommora'] },
      contexts,
    )
    expect(links.size).toBe(0)
  })

  it('matches values through coercion + NFC (scalars, whitespace), and only a scalar names a Space', () => {
    const links = resolveContextKeys(
      { '<Classes>': [2024, true], '<Projects>': [' Pommora '] },
      contexts,
    )
    expect(links.get('ctxA')).toEqual(['sp3', 'sp4'])
    expect(links.get('ctx_projects')).toEqual(['sp1'])
    expect(resolveContextKeys({ '<Projects>': ['pommora'] }, contexts).has('ctx_projects')).toBe(
      false,
    )
    expect(
      resolveContextKeys({ '<Projects>': [[['Pommora']]] }, contexts).has('ctx_projects'),
    ).toBe(false)
  })

  it('drops only the unmatched values, keeping valid siblings', () => {
    const links = resolveContextKeys({ '<Projects>': ['Pommora', 'Pomora'] }, contexts)
    expect(links.get('ctx_projects')).toEqual(['sp1'])
  })

  it('reads a key only as the Context is titled, another casing resolving nothing', () => {
    expect(resolveContextKeys({ '<projects>': ['Pommora'] }, contexts).size).toBe(0)
    const both = resolveContextKeys(
      { '<projects>': ['CS 161'], '<Projects>': ['Pommora'] },
      contexts,
    )
    expect(both.get('ctx_projects')).toEqual(['sp1'])
  })
})

const statusDef: PropertyDefinition = {
  id: 'prop_status',
  label: 'Status',
  key: 'Status',
  type: 'select',
  select_options: [
    { key: 'Open', label: 'Open' },
    { key: 'Active', label: 'Active' },
  ],
}
const tagsDef: PropertyDefinition = {
  id: 'prop_tags',
  label: 'Tags',
  key: 'Tags',
  type: 'multiSelect',
  select_options: [{ key: 'alpha', label: 'alpha' }],
}
const stageDef: PropertyDefinition = {
  id: 'prop_stage',
  label: 'Stage',
  key: 'Stage',
  type: 'select',
  select_options: [
    { key: 'Done', label: 'Done' },
    { key: 'Open', label: 'Open' },
  ],
}
const notesDef: PropertyDefinition = {
  id: 'prop_notes',
  label: 'Notes',
  key: 'Notes',
  type: 'text',
}
const world: GovernedWorld = {
  contexts,
  defs: byKey([statusDef, tagsDef, stageDef, notesDef]),
}

describe('reconcileGovernedRoot — the context arm', () => {
  it('drops unknowns, keeping each known Space as the file spells it', () => {
    const { root, changed } = reconcileGovernedRoot(
      { '<Projects>': ['pommora', 'Pomora', 'CS 161'] },
      world,
      {},
    )
    expect(root['<Projects>']).toEqual(['CS 161'])
    expect(changed).toEqual(['<Projects>'])
  })

  it('a live reconcile leaves a list naming an unknown Space, or holding a wikilink, as written', () => {
    const input = { '<Projects>': ['pommora', 'Pomora', 'CS 161'] }
    const { root, changed } = reconcileGovernedRoot(input, world)
    expect(root).toEqual(input)
    expect(changed).toEqual([])
    const linked = { '<Projects>': ['pommora', [['Pommora']]] }
    expect(reconcileGovernedRoot(linked, world).root).toEqual(linked)
  })

  it('keeps a scalar-typed member as the file spells it', () => {
    const { root } = reconcileGovernedRoot({ '<Classes>': [2024, true] }, world)
    expect(root['<Classes>']).toEqual([2024, true])
  })

  const withAreas = contextWorldOf([...groups, { def: { id: 'ctxB', title: 'Areas' }, spaces: [] }])
  const emptied = { '<Projects>': ['Pomora'], '<Classes>': [], '<Areas>': null }

  it('removes a key whose values all drop, a present-but-empty list, and a bare key (no empties)', () => {
    const { root, changed } = reconcileGovernedRoot(emptied, { ...world, contexts: withAreas }, {})
    expect('<Projects>' in root).toBe(false)
    expect('<Classes>' in root).toBe(false)
    expect('<Areas>' in root).toBe(false)
    expect(changed.sort()).toEqual(['<Areas>', '<Classes>', '<Projects>'])
  })

  it('a live reconcile keeps an empty list, a bare key, and a key naming only an unknown Space as written', () => {
    const r = reconcileGovernedRoot(emptied, { ...world, contexts: withAreas })
    expect(r.root).toEqual(emptied)
    expect(r.changed).toEqual([])
  })

  it('writes a Space named twice once', () => {
    expect(
      reconcileGovernedRoot({ '<Projects>': ['Pommora', 'Pommora'] }, world).root['<Projects>'],
    ).toEqual(['Pommora'])
  })

  it('reads a scalar Context value as a list of one, so a hand-typed tag resolves', () => {
    const { root, changed } = reconcileGovernedRoot({ '<Projects>': 'Pommora' }, world)
    expect(root['<Projects>']).toEqual(['Pommora'])
    expect(changed).toEqual(['<Projects>'])
    expect(resolveContextKeys({ '<Projects>': 'Pommora' }, contexts).get('ctx_projects')).toEqual([
      'sp1',
    ])
  })

  it('leaves unknown wrapped keys and foreign keys verbatim', () => {
    const input = { '<Nonexistent>': ['x'], title_note: 'keep', '<Projects>': ['Pommora'] }
    const { root, changed } = reconcileGovernedRoot(input, world)
    expect(root).toEqual(input)
    expect(changed).toEqual([])
  })

  it('a world holding no Contexts skips the context arm while the property arm still runs', () => {
    const { root, changed } = reconcileGovernedRoot(
      { '<Projects>': ['pommora'], Status: 'Active' },
      { ...world, contexts: contextWorldOf([]) },
    )
    expect(root['<Projects>']).toEqual(['pommora'])
    expect(root.Status).toEqual(['Active'])
    expect(changed).toEqual(['Status'])
  })
})

describe('reconcileGovernedRoot — the property arm', () => {
  it('a free-typed key keeps a foreign shape as written, live and frozen alike', () => {
    for (const raw of [42, true, ['milk', 'eggs'], [['Page']]]) {
      const live = reconcileGovernedRoot({ Notes: raw }, world)
      expect(live.root).toEqual({ Notes: raw })
      expect(live.changed).toEqual([])
      const frozen = reconcileGovernedRoot({ Notes: raw }, world, {})
      expect(frozen.root).toEqual({ Notes: raw })
      expect(frozen.changed).toEqual([])
    }
  })

  it('re-encodes an assigned key as its definition reads it', () => {
    const { root, changed } = reconcileGovernedRoot({ Status: 'Active' }, world)
    expect(root.Status).toEqual(['Active'])
    expect(changed).toEqual(['Status'])
  })

  it('keeps a list that already reads canonically, unchanged', () => {
    const { changed } = reconcileGovernedRoot({ Status: ['Active'] }, world)
    expect(changed).toEqual([])
  })

  it('keeps an assigned key whose value reads as nothing as written, and a restore deletes it', () => {
    const live = reconcileGovernedRoot({ Status: ['Wip'] }, world)
    expect(live.root).toEqual({ Status: ['Wip'] })
    expect(live.changed).toEqual([])
    const frozen = reconcileGovernedRoot({ Status: ['Wip'] }, world, {})
    expect('Status' in frozen.root).toBe(false)
    expect(frozen.changed).toEqual(['Status'])
  })

  it('a Multi-Select keeps an unregistered option', () => {
    const { root, changed } = reconcileGovernedRoot({ Tags: ['alpha', 'zeta'] }, world)
    expect(root.Tags).toEqual(['alpha', 'zeta'])
    expect(changed).toEqual([])
  })

  it('a registered key the Collection does not assign passes verbatim', () => {
    const { root, changed } = reconcileGovernedRoot({ Priority: 5 }, world)
    expect(root.Priority).toBe(5)
    expect(changed).toEqual([])
  })

  it('agrees with decodeValue on every fixture (the crossing)', () => {
    for (const raw of [['Active'], 'Active', ['Open', 'Active'], ['Active', 'Wip'], ['Wip'], ''])
      expect(
        decodeValue(statusDef, reconcileGovernedRoot({ Status: raw }, world).root.Status),
      ).toEqual(decodeValue(statusDef, raw))
  })
})

describe('reconcileGovernedRoot — option, checkbox, and number spellings (the crossing)', () => {
  const doneDef: PropertyDefinition = {
    id: 'prop_done',
    label: 'Done',
    key: 'Done',
    type: 'checkbox',
  }
  const priceDef: PropertyDefinition = {
    id: 'prop_price',
    label: 'Price',
    key: 'Price',
    type: 'number',
  }
  const spelled: GovernedWorld = { ...world, defs: byKey([stageDef, doneDef, priceDef]) }
  const input = { Stage: ['done'], Done: 'Yes', Price: '$1,200.00' }

  it('keeps an option word in another casing as written, naming no option, beside the checkbox and number spellings', () => {
    const { root } = reconcileGovernedRoot(input, spelled)
    expect(root).toEqual(input)
    expect(decodeValue(stageDef, root.Stage)).toEqual({ kind: 'null' })
    expect(decodeValue(doneDef, root.Done)).toEqual({ kind: 'checkbox', value: true })
    expect(decodeValue(priceDef, root.Price)).toEqual({ kind: 'number', value: 1200 })
  })
})

describe('reconcileGovernedRoot — another casing', () => {
  it('leaves another casing of a list key and of a Context key as written', () => {
    const input = { tags: ['a'], '<projects>': ['pommora'] }
    const { root, changed } = reconcileGovernedRoot(input, world)
    expect(root).toEqual(input)
    expect(changed).toEqual([])
  })

  it("leaves a scalar key in another casing beside the property's own as written, as foreign", () => {
    const { root, changed } = reconcileGovernedRoot({ Status: ['Open'], status: 'Done' }, world)
    expect(root).toEqual({ Status: ['Open'], status: 'Done' })
    expect(changed).toEqual([])
  })

  it('leaves a Context key naming an unknown Space wholly as written', () => {
    const input = { '<Projects>': ['pommora', 'Ghost'], '<projects>': ['CS 161'] }
    const { root, changed } = reconcileGovernedRoot(input, world)
    expect(root).toEqual(input)
    expect(changed).toEqual([])
  })

  it('a restore drops a key reading as nothing and leaves another casing of it as written', () => {
    const { root, changed } = reconcileGovernedRoot(
      { Stage: ['Bogus'], stage: ['Done'] },
      world,
      {},
    )
    expect(root).toEqual({ stage: ['Done'] })
    expect(changed).toEqual(['Stage'])
  })
})

describe('reconcileGovernedRoot — skip', () => {
  it('passes the skipped key verbatim, and a key in another casing as foreign', () => {
    const input = { Status: 'Open', status: 'Done' }
    const { root, changed } = reconcileGovernedRoot(input, world, undefined, 'Status')
    expect(root).toEqual(input)
    expect(changed).toEqual([])
  })
})
