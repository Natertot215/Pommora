import { describe, expect, it } from 'vitest'
import type { EntityRecord } from '@shared/record'
import type { Baseline } from './record'
import { adjudicate } from './remint'

const claim = (path: string, over: Partial<EntityRecord> = {}): EntityRecord => ({
  id: 'page-dup',
  kind: 'page',
  title: path.split('/').pop() ?? path,
  path,
  state: 'present',
  ...over,
})

const priorAt = (path: string, over: Partial<Baseline[string]> = {}): Baseline => ({
  'page-dup': {
    id: 'page-dup',
    kind: 'page',
    title: 'Original',
    path,
    state: 'present',
    ...over,
  },
})

const dupes = (...claims: EntityRecord[]) => ({ 'page-dup': claims })

describe('adjudicate', () => {
  it('with no baseline, everything defers and nothing re-mints', () => {
    const out = adjudicate(dupes(claim('Library/A.md'), claim('Library/B.md')), null, [])
    expect(out.remint).toEqual([])
    expect(out.defer).toEqual(['page-dup'])
  })

  it('the claimant at the recorded path is the original; every other claimant re-mints', () => {
    const out = adjudicate(
      dupes(claim('Library/Original.md'), claim('Library/Copy.md')),
      priorAt('Library/Original.md'),
      [],
    )
    expect(out.defer).toEqual([])
    expect(out.remint).toEqual([{ id: 'page-dup', kind: 'page', path: 'Library/Copy.md' }])
  })

  it('three claimants: one original, two re-mints', () => {
    const out = adjudicate(
      dupes(claim('Library/Original.md'), claim('Library/Copy.md'), claim('Library/Copy 2.md')),
      priorAt('Library/Original.md'),
      [],
    )
    expect(out.remint.map((r) => r.path).sort()).toEqual(['Library/Copy 2.md', 'Library/Copy.md'])
  })

  it('an unreadable recorded path defers — never guess at the original', () => {
    const out = adjudicate(
      dupes(claim('Library/Original.md'), claim('Library/Copy.md')),
      priorAt('Library/Original.md'),
      ['Library/Original.md'],
    )
    expect(out.remint).toEqual([])
    expect(out.defer).toEqual(['page-dup'])
  })

  it('no claimant at the recorded path defers — the drop is the writer’s verb', () => {
    const out = adjudicate(
      dupes(claim('Library/A.md'), claim('Library/B.md')),
      priorAt('Elsewhere/Original.md'),
      [],
    )
    expect(out.remint).toEqual([])
    expect(out.defer).toEqual(['page-dup'])
  })

  it('a preserved ambiguous path is spent the session its claimant reads again', () => {
    const out = adjudicate(
      dupes(claim('Library/Original.md'), claim('Library/Copy.md')),
      priorAt('Library/Original.md', { ambiguous: true }),
      [],
    )
    expect(out.remint).toEqual([{ id: 'page-dup', kind: 'page', path: 'Library/Copy.md' }])
    expect(out.defer).toEqual([])
  })

  it('containers adjudicate exactly like content', () => {
    const set = (path: string): EntityRecord => ({
      id: 'set-dup',
      kind: 'set',
      title: 'Fiction',
      path,
      state: 'present',
    })
    const out = adjudicate(
      { 'set-dup': [set('Library/Fiction'), set('Library/Fiction copy')] },
      {
        'set-dup': {
          id: 'set-dup',
          kind: 'set',
          title: 'Fiction',
          path: 'Library/Fiction',
          state: 'present',
        },
      },
      [],
    )
    expect(out.remint).toEqual([{ id: 'set-dup', kind: 'set', path: 'Library/Fiction copy' }])
  })
})
