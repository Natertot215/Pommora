import { describe, it, expect } from 'vitest'
import { changesSettled, changesStores, mutateRequest } from './mutateRequest'

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
    expect(read({ op: 'archive', path: 'A', kind: 'collection' })).toBe(false)
    expect(read({ op: 'archive', path: 'A', kind: 'page', leaf: 7 })).toBe(false)
  })

  it('an archive changes what the settle holds and what the stores list', () => {
    expect(changesSettled('archive')).toBe(true)
    expect(changesStores({ op: 'archive', path: 'A/B.md', kind: 'page' })).toBe(true)
  })

  it('a moved Set, a renamed container or Context, re-lists the stores, and a renamed page doesn’t', () => {
    expect(changesStores({ op: 'moveSet', path: 'A/S', newParentPath: 'B', order: [] })).toBe(true)
    expect(changesStores({ op: 'rename', path: 'A', kind: 'collection', newName: 'B' })).toBe(true)
    expect(changesStores({ op: 'rename', path: 'A/S', kind: 'set', newName: 'T' })).toBe(true)
    expect(changesStores({ op: 'renameContext', contextId: 'c', newName: 'D' })).toBe(true)
    expect(changesStores({ op: 'rename', path: 'A/B.md', kind: 'page', newName: 'C' })).toBe(false)
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

  it('reads an Undo back into the Archive as a destination carrying no id', () => {
    expect(
      mutateRequest.parse({
        op: 'restore',
        bundlePath: '.trash/A.md.deleted',
        destination: { kind: 'archive', id: 'x' },
      }),
    ).toEqual({
      op: 'restore',
      bundlePath: '.trash/A.md.deleted',
      destination: { kind: 'archive' },
    })
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

  it('reads each property op, and holds a configure patch to the definition’s display fields', () => {
    const patch = (raw: object) =>
      mutateRequest.parse({ op: 'configureProperty', propertyId: 'p', patch: raw }) as {
        patch: object
      }
    expect(patch({ icon: 'tag', type: 'text', select_options: [] })).toEqual({
      op: 'configureProperty',
      propertyId: 'p',
      patch: { icon: 'tag' },
    })
    expect(Object.keys(patch({ checkbox_color: undefined }).patch)).toEqual(['checkbox_color'])
    expect(read({ op: 'setFormat', propertyId: 'p', change: { key_format: 'Shouting' } })).toBe(
      false,
    )
    expect(read({ op: 'addProperty', containerPath: 'A', draft: { type: 'text' } })).toBe(false)
  })

  it('a property delete re-lists the stores', () => {
    expect(changesStores({ op: 'deleteProperty', propertyId: 'p' })).toBe(true)
  })
})
