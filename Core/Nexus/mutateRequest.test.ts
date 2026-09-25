import { describe, it, expect } from 'vitest'
import { containerCreators, mutateRequest, spaceCreator } from './mutateRequest'

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

describe('mutateRequest — what the window sends is held to the shape before anything is written', () => {
  const read = (raw: unknown): boolean => mutateRequest.safeParse(raw).success

  it('refuses what is not a request: no op, an unknown op, a missing field, or one off its type', () => {
    expect(read(null)).toBe(false)
    expect(read({ op: 'formatDisk' })).toBe(false)
    expect(read({ op: 'rename', path: 'a.md', kind: 'page' })).toBe(false)
    expect(read({ op: 'reorderTop', order: ['a', 7] })).toBe(false)
  })

  it('refuses a kind or key outside its finite set, so a write never lands under a foreign name', () => {
    expect(read({ op: 'createContainer', parentPath: 'A', kind: 'space', name: 'x' })).toBe(false)
    expect(read({ op: 'reorderChildren', parentPath: 'A', key: 'id', order: [] })).toBe(false)
    expect(read({ op: 'rename', path: 'A', kind: 'context', newName: 'B' })).toBe(false)
  })

  it('drops a key the op does not name, so an extra field cannot steer the write', () => {
    const parsed = mutateRequest.parse({
      op: 'renameHeading',
      path: 'a.md',
      heading: 'H',
      to: 'I',
      title: 'Z',
    })
    expect(parsed).toEqual({ op: 'renameHeading', path: 'a.md', heading: 'H', to: 'I' })
  })

  it('holds a property value to a value shape and a crop to its numbers', () => {
    expect(read({ op: 'setProperty', path: 'a.md', propertyId: 'p', value: 'raw' })).toBe(false)
    expect(
      read({
        op: 'setProperty',
        path: 'a.md',
        propertyId: 'p',
        value: { kind: 'number', value: 1 },
      }),
    ).toBe(true)
    expect(read({ op: 'setProperty', path: 'a.md', propertyId: 'p', value: null })).toBe(true)
    expect(read({ op: 'setCrop', image: 'i.png', crop: { x: 'left', y: 0, zoom: 1 } })).toBe(false)
  })
})
