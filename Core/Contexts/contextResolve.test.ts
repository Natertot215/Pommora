import { describe, expect, it } from 'vitest'
import {
  contextWorldOf,
  type GovernedWorld,
  reconcileGovernedRoot,
  survivingChanges,
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

  it('matches a key without regard to case, resolving only the spelling it reads', () => {
    expect(resolveContextKeys({ '<projects>': ['Pommora'] }, contexts).get('ctx_projects')).toEqual(
      ['sp1'],
    )
    const both = resolveContextKeys(
      { '<projects>': ['CS 161'], '<Projects>': ['Pommora'] },
      contexts,
    )
    expect(both.get('ctx_projects')).toEqual(['sp1'])
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
const world: GovernedWorld = {
  contexts,
  defs: byFoldedName([statusDef, tagsDef, stageDef]),
  resolveCase: false,
}
const resolving: GovernedWorld = { ...world, resolveCase: true }

describe('reconcileGovernedRoot — the context arm', () => {
  it('repairs near-misses, drops unknowns, keeps exacts', () => {
    const { root, changed } = reconcileGovernedRoot(
      { '<Projects>': ['pommora', 'Pomora', 'CS 161'] },
      resolving,
      {},
    )
    expect(root['<Projects>']).toEqual(['Pommora', 'CS 161'])
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
    const { root, changed } = reconcileGovernedRoot(
      emptied,
      { ...resolving, contexts: withAreas },
      {},
    )
    expect('<Projects>' in root).toBe(false)
    expect('<Classes>' in root).toBe(false)
    expect('<Areas>' in root).toBe(false)
    expect(changed.sort()).toEqual(['<Areas>', '<Classes>', '<Projects>'])
  })

  it('a live reconcile writes nothing for an empty list, a bare key, or a key naming only an unknown Space', () => {
    const r = reconcileGovernedRoot(emptied, { ...world, contexts: withAreas })
    expect(r.changed.sort()).toEqual(['<Areas>', '<Classes>', '<Projects>'])
    expect(survivingChanges(r)).toEqual({})
  })

  it('writes a Space named twice in two casings once', () => {
    const on = reconcileGovernedRoot({ '<Projects>': ['Pommora', 'pommora'] }, resolving)
    expect(on.root['<Projects>']).toEqual(['Pommora'])
    const off = reconcileGovernedRoot({ '<Projects>': ['pommora', 'Pommora'] }, world)
    expect(off.root['<Projects>']).toEqual(['Pommora'])
  })

  it('reads a scalar Context value as a list of one, so a hand-typed tag repairs and resolves', () => {
    const { root, changed } = reconcileGovernedRoot({ '<Projects>': 'pommora' }, resolving)
    expect(root['<Projects>']).toEqual(['Pommora'])
    expect(changed).toEqual(['<Projects>'])
    expect(resolveContextKeys({ '<Projects>': 'Pommora' }, contexts).get('ctx_projects')).toEqual([
      'sp1',
    ])
  })

  it('with case resolution off, reads a scalar Context value as a list of one, keeping its spelling', () => {
    const { root, changed } = reconcileGovernedRoot({ '<Projects>': 'pommora' }, world)
    expect(root['<Projects>']).toEqual(['pommora'])
    expect(changed).toEqual(['<Projects>'])
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
  it('re-encodes an assigned key as its definition reads it', () => {
    const { root, changed, adoptions } = reconcileGovernedRoot({ Status: 'Active' }, world)
    expect(root.Status).toEqual(['Active'])
    expect(changed).toEqual(['Status'])
    expect(adoptions).toEqual([])
  })

  it('keeps a list that already reads canonically, unchanged', () => {
    const { changed } = reconcileGovernedRoot({ Status: ['Active'] }, world)
    expect(changed).toEqual([])
  })

  it('deletes an assigned key whose value reads as nothing', () => {
    const { root, changed } = reconcileGovernedRoot({ Status: ['Wip'] }, world)
    expect('Status' in root).toBe(false)
    expect(changed).toEqual(['Status'])
  })

  it('a Multi-Select keeps an unregistered option and reports it for adoption', () => {
    const { root, changed, adoptions } = reconcileGovernedRoot({ Tags: ['alpha', 'zeta'] }, world)
    expect(root.Tags).toEqual(['alpha', 'zeta'])
    expect(changed).toEqual([])
    expect(adoptions).toEqual([{ propertyId: 'prop_tags', value: 'zeta' }])
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

  it('with case resolution off, keeps each value as the file spells it, reading it as registered', () => {
    const { root } = reconcileGovernedRoot(input, casing)
    expect(root).toEqual(input)
    expect(decodeValue(stageDef, root.Stage)).toEqual({ kind: 'select', value: 'Done' })
    expect(decodeValue(doneDef, root.Done)).toEqual({ kind: 'checkbox', value: true })
  })

  it('writes the registered option and true with case resolution on', () => {
    const { root } = reconcileGovernedRoot(input, { ...casing, resolveCase: true })
    expect(root).toEqual({ Stage: ['Done'], Done: true })
  })

  it('writes a Multi-Select holding two casings of one option as that option once', () => {
    const labels: PropertyDefinition = { ...tagsDef, select_options: [{ value: 'Done' }] }
    const held = { ...casing, defs: byFoldedName([labels]) }
    const twice = { Tags: ['done', 'Done', 'x'] }
    expect(reconcileGovernedRoot(twice, held).root).toEqual({ Tags: ['Done', 'x'] })
    expect(reconcileGovernedRoot(twice, { ...held, resolveCase: true }).root).toEqual({
      Tags: ['Done', 'x'],
    })
  })
})

describe('reconcileGovernedRoot — spellings with case resolution off', () => {
  it('reconciles a folded key under the spelling the file holds', () => {
    const { root, changed } = reconcileGovernedRoot({ status: 'Open' }, world)
    expect(root).toEqual({ status: ['Open'] })
    expect(changed).toEqual(['status'])
  })

  it('leaves a second spelling verbatim, as foreign', () => {
    const { root, changed } = reconcileGovernedRoot({ Status: ['Open'], status: 'Done' }, world)
    expect(root.status).toBe('Done')
    expect(changed).not.toContain('status')
  })
})

describe('reconcileGovernedRoot — spellings with case resolution on', () => {
  it('moves a key to its registered spelling and retires the one it read', () => {
    const { root, changed, retired } = reconcileGovernedRoot({ tags: ['a'] }, resolving)
    expect(root).toEqual({ Tags: ['a'] })
    expect(changed.sort()).toEqual(['Tags', 'tags'])
    expect([...retired]).toEqual(['tags'])
  })

  it('joins two spellings of a list', () => {
    expect(reconcileGovernedRoot({ Tags: ['b'], tags: ['a'] }, resolving).root).toEqual({
      Tags: ['b', 'a'],
    })
  })

  it('keeps any other value from the key it reads, still retiring the other spelling', () => {
    const { root, changed } = reconcileGovernedRoot({ Stage: ['Done'], stage: ['Open'] }, resolving)
    expect(root).toEqual({ Stage: ['Done'] })
    expect(changed.sort()).toEqual(['Stage', 'stage'])
  })

  it('writes a Context key and its Space titles in their registered spelling', () => {
    expect(reconcileGovernedRoot({ '<projects>': ['pommora'] }, resolving).root).toEqual({
      '<Projects>': ['Pommora'],
    })
  })

  it('leaves a Context key naming an unknown Space wholly as written, its spellings unjoined', () => {
    const input = { '<Projects>': ['pommora', 'Ghost'], '<projects>': ['CS 161'] }
    const { root, changed, retired } = reconcileGovernedRoot(input, resolving)
    expect(root).toEqual(input)
    expect(changed).toEqual([])
    expect(retired.size).toBe(0)
  })

  it('a retired spelling waits on its key being written', () => {
    const { root, changed, retired } = reconcileGovernedRoot(
      { Stage: ['Bogus'], stage: ['Done'] },
      resolving,
      {},
    )
    expect(root.stage).toEqual(['Done'])
    expect(changed).toContain('Stage')
    expect(retired.size).toBe(0)
  })
})

describe('survivingChanges', () => {
  it('deletes a retired spelling when its key survives', () => {
    const original = { Tags: ['alpha'], tags: ['beta'] }
    const kept = survivingChanges(reconcileGovernedRoot(original, resolving))
    expect(kept).toEqual({ Tags: ['alpha', 'beta'], tags: undefined })
    expect('tags' in kept).toBe(true)
  })

  it('a join that would lose a member is withheld, every spelling left as written', () => {
    const original = { tags: ['', 'alpha'], TAGS: ['beta'] }
    const r = reconcileGovernedRoot(original, resolving)
    expect(r.root).toEqual(original)
    expect(survivingChanges(r)).toEqual({})
  })
})

describe('reconcileGovernedRoot — skip', () => {
  it('with case resolution off, passes a skipped key and a second spelling of it verbatim', () => {
    const input = { Status: 'Open', status: 'Done' }
    const { root, changed } = reconcileGovernedRoot(input, world, undefined, ['Status'])
    expect(root).toEqual(input)
    expect(changed).toEqual([])
  })
})
