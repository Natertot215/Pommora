import { describe, expect, it } from 'vitest'
import {
  contextWorldOf,
  type GovernedWorld,
  reconcileGovernedRoot,
  resolveContextKeys,
} from './contextResolve'
import { byFoldedName, type PropertyDefinition } from '../Properties/properties'
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

  it('matches values through coercion + NFC (scalars, case, whitespace)', () => {
    const links = resolveContextKeys(
      { '<Classes>': [2024, true], '<Projects>': [' pommora '] },
      contexts,
    )
    expect(links.get('ctxA')).toEqual(['sp3', 'sp4'])
    expect(links.get('ctx_projects')).toEqual(['sp1'])
  })

  it('drops only the unmatched values, keeping valid siblings', () => {
    const links = resolveContextKeys({ '<Projects>': ['Pommora', 'Pomora'] }, contexts)
    expect(links.get('ctx_projects')).toEqual(['sp1'])
  })

  it('matches a key without regard to case, joining every spelling', () => {
    expect(resolveContextKeys({ '<projects>': ['Pommora'] }, contexts).get('ctx_projects')).toEqual(
      ['sp1'],
    )
    const both = resolveContextKeys(
      { '<projects>': ['CS 161'], '<Projects>': ['Pommora'] },
      contexts,
    )
    expect(both.get('ctx_projects')).toEqual(['sp2', 'sp1'])
  })

  it('reads a spelling holding values beside an empty one', () => {
    const links = resolveContextKeys({ '<Projects>': null, '<projects>': ['Pommora'] }, contexts)
    expect(links.get('ctx_projects')).toEqual(['sp1'])
  })
})

const statusDef: PropertyDefinition = {
  id: 'prop_status',
  name: 'Status',
  type: 'select',
  select_options: [{ value: 'Open' }, { value: 'Active' }],
}
const tagsDef: PropertyDefinition = {
  id: 'prop_tags',
  name: 'Tags',
  type: 'multiSelect',
  select_options: [{ value: 'alpha' }],
}
const stageDef: PropertyDefinition = {
  id: 'prop_stage',
  name: 'Stage',
  type: 'select',
  select_options: [{ value: 'Done' }, { value: 'Open' }],
}
const notesDef: PropertyDefinition = { id: 'prop_notes', name: 'Notes', type: 'text' }
const world: GovernedWorld = {
  contexts,
  defs: byFoldedName([statusDef, tagsDef, stageDef, notesDef]),
}

describe('reconcileGovernedRoot — the context arm', () => {
  it('drops unknowns, keeping each known Space as the file spells it', () => {
    const { root, changed } = reconcileGovernedRoot(
      { '<Projects>': ['pommora', 'Pomora', 'CS 161'] },
      world,
      {},
    )
    expect(root['<Projects>']).toEqual(['pommora', 'CS 161'])
    expect(changed).toEqual(['<Projects>'])
  })

  it('a live reconcile leaves a list naming an unknown Space as written', () => {
    const input = { '<Projects>': ['pommora', 'Pomora', 'CS 161'] }
    const { root, changed } = reconcileGovernedRoot(input, world)
    expect(root).toEqual(input)
    expect(changed).toEqual([])
  })

  it('repairs scalar-typed values to their canonical string titles', () => {
    const { root } = reconcileGovernedRoot({ '<Classes>': [2024, true] }, world)
    expect(root['<Classes>']).toEqual(['2024', 'true'])
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

  it('writes a Space named twice in two casings once, in its registered spelling', () => {
    for (const twice of [
      ['Pommora', 'pommora'],
      ['pommora', 'Pommora'],
    ])
      expect(reconcileGovernedRoot({ '<Projects>': twice }, world).root['<Projects>']).toEqual([
        'Pommora',
      ])
  })

  it('reads a scalar Context value as a list of one, keeping its spelling, so a hand-typed tag resolves', () => {
    const { root, changed } = reconcileGovernedRoot({ '<Projects>': 'pommora' }, world)
    expect(root['<Projects>']).toEqual(['pommora'])
    expect(changed).toEqual(['<Projects>'])
    expect(resolveContextKeys({ '<Projects>': 'pommora' }, contexts).get('ctx_projects')).toEqual([
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

describe('reconcileGovernedRoot — option and checkbox casing (the crossing)', () => {
  const doneDef: PropertyDefinition = { id: 'prop_done', name: 'Done', type: 'checkbox' }
  const casing: GovernedWorld = { ...world, defs: byFoldedName([stageDef, doneDef]) }
  const input = { Stage: ['done'], Done: 'Yes' }

  it('keeps each value as the file spells it, reading it as registered', () => {
    const { root } = reconcileGovernedRoot(input, casing)
    expect(root).toEqual(input)
    expect(decodeValue(stageDef, root.Stage)).toEqual({ kind: 'select', value: 'Done' })
    expect(decodeValue(doneDef, root.Done)).toEqual({ kind: 'checkbox', value: true })
  })

  it('writes a Multi-Select holding two casings of one option as that option once', () => {
    const labels: PropertyDefinition = { ...tagsDef, select_options: [{ value: 'Done' }] }
    const held = { ...casing, defs: byFoldedName([labels]) }
    const twice = { Tags: ['done', 'Done', 'x'] }
    expect(reconcileGovernedRoot(twice, held).root).toEqual({ Tags: ['Done', 'x'] })
  })
})

describe('reconcileGovernedRoot — spellings', () => {
  it('reconciles a lone spelling under the key the file holds', () => {
    const { root, changed } = reconcileGovernedRoot({ status: 'Open' }, world)
    expect(root).toEqual({ status: ['Open'] })
    expect(changed).toEqual(['status'])
  })

  it('leaves a lone list spelling and a lone Context key where the file holds them', () => {
    const input = { tags: ['a'], '<projects>': ['pommora'] }
    const { root, changed } = reconcileGovernedRoot(input, world)
    expect(root).toEqual(input)
    expect(changed).toEqual([])
  })

  it('joins two spellings of a list under the registered spelling', () => {
    const { root, changed } = reconcileGovernedRoot({ tags: ['a'], Tags: ['b'] }, world)
    expect(root).toEqual({ Tags: ['a', 'b'] })
    expect(changed.sort()).toEqual(['Tags', 'tags'])
  })

  it('joins under the registered spelling when the file holds it in no exact spelling', () => {
    const { root } = reconcileGovernedRoot({ tags: ['a'], TAGS: ['b'] }, world)
    expect(root).toEqual({ Tags: ['a', 'b'] })
  })

  it('joins two spellings of a Context key under its registered spelling', () => {
    const input = { '<projects>': ['pommora'], '<PROJECTS>': ['CS 161'] }
    expect(reconcileGovernedRoot(input, world).root).toEqual({
      '<Projects>': ['pommora', 'CS 161'],
    })
  })

  it("leaves a scalar's second spelling verbatim, as foreign, for a write to settle", () => {
    const { root, changed } = reconcileGovernedRoot({ Status: ['Open'], status: 'Done' }, world)
    expect(root).toEqual({ Status: ['Open'], status: 'Done' })
    expect(changed).toEqual([])
  })

  it('leaves a Context key naming an unknown Space wholly as written, its spellings unjoined', () => {
    const input = { '<Projects>': ['pommora', 'Ghost'], '<projects>': ['CS 161'] }
    const { root, changed } = reconcileGovernedRoot(input, world)
    expect(root).toEqual(input)
    expect(changed).toEqual([])
  })

  it('a restore that empties a list drops every spelling of it', () => {
    const r = reconcileGovernedRoot({ tags: ['zeta'], Tags: ['eta'] }, world, {})
    expect(r.root).toEqual({})
    expect(r.changed.sort()).toEqual(['Tags', 'tags'])
    const ctx = reconcileGovernedRoot({ '<projects>': ['Dead'], '<Projects>': ['Gone'] }, world, {})
    expect(ctx.root).toEqual({})
  })

  it('a retired scalar spelling waits on its key being written', () => {
    const { root, changed } = reconcileGovernedRoot(
      { Stage: ['Bogus'], stage: ['Done'] },
      world,
      {},
    )
    expect(root).toEqual({ stage: ['Done'] })
    expect(changed).toEqual(['Stage'])
  })

  it('a join that would lose a member is withheld, every spelling left as written', () => {
    const original = { tags: ['', 'alpha'], TAGS: ['beta'] }
    const r = reconcileGovernedRoot(original, world)
    expect(r.root).toEqual(original)
    expect(r.changed).toEqual([])
  })
})

describe('reconcileGovernedRoot — skip', () => {
  it('passes a skipped key and a second spelling of it verbatim', () => {
    const input = { Status: 'Open', status: 'Done' }
    const { root, changed } = reconcileGovernedRoot(input, world, undefined, ['Status'])
    expect(root).toEqual(input)
    expect(changed).toEqual([])
  })
})
