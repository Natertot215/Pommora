import { describe, it, expect } from 'vitest'
import { containerCreators } from './mutate'

describe('containerCreators — a container offers the same things wherever it is asked', () => {
  const ops = (kind: 'collection' | 'set'): string[] =>
    containerCreators(kind, 'Some/Path').map((c) => c.req.op)

  it('offers a Set the same operations it offers a Collection', () => {
    // The defect this pins: the sidebar's context menu gave a Set no way to make a nested one,
    // while the subfield's add button did. Sets nest to any depth, so the pair is the same.
    expect(ops('set')).toEqual(ops('collection'))
    expect(ops('collection')).toEqual(['createPage', 'createContainer'])
  })

  it('names the nested container by depth', () => {
    const label = (kind: 'collection' | 'set'): string => containerCreators(kind, 'p')[1].label
    expect(label('collection')).toBe('New Set')
    expect(label('set')).toBe('New Sub-Set')
  })

  it('creates into the container it was asked about', () => {
    for (const c of containerCreators('set', 'A/B')) {
      expect('parentPath' in c.req && c.req.parentPath).toBe('A/B')
    }
  })
})
