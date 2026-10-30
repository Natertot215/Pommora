import { describe, expect, it } from 'vitest'
import { bundleAddressOf, layoutOf, originPathOf, storeOf } from '../Paths/bundleLayout'

const ID = '01J9Z8X7W6V5T4S3R2Q1P0N9M8'
const TRASH = { kind: 'trash' } as const
const ARCHIVE = { kind: 'archive', id: ID } as const
const STAMPED = '2026-10-17T00-00-00-000Z'

describe('layoutOf', () => {
  it('files the Trash under .trash and an Archive under its Collection’s id, each wearing its own suffix', () => {
    expect(layoutOf(TRASH)).toEqual({ dir: '.trash', suffix: '.deleted' })
    expect(layoutOf(ARCHIVE)).toEqual({ dir: `.nexus/archive/${ID}`, suffix: '.archived' })
  })
})

describe('bundleAddressOf', () => {
  const TRASHED = `/n/.trash/Notes/${STAMPED}__S.deleted`
  const ARCHIVED = `/n/.nexus/archive/${ID}/Notes/${STAMPED}__S.archived`

  it('answers a bundle folder with its bundle and the store it sits in', () => {
    expect(bundleAddressOf('/n', `/n/.trash/Notes/${STAMPED}__Alpha.md.deleted`)).toEqual({
      bundle: `/n/.trash/Notes/${STAMPED}__Alpha.md.deleted`,
      store: TRASH,
    })
    expect(bundleAddressOf('/n', ARCHIVED)).toEqual({ bundle: ARCHIVED, store: ARCHIVE })
  })

  it('answers a page or folder inside the artifact as the item it names', () => {
    expect(bundleAddressOf('/n', `${TRASHED}/S/T/P.md`)).toEqual({
      bundle: TRASHED,
      store: TRASH,
      item: `${TRASHED}/S/T/P.md`,
    })
    expect(bundleAddressOf('/n', `${TRASHED}/S/T`)).toEqual({
      bundle: TRASHED,
      store: TRASH,
      item: `${TRASHED}/S/T`,
    })
  })

  it('answers an Archive path with its Collection’s store', () => {
    expect(bundleAddressOf('/n', `${ARCHIVED}/S/P.md`)).toEqual({
      bundle: ARCHIVED,
      store: ARCHIVE,
      item: `${ARCHIVED}/S/P.md`,
    })
  })

  it('answers null for the artifact itself and for a hidden segment inside it', () => {
    expect(bundleAddressOf('/n', `${TRASHED}/S`)).toBeNull()
    expect(bundleAddressOf('/n', `${TRASHED}/S/_raw/X.md`)).toBeNull()
    expect(bundleAddressOf('/n', `${TRASHED}/S/.x`)).toBeNull()
    expect(bundleAddressOf('/n', `${TRASHED}/_record.json/X.md`)).toBeNull()
    expect(bundleAddressOf('/n', `${TRASHED}/.hidden/X.md`)).toBeNull()
  })

  it('answers null for a suffixed folder without a stamp', () => {
    expect(bundleAddressOf('/n', '/n/.trash/Notes/Alpha.md.deleted')).toBeNull()
    expect(bundleAddressOf('/n', '/n/.trash/Notes/Alpha.md.deleted/Alpha.md')).toBeNull()
  })

  it('answers null for a path neither store holds: an in-Nexus `.deleted`, a `.archived` outside `.nexus/archive`, the id folder itself, and either suffix under the other store', () => {
    expect(bundleAddressOf('/n', '/n/Notes/fake.deleted')).toBeNull()
    expect(bundleAddressOf('/n', '/n/Notes/fake.archived')).toBeNull()
    expect(bundleAddressOf('/n', `/n/.nexus/archive/${ID}.archived`)).toBeNull()
    expect(bundleAddressOf('/n', `/n/.trash/Notes/${STAMPED}__Alpha.md.archived`)).toBeNull()
    expect(bundleAddressOf('/n', `/n/.nexus/archive/${ID}/${STAMPED}__Alpha.md.deleted`)).toBeNull()
  })
})

describe('originPathOf', () => {
  it('reads a bundled file’s origin from the chain and the artifact’s own tree', () => {
    const page = `/n/.trash/Studio/Pommora/${STAMPED}__ClaudeMD.md.deleted`
    expect(originPathOf('/n', `${page}/ClaudeMD.md`)).toBe('Studio/Pommora/ClaudeMD.md')
    const set = `/n/.trash/Coll/${STAMPED}__Set.deleted`
    expect(originPathOf('/n', `${set}/Set/X.md`)).toBe('Coll/Set/X.md')
  })

  it('reads an archived file under its Archive’s root the same way', () => {
    const set = `/n/.nexus/archive/${ID}/Coll/${STAMPED}__Set.archived`
    expect(originPathOf('/n', `${set}/Set/Sub/X.md`)).toBe('Coll/Set/Sub/X.md')
  })

  it('keeps a chain or artifact folder that wears the suffix, finding the bundle by its stamp', () => {
    const bundle = `/n/.trash/Archive.deleted/${STAMPED}__Notes.deleted`
    expect(originPathOf('/n', `${bundle}/Notes/Old.deleted/X.md`)).toBe(
      'Archive.deleted/Notes/Old.deleted/X.md',
    )
  })

  it('a bundle wearing no stamp keeps its folder in the origin path', () => {
    expect(originPathOf('/n', '/n/.trash/Notes/Alpha.md.deleted/Alpha.md')).toBe(
      'Notes/Alpha.md.deleted/Alpha.md',
    )
  })
})

describe('storeOf', () => {
  it('answers a Trash page’s bundle, inner segments, and origin', () => {
    expect(storeOf(`.trash/Notes/${STAMPED}__A.md.deleted/A.md`)).toEqual({
      store: TRASH,
      bundle: `.trash/Notes/${STAMPED}__A.md.deleted`,
      inner: ['A.md'],
      origin: 'Notes/A.md',
    })
  })

  it('answers an Archive path’s Collection, its origin under the Collection’s own folder', () => {
    expect(storeOf(`.nexus/archive/C1/Notes/${STAMPED}__S.archived/S/P.md`)).toEqual({
      store: { kind: 'archive', id: 'C1' },
      bundle: `.nexus/archive/C1/Notes/${STAMPED}__S.archived`,
      inner: ['S', 'P.md'],
      origin: 'Notes/S/P.md',
    })
  })

  it('answers a chain folder and a leftover beside the bundles with no bundle', () => {
    expect(storeOf('.trash/Notes')?.bundle).toBeNull()
    expect(storeOf(`.trash/Notes/${STAMPED}__x.md`)?.bundle).toBeNull()
  })

  it('answers null outside both stores and at their roots', () => {
    for (const rel of ['.trash', '.nexus/archive', '.nexus/contexts/A', 'Notes/A.md'])
      expect(storeOf(rel)).toBeNull()
  })
})
