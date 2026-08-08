import { describe, it, expect } from 'vitest'
import { containerCreators } from './mutate'
import { DEFAULT_LABELS, type NexusLabels } from './types'

describe('containerCreators — a container offers the same things wherever it is asked', () => {
  const ops = (kind: 'collection' | 'set'): string[] =>
    containerCreators(kind, 'Some/Path', DEFAULT_LABELS).map((c) => c.req.op)

  it('offers a Set the same operations it offers a Collection', () => {
    // The defect this pins: the sidebar's context menu gave a Set no way to make a nested one,
    // while the subfield's add button did. Sets nest to any depth, so the pair is the same.
    expect(ops('set')).toEqual(ops('collection'))
    expect(ops('collection')).toEqual(['createPage', 'createContainer'])
  })

  it('names the nested container by depth', () => {
    const label = (kind: 'collection' | 'set'): string =>
      containerCreators(kind, 'p', DEFAULT_LABELS)[1].label
    expect(label('collection')).toBe('New Set')
    expect(label('set')).toBe('New Sub-Set')
  })

  it('takes the nested label from the nexus, not a literal', () => {
    const renamed: NexusLabels = {
      ...DEFAULT_LABELS,
      pageSet: { singular: 'Folder', plural: 'Folders' },
    }
    expect(containerCreators('collection', 'p', renamed)[1].label).toBe('New Folder')
    expect(containerCreators('set', 'p', renamed)[1].label).toBe('New Sub-Folder')
  })

  it('creates into the container it was asked about', () => {
    for (const c of containerCreators('set', 'A/B', DEFAULT_LABELS)) {
      expect('parentPath' in c.req && c.req.parentPath).toBe('A/B')
    }
  })
})
