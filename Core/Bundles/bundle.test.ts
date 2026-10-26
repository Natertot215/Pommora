import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { basename, dirname, join } from '../Paths/posix'
import { putJson, readJsonAt, tempRoot } from '../Testing/hostFs'
import { newContentId } from '../Nexus/ids'
import { OWED_REL } from '../Paths/nexusPaths'
import { sidecarPath } from '../Paths/paths'
import { listBundles, mintBundle, type OpenBundle, openBundle, spendBundle } from './bundle'
import { patchRecord, readRawRecord, writeRecord } from './record'

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

const A = 'colA'
const S = 'setS'
const T = 'setT'
const OUT = newContentId('page')
const P_ID = newContentId('page')
const TARGETS = { '[[Q]]': { id: 'q', path: 'A/Q.md' } }
const P_LINK = { page: OUT, property: 'Rel', value: '[[P]]' }
const Q_LINK = { page: OUT, property: 'Rel', value: '[[Q]]' }
const BUNDLE_REL = `.trash/${STAMPED}__A.deleted`
const inBundle = (...segs: string[]): string => join(root, BUNDLE_REL, ...segs)

/** A trashed Collection `A ⟩ S ⟩ T ⟩ P.md`, with `Q.md` beside `S`, its record taking `record` over the defaults. */
const seedTrashedCollection = async (record: Record<string, unknown> = {}): Promise<void> => {
  await putJson(sidecarPath(inBundle('A'), 'collection'), { id: A })
  await putJson(sidecarPath(inBundle('A', 'S'), 'set'), { id: S })
  await putJson(sidecarPath(inBundle('A', 'S', 'T'), 'set'), { id: T })
  await writeFile(inBundle('A', 'S', 'T', 'P.md'), `---\nID: ${P_ID}\n---\nbody\n`)
  await writeFile(inBundle('A', 'Q.md'), `---\nID: ${newContentId('page')}\n---\nbody\n`)
  await writeRecord(inBundle(), {
    entity: 'collection',
    id: A,
    parent: { kind: 'root' },
    targets: TARGETS,
    links: [P_LINK, Q_LINK],
    ...record,
  })
}

const opened = async (abs: string): Promise<OpenBundle> => {
  const read = await openBundle(root, abs)
  if (!read.ok) throw new Error(read.error.message)
  return read.value
}

describe('openBundle', () => {
  it('opens a Set inside a trashed Collection under the Collection, with no trail', async () => {
    await seedTrashedCollection()
    const { abs, record, artifact, inner } = await opened(inBundle('A', 'S'))
    expect({ abs, artifact, inner }).toEqual({
      abs: inBundle(),
      artifact: inBundle('A', 'S'),
      inner: true,
    })
    expect(record).toMatchObject({ entity: 'set', id: S, parent: { kind: 'container', id: A } })
    expect('trail' in record).toBe(false)
  })

  it('opens a page under its own Set, with the containers above as its trail, its id, the bundle’s targets, and only the kept values naming it', async () => {
    await seedTrashedCollection()
    expect((await opened(inBundle('A', 'S', 'T', 'P.md'))).record).toEqual({
      entity: 'page',
      id: P_ID,
      parent: { kind: 'container', id: T },
      trail: [A, S],
      targets: TARGETS,
      links: [P_LINK],
    })
  })

  it('opens an inner item of a trashed Set with the Set’s parent leading its trail', async () => {
    const bundle = join(root, '.trash', 'A', `${STAMPED}__S.deleted`)
    await putJson(sidecarPath(join(bundle, 'S', 'T'), 'set'), { id: T })
    await writeFile(join(bundle, 'S', 'T', 'P.md'), `---\nID: ${P_ID}\n---\nbody\n`)
    await writeRecord(bundle, { entity: 'set', id: S, parent: { kind: 'container', id: A } })
    expect((await opened(join(bundle, 'S', 'T', 'P.md'))).record).toMatchObject({
      parent: { kind: 'container', id: T },
      trail: [A, S],
    })
  })

  it('keeps with the bundle a value whose title two of its pages share', async () => {
    await seedTrashedCollection()
    await writeFile(inBundle('A', 'S', 'P.md'), `---\nID: ${newContentId('page')}\n---\nbody\n`)
    expect((await opened(inBundle('A', 'S', 'T', 'P.md'))).record).not.toHaveProperty('links')
  })

  it('leaves an inner item unaddressable when a folder above it has no sidecar id', async () => {
    await seedTrashedCollection()
    await rm(sidecarPath(inBundle('A', 'S', 'T'), 'set'))
    const { record } = await opened(inBundle('A', 'S', 'T', 'P.md'))
    expect(record.entity === 'page' && record.parent).toEqual({ kind: 'unaddressable' })
    expect('trail' in record).toBe(false)
  })

  it('opens an address inside a page bundle as not-found', async () => {
    const page = join(root, '.trash', `${STAMPED}__P.md.deleted`)
    await mkdir(page, { recursive: true })
    await writeFile(join(page, 'P.md'), 'body')
    await writeRecord(page, { entity: 'page', parent: { kind: 'root' } })
    const read = await openBundle(root, join(page, 'P.md', 'X.md'))
    expect(!read.ok && read.error.code).toBe('not-found')
  })

  it('opens a path inside a Space bundle as not-found', async () => {
    const space = join(root, '.trash', `${STAMPED}__Work.deleted`)
    await mkdir(join(space, 'Work'), { recursive: true })
    await writeFile(join(space, 'Work', 'Notes.md'), 'body')
    await writeRecord(space, {
      entity: 'space',
      id: 'space_work',
      parent: { kind: 'context', id: 'ctx_areas' },
      members: [],
    })
    const read = await openBundle(root, join(space, 'Work', 'Notes.md'))
    expect(!read.ok && read.error.code).toBe('not-found')
  })

  it('marks an inner item of a partly recorded bundle partial, and one of a whole record not', async () => {
    await seedTrashedCollection({ partial: true })
    expect((await opened(inBundle('A', 'S', 'T', 'P.md'))).record.partial).toBe(true)
    await seedTrashedCollection()
    expect((await opened(inBundle('A', 'S', 'T', 'P.md'))).record.partial).toBeUndefined()
  })
})

describe('spendBundle', () => {
  const EDIT = { kind: 'property', propertyId: 'x' }
  const note = (owes: Record<string, unknown>) => ({
    [A]: { kind: 'container', at: 'A', bundle: BUNDLE_REL, ...owes },
  })
  const owing = (owes: Record<string, unknown>) => putJson(join(root, OWED_REL), note(owes))
  const owed = () => readJsonAt(join(root, OWED_REL)).catch(() => null)

  beforeEach(() =>
    seedTrashedCollection({ links: [P_LINK, { ...P_LINK, property: 'Other' }, Q_LINK] }),
  )

  it('strips exactly the inner item’s carried values from the bundle’s record, keeping those a finish appended since the open', async () => {
    const item = await opened(inBundle('A', 'S', 'T', 'P.md'))
    const appended = [
      { ...P_LINK, page: newContentId('page') },
      { ...P_LINK, property: 'Later' },
    ]
    await patchRecord(inBundle(), (raw) => ({ links: [...(raw.links as unknown[]), ...appended] }))
    await spendBundle(root, item)
    expect((await readRawRecord(inBundle()))?.links).toEqual([Q_LINK, ...appended])
  })

  it('takes the inner item’s pages off the strip its bundle’s delete still owes, leaving the rest of the note', async () => {
    await owing({ strip: ['A/S/T/P.md', 'A/Q.md'], edit: EDIT })
    await spendBundle(root, await opened(inBundle('A', 'S')))
    expect(await owed()).toEqual(note({ strip: ['A/Q.md'], edit: EDIT }))
  })

  it('clears a note the inner item leaves owing nothing', async () => {
    await owing({ strip: ['A/S/T/P.md'] })
    await spendBundle(root, await opened(inBundle('A', 'S', 'T', 'P.md')))
    expect(await owed()).toBeNull()
  })

  it('removes a whole bundle', async () => {
    await spendBundle(root, await opened(inBundle()))
    expect(await stat(inBundle()).catch(() => null)).toBeNull()
  })
})
