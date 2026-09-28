import { describe, expect, it } from 'vitest'
import { containerCreators, createMenuItems, createdRequest, spaceCreator } from './createMenu'

const creators = [
  { label: 'New Page', req: { op: 'createPage' as const, parentPath: 'Notes', name: 'Untitled' } },
  {
    label: 'New Set',
    req: {
      op: 'createContainer' as const,
      parentPath: 'Notes',
      kind: 'set' as const,
      name: 'Untitled',
    },
  },
]

describe('the create menu', () => {
  it('names each creator by index, and resolves the index back to its request', () => {
    expect(createMenuItems(creators)).toEqual([
      { label: 'New Page', action: 'create:0' },
      { label: 'New Set', action: 'create:1' },
    ])
    expect(createdRequest(creators, 'create:1')).toBe(creators[1].req)
  })

  it('answers nothing for a pick that is not a create', () => {
    expect(createdRequest(creators, 'rename')).toBeUndefined()
    expect(createdRequest(creators, 'create:7')).toBeUndefined()
  })
})

describe('containerCreators — a container offers the same things wherever it is asked', () => {
  const ops = (kind: 'collection' | 'set'): string[] =>
    containerCreators(kind, 'Some/Path').map((c) => c.req.op)

  it('offers a Set the same operations it offers a Collection', () => {
    // The defect this pins: the sidebar's context menu gave a Set no way to make a nested one, while the subfield's add button did.
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

describe('spaceCreator', () => {
  it('labels and names a createSpace request for its Context', () => {
    expect(spaceCreator({ id: 'g1', title: 'Realms', singular: 'Realm' })).toEqual({
      label: 'New Realm',
      req: { op: 'createSpace', contextId: 'g1', name: 'New Realm' },
    })
  })
})
