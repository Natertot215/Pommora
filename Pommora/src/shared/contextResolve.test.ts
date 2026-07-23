import { describe, expect, it } from 'vitest'
import { legacyTierLinks, reconcileContextKeys, resolveContextKeys } from './contextResolve'
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
    { id: '_tier3', title: 'Projects', singular: 'Project' },
    { id: 'ctxA', title: 'Classes', singular: 'Class' },
  ],
}

const spacesByContext = new Map<string, SpaceNode[]>([
  ['_tier3', [space('sp1', 'Pommora', '_tier3'), space('sp2', 'CS 161', '_tier3')]],
  ['ctxA', [space('sp3', '2024', 'ctxA'), space('sp4', 'true', 'ctxA')]],
])

describe('resolveContextKeys', () => {
  it('resolves a valid bracketed key + exact values to ids', () => {
    const links = resolveContextKeys(
      { '[Projects]': ['Pommora', 'CS 161'] },
      registry,
      spacesByContext,
    )
    expect(links.get('_tier3')).toEqual(['sp1', 'sp2'])
  })

  it('ignores unbracketed keys and unknown titles', () => {
    const links = resolveContextKeys(
      { Projects: ['Pommora'], '[Nonexistent]': ['Pommora'] },
      registry,
      spacesByContext,
    )
    expect(links.size).toBe(0)
  })

  it('matches values through coercion + NFC (scalars, case, whitespace)', () => {
    const links = resolveContextKeys(
      { '[Classes]': [2024, true], '[Projects]': [' pommora '] },
      registry,
      spacesByContext,
    )
    expect(links.get('ctxA')).toEqual(['sp3', 'sp4'])
    expect(links.get('_tier3')).toEqual(['sp1'])
  })

  it('drops only the unmatched values, keeping valid siblings', () => {
    const links = resolveContextKeys(
      { '[Projects]': ['Pommora', 'Pomora'] },
      registry,
      spacesByContext,
    )
    expect(links.get('_tier3')).toEqual(['sp1'])
  })
})

describe('reconcileContextKeys', () => {
  it('repairs near-misses, drops unknowns, keeps exacts', () => {
    const { root, changed } = reconcileContextKeys(
      { '[Projects]': ['pommora', 'Pomora', 'CS 161'] },
      registry,
      spacesByContext,
    )
    expect(root['[Projects]']).toEqual(['Pommora', 'CS 161'])
    expect(changed).toBe(true)
  })

  it('repairs scalar-typed values to their canonical string titles', () => {
    const { root, changed } = reconcileContextKeys(
      { '[Classes]': [2024, true] },
      registry,
      spacesByContext,
    )
    expect(root['[Classes]']).toEqual(['2024', 'true'])
    expect(changed).toBe(true)
  })

  it('removes a key whose values all drop (no empties)', () => {
    const { root, changed } = reconcileContextKeys(
      { '[Projects]': ['Pomora'], '[Classes]': [] },
      registry,
      spacesByContext,
    )
    expect('[Projects]' in root).toBe(false)
    expect('[Classes]' in root).toBe(false)
    expect(changed).toBe(true)
  })

  it('leaves unknown bracketed keys and non-context keys verbatim', () => {
    const input = {
      '[Nonexistent]': ['Whatever'],
      title_note: 'keep',
      '[Projects]': ['Pommora'],
    }
    const { root, changed } = reconcileContextKeys(input, registry, spacesByContext)
    expect(root['[Nonexistent]']).toEqual(['Whatever'])
    expect(root.title_note).toBe('keep')
    expect(root['[Projects]']).toEqual(['Pommora'])
    expect(changed).toBe(false)
  })
})

describe('legacyTierLinks', () => {
  it('resolves bare tierN ULID arrays through the reserved registry ids', () => {
    const links = legacyTierLinks({ tier3: ['sp1', 'sp2'] }, registry)
    expect(links.get('_tier3')).toEqual(['sp1', 'sp2'])
  })

  it('ignores tiers absent from the registry', () => {
    const links = legacyTierLinks({ tier1: ['x'] }, registry)
    expect(links.size).toBe(0)
  })
})
