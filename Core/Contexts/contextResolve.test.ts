import { describe, expect, it } from 'vitest'
import { contextWorldOf, resolveContextKeys } from './contextResolve'
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

  it('matches values through coercion and trimming, only as the Space is titled, and only a scalar names a Space', () => {
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
