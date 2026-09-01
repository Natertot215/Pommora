import { describe, expect, it } from 'vitest'
import { type GovernedWorld, reconcileGovernedRoot, resolveContextKeys } from './contextResolve'
import type { PropertyDefinition } from './properties'
import { decodeValue } from './propertyValue'
import type { ContextsRegistry } from './contexts'
import type { SpaceNode } from './types'

const space = (id: string, title: string, contextId: string): SpaceNode => ({
  id,
  kind: 'space',
  title,
  path: `.nexus/contexts/X/${title}`,
  contextId,
})

const registry: ContextsRegistry = {
  contexts: [
    { id: 'ctx_projects', title: 'Projects', singular: 'Project' },
    { id: 'ctxA', title: 'Classes', singular: 'Class' },
  ],
}

const spacesByContext = new Map<string, SpaceNode[]>([
  [
    'ctx_projects',
    [space('sp1', 'Pommora', 'ctx_projects'), space('sp2', 'CS 161', 'ctx_projects')],
  ],
  ['ctxA', [space('sp3', '2024', 'ctxA'), space('sp4', 'true', 'ctxA')]],
])

describe('resolveContextKeys', () => {
  it('resolves a valid wrapped key + exact values to ids', () => {
    const links = resolveContextKeys(
      { '<Projects>': ['Pommora', 'CS 161'] },
      registry,
      spacesByContext,
    )
    expect(links.get('ctx_projects')).toEqual(['sp1', 'sp2'])
  })

  it('ignores unbracketed keys and unknown titles', () => {
    const links = resolveContextKeys(
      { Projects: ['Pommora'], '<Nonexistent>': ['Pommora'] },
      registry,
      spacesByContext,
    )
    expect(links.size).toBe(0)
  })

  it('matches values through coercion + NFC (scalars, case, whitespace)', () => {
    const links = resolveContextKeys(
      { '<Classes>': [2024, true], '<Projects>': [' pommora '] },
      registry,
      spacesByContext,
    )
    expect(links.get('ctxA')).toEqual(['sp3', 'sp4'])
    expect(links.get('ctx_projects')).toEqual(['sp1'])
  })

  it('drops only the unmatched values, keeping valid siblings', () => {
    const links = resolveContextKeys(
      { '<Projects>': ['Pommora', 'Pomora'] },
      registry,
      spacesByContext,
    )
    expect(links.get('ctx_projects')).toEqual(['sp1'])
  })
})

const statusDef: PropertyDefinition = {
  id: 'prop_status',
  name: 'Status',
  type: 'select',
  select_options: [
    { value: 'Open', label: 'Open' },
    { value: 'Active', label: 'Active' },
  ],
}
const tagsDef: PropertyDefinition = {
  id: 'prop_tags',
  name: 'Tags',
  type: 'multi_select',
  select_options: [{ value: 'alpha', label: 'alpha' }],
}
const world: GovernedWorld = {
  registry,
  spacesByContext,
  defs: new Map([
    ['Status', statusDef],
    ['Tags', tagsDef],
  ]),
}

describe('reconcileGovernedRoot — the context arm', () => {
  it('repairs near-misses, drops unknowns, keeps exacts', () => {
    const { root, changed } = reconcileGovernedRoot(
      { '<Projects>': ['pommora', 'Pomora', 'CS 161'] },
      world,
    )
    expect(root['<Projects>']).toEqual(['Pommora', 'CS 161'])
    expect(changed).toEqual(['<Projects>'])
  })

  it('repairs scalar-typed values to their canonical string titles', () => {
    const { root } = reconcileGovernedRoot({ '<Classes>': [2024, true] }, world)
    expect(root['<Classes>']).toEqual(['2024', 'true'])
  })

  it('removes a key whose values all drop, and a present-but-empty list (no empties)', () => {
    const { root, changed } = reconcileGovernedRoot(
      { '<Projects>': ['Pomora'], '<Classes>': [] },
      world,
    )
    expect('<Projects>' in root).toBe(false)
    expect('<Classes>' in root).toBe(false)
    expect(changed.sort()).toEqual(['<Classes>', '<Projects>'])
  })

  it('leaves unknown wrapped keys and foreign keys verbatim', () => {
    const input = { '<Nonexistent>': ['x'], title_note: 'keep', '<Projects>': ['Pommora'] }
    const { root, changed } = reconcileGovernedRoot(input, world)
    expect(root).toEqual(input)
    expect(changed).toEqual([])
  })

  it('a null registry skips the context arm while the property arm still runs', () => {
    const { root, changed } = reconcileGovernedRoot(
      { '<Projects>': ['pommora'], Status: 'Active' },
      { ...world, registry: null },
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
