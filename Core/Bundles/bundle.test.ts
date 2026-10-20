import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { basename, dirname, join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { layoutOf, listBundles, mintBundle, originPathOf, storeOf } from './bundle'
import { writeRecord } from './record'

const ID = '01J9Z8X7W6V5T4S3R2Q1P0N9M8'
const TRASH = { kind: 'trash' } as const
const ARCHIVE = { kind: 'archive', id: ID } as const
const STAMPED = '2026-10-17T00-00-00-000Z'

let root: string
beforeEach(() => {
  root = tempRoot('pom-bundle-')
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('layoutOf', () => {
  it('files the Trash under .trash and an Archive under its Collection’s id, each wearing its own suffix', () => {
    expect(layoutOf(TRASH)).toEqual({ dir: '.trash', suffix: '.deleted' })
    expect(layoutOf(ARCHIVE)).toEqual({ dir: `.nexus/archive/${ID}`, suffix: '.archived' })
  })
})

describe('storeOf', () => {
  it('answers the store a bundle sits in by its root and its suffix', () => {
    expect(storeOf('/n', `/n/.trash/Notes/${STAMPED}__Alpha.md.deleted`)).toEqual(TRASH)
    expect(storeOf('/n', `/n/.nexus/archive/${ID}/Notes/${STAMPED}__Alpha.md.archived`)).toEqual(
      ARCHIVE,
    )
  })

  it('answers null for a path neither store holds: an in-Nexus `.deleted`, a `.archived` outside `.nexus/archive`, the id folder itself, and either suffix under the other store', () => {
    expect(storeOf('/n', '/n/Notes/fake.deleted')).toBeNull()
    expect(storeOf('/n', '/n/Notes/fake.archived')).toBeNull()
    expect(storeOf('/n', `/n/.nexus/archive/${ID}.archived`)).toBeNull()
    expect(storeOf('/n', `/n/.trash/Notes/${STAMPED}__Alpha.md.archived`)).toBeNull()
    expect(storeOf('/n', `/n/.nexus/archive/${ID}/${STAMPED}__Alpha.md.deleted`)).toBeNull()
  })
})

describe('mintBundle', () => {
  it('creates the bundle under the mirrored chain while the source stays live', async () => {
    await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
    const p = join(root, 'Notes', 'Daily', 'Beta.md')
    await writeFile(p, 'bye')
    const bundle = await mintBundle(root, TRASH, p)
    expect(dirname(bundle)).toBe(join(root, '.trash', 'Notes', 'Daily'))
    expect(basename(bundle).endsWith('__Beta.md.deleted')).toBe(true)
    expect((await stat(bundle)).isDirectory()).toBe(true)
    expect(await readFile(p, 'utf8')).toBe('bye')
  })

  it('de-collides within one timestamp — two mints never share a bundle', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-01T12:00:00.000Z'))
    try {
      const p = join(root, 'twice.md')
      const first = await mintBundle(root, TRASH, p)
      const second = await mintBundle(root, TRASH, p)
      expect(second).not.toBe(first)
      expect(basename(second)).toBe('2026-08-01T12-00-00-000Z__1__twice.md.deleted')
    } finally {
      vi.useRealTimers()
    }
  })

  it('lands flat when the source is not under the root', async () => {
    const outside = tempRoot('pom-out-')
    try {
      const bundle = await mintBundle(root, TRASH, join(outside, 'Stray.md'))
      expect(dirname(bundle)).toBe(join(root, '.trash'))
    } finally {
      await rm(outside, { recursive: true, force: true })
    }
  })

  it('mirrors the chain under an Archive with its suffix', async () => {
    await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
    const bundle = await mintBundle(root, ARCHIVE, join(root, 'Notes', 'Daily', 'Beta.md'))
    expect(dirname(bundle)).toBe(join(root, '.nexus', 'archive', ID, 'Notes', 'Daily'))
    expect(basename(bundle).endsWith('__Beta.md.archived')).toBe(true)
    expect((await stat(bundle)).isDirectory()).toBe(true)
  })
})

describe('originPathOf', () => {
  it('reads a bundled file’s origin from the chain and the artifact’s own tree', () => {
    const page = `/n/.trash/Studio/Pommora/${STAMPED}__ClaudeMD.md.deleted`
    expect(originPathOf('/n', TRASH, `${page}/ClaudeMD.md`)).toBe('Studio/Pommora/ClaudeMD.md')
    const set = `/n/.trash/Coll/${STAMPED}__Set.deleted`
    expect(originPathOf('/n', TRASH, `${set}/Set/X.md`)).toBe('Coll/Set/X.md')
  })

  it('reads an archived file under its Archive’s root the same way', () => {
    const set = `/n/.nexus/archive/${ID}/Coll/${STAMPED}__Set.archived`
    expect(originPathOf('/n', ARCHIVE, `${set}/Set/Sub/X.md`)).toBe('Coll/Set/Sub/X.md')
  })

  it('keeps a chain or artifact folder that wears the suffix, finding the bundle by its stamp', () => {
    const bundle = `/n/.trash/Archive.deleted/${STAMPED}__Notes.deleted`
    expect(originPathOf('/n', TRASH, `${bundle}/Notes/Old.deleted/X.md`)).toBe(
      'Archive.deleted/Notes/Old.deleted/X.md',
    )
  })

  it('a bundle wearing no stamp keeps its folder in the origin path', () => {
    expect(originPathOf('/n', TRASH, '/n/.trash/Notes/Alpha.md.deleted/Alpha.md')).toBe(
      'Notes/Alpha.md.deleted/Alpha.md',
    )
  })
})

describe('listBundles', () => {
  it('lists an Archive’s bundles under its own root and suffix, and none of the Trash’s', async () => {
    const seed = async (store: typeof TRASH | typeof ARCHIVE, name: string): Promise<void> => {
      const bundle = await mintBundle(root, store, join(root, 'Notes', name))
      await writeFile(join(bundle, name), 'body')
      await writeRecord(bundle, { entity: 'page', parent: { kind: 'container', id: 'col' } })
    }
    await seed(ARCHIVE, 'Alpha.md')
    await seed(TRASH, 'Beta.md')
    expect((await listBundles(root, ARCHIVE)).map((b) => b.artifactName)).toEqual(['Alpha.md'])
    expect((await listBundles(root, TRASH)).map((b) => b.artifactName)).toEqual(['Beta.md'])
  })
})
