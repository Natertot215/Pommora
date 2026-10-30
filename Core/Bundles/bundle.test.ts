import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { basename, dirname, join } from '../Paths/posix'
import { putJson, readJsonAt, tempRoot } from '../Testing/hostFs'
import { seedPropertyBundle } from '../Testing/fixtures'
import { newContentId } from '../Nexus/ids'
import { OWED_REL } from '../Paths/nexusPaths'
import { sidecarPath } from '../Paths/paths'
import type { WatchScope } from '../Paths/exclusion'
import {
  fileInto,
  listBundles,
  listInner,
  mintBundle,
  type OpenBundle,
  openBundle,
  spendBundle,
} from './bundle'
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
})

describe('listInner', () => {
  const R = 'setR'
  const Y_ID = newContentId('page')
  const Z_ID = newContentId('page')
  const OPEN: WatchScope = { excluded: [], assetDir: '' }
  const listed = async (abs: string, scope = OPEN) => {
    const read = await listInner(root, abs, scope)
    if (!read.ok) throw new Error(read.error.message)
    return read.value
  }
  const inBundleRel = (...segs: string[]): string => [BUNDLE_REL, ...segs].join('/')

  it('lists one level of a bundled Collection: its Sets, then its pages, each in its sidecar’s order, skipping what the walk skips', async () => {
    await seedTrashedCollection()
    await putJson(sidecarPath(inBundle('A', 'R'), 'set'), { id: R })
    await writeFile(inBundle('A', 'Y.md'), `---\nID: ${Y_ID}\n---\nbody\n`)
    await writeFile(inBundle('A', 'Z.md'), `---\nID: ${Z_ID}\n---\nbody\n`)
    await putJson(sidecarPath(inBundle('A'), 'collection'), {
      id: A,
      set_order: [S, R],
      page_order: [Z_ID, Y_ID],
    })
    await mkdir(inBundle('A', '_raw'))
    await mkdir(inBundle('A', 'node_modules'))
    await writeFile(inBundle('A', '.x.md'), 'x')
    await writeFile(inBundle('A', 'notes.txt'), 'x')
    const { bundle, folder, items } = await listed(inBundle())
    expect({ bundle, folder }).toEqual({ bundle: BUNDLE_REL, folder: inBundleRel('A') })
    expect(items.map((i) => i.address)).toEqual(
      ['S', 'R', 'Z.md', 'Y.md', 'Q.md'].map((name) => inBundleRel('A', name)),
    )
  })

  it('lists an inner Set’s own level, each item with the record it carries', async () => {
    await seedTrashedCollection()
    expect((await listed(inBundle('A', 'S'))).items).toMatchObject([
      {
        address: inBundleRel('A', 'S', 'T'),
        record: { entity: 'set', id: T, parent: { kind: 'container', id: S }, trail: [A] },
      },
    ])
  })

  it('keeps a folder the Nexus excludes out until it’s unexcluded, and the asset folder out', async () => {
    await seedTrashedCollection()
    await mkdir(inBundle('A', 'Files'))
    const names = async (scope: WatchScope): Promise<string[]> =>
      (await listed(inBundle(), scope)).items.map((i) => basename(i.address))
    expect(await names({ excluded: ['A/S'], assetDir: '' })).toEqual(['Files', 'Q.md'])
    expect(await names({ excluded: [], assetDir: 'A/Files' })).toEqual(['S', 'Q.md'])
    expect(await names(OPEN)).toEqual(['Files', 'S', 'Q.md'])
  })

  it('orders an inner Set’s Sets by its own sidecar', async () => {
    await seedTrashedCollection()
    await putJson(sidecarPath(inBundle('A', 'S', 'R'), 'set'), { id: R })
    await putJson(sidecarPath(inBundle('A', 'S'), 'set'), { id: S, set_order: [T, R] })
    expect((await listed(inBundle('A', 'S'))).items.map((i) => i.address)).toEqual([
      inBundleRel('A', 'S', 'T'),
      inBundleRel('A', 'S', 'R'),
    ])
  })

  describe('a whole Set’s bundle', () => {
    const SET_BUNDLE_REL = `.trash/A/${STAMPED}__S.deleted`
    const inSet = (...segs: string[]): string => join(root, SET_BUNDLE_REL, ...segs)
    const ID_1 = '01J9Z8X7W6V5T4S3R2Q1P0N9A1'
    const ID_2 = '01J9Z8X7W6V5T4S3R2Q1P0N9A2'
    const seedTrashedSet = async (order: Record<string, unknown>): Promise<void> => {
      await putJson(sidecarPath(inSet('S'), 'set'), { id: S, ...order })
      await putJson(sidecarPath(inSet('S', 'Alpha'), 'set'), { id: 'set2' })
      await putJson(sidecarPath(inSet('S', 'Beta'), 'set'), { id: 'set1' })
      await writeFile(inSet('S', 'Alpha.md'), `---\nID: ${ID_2}\n---\nbody\n`)
      await writeFile(inSet('S', 'Beta.md'), `---\nID: ${ID_1}\n---\nbody\n`)
      await writeRecord(inSet(), { entity: 'set', id: S, parent: { kind: 'container', id: A } })
    }
    const names = async (): Promise<string[]> =>
      (await listed(inSet())).items.map((i) => basename(i.address))

    it('orders its pages by the Set’s own sidecar', async () => {
      await seedTrashedSet({ page_order: [ID_2, ID_1] })
      expect(await names()).toEqual(['Beta', 'Alpha', 'Alpha.md', 'Beta.md'])
    })

    it('orders each kind by id when the sidecar keeps no order', async () => {
      await seedTrashedSet({})
      expect(await names()).toEqual(['Beta', 'Alpha', 'Beta.md', 'Alpha.md'])
    })
  })

  it('refuses an address whose bundle holds no container', async () => {
    const page = join(root, '.trash', `${STAMPED}__P.md.deleted`)
    await mkdir(page, { recursive: true })
    await writeFile(join(page, 'P.md'), 'body')
    await writeRecord(page, { entity: 'page', parent: { kind: 'root' } })
    const property = await seedPropertyBundle(root, {
      entity: 'property',
      id: 'prop_x',
      def: { id: 'prop_x' },
      values: {},
    })
    for (const abs of [page, property]) {
      const read = await listInner(root, abs, OPEN)
      expect(!read.ok && read.error.code).toBe('not-found')
    }
  })

  it('lists a folder without a Set sidecar as an id-less Set, its own items unaddressable', async () => {
    await seedTrashedCollection()
    await mkdir(inBundle('A', 'Plain'))
    await writeFile(inBundle('A', 'Plain', 'N.md'), 'body')
    const plain = (await listed(inBundle())).items.find(
      (i) => i.address === inBundleRel('A', 'Plain'),
    )
    expect(plain?.record).toMatchObject({ entity: 'set', parent: { kind: 'container', id: A } })
    expect(plain?.record).not.toHaveProperty('id')
    expect((await listed(inBundle('A', 'Plain'))).items).toMatchObject([
      {
        address: inBundleRel('A', 'Plain', 'N.md'),
        record: { entity: 'page', parent: { kind: 'unaddressable' } },
      },
    ])
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

describe('fileInto', () => {
  const HELD = `${BUNDLE_REL}/A/S/T/P.md`
  const live = (): string => join(root, 'Live', 'P.md')
  const file = async (at: string, to: typeof TRASH | typeof ARCHIVE = TRASH) => {
    await mkdir(join(root, 'Live'), { recursive: true })
    await writeFile(live(), 'back')
    return fileInto(root, to, live(), live(), { entity: 'page', parent: { kind: 'root' } }, at)
  }
  const minted = async (
    filed: { address: string; landed: string },
    dir: string,
    suffix: string,
  ): Promise<void> => {
    expect(filed.address).toMatch(new RegExp(`^${dir}/[^/]+__P\\.md\\${suffix}$`))
    expect(filed.landed).toBe(join(root, filed.address, 'P.md'))
    expect(await readFile(filed.landed, 'utf8')).toBe('back')
    expect(await readRawRecord(join(root, filed.address))).toEqual({
      entity: 'page',
      parent: { kind: 'root' },
    })
  }

  beforeEach(() => seedTrashedCollection())

  it('re-nests an inner item’s address into its standing folder, leaving its bundle’s record as it was', async () => {
    await rm(inBundle('A', 'S', 'T', 'P.md'))
    const record = await readFile(inBundle('_record.json'), 'utf8')
    expect(await file(HELD)).toEqual({ address: HELD, landed: inBundle('A', 'S', 'T', 'P.md') })
    expect(await readFile(inBundle('A', 'S', 'T', 'P.md'), 'utf8')).toBe('back')
    expect((await readdir(inBundle('A', 'S', 'T'))).sort()).toEqual(['P.md', '_pageset.json'])
    expect(await stat(live()).catch(() => null)).toBeNull()
    expect(await readFile(inBundle('_record.json'), 'utf8')).toBe(record)
  })

  it('mints a fresh bundle for a taken name, leaving the taken one as it was', async () => {
    await minted(await file(HELD), '\\.trash/Live', '.deleted')
    expect(await readFile(inBundle('A', 'S', 'T', 'P.md'), 'utf8')).toBe(
      `---\nID: ${P_ID}\n---\nbody\n`,
    )
  })

  it('mints a fresh bundle for a gone folder', async () => {
    await rm(inBundle('A', 'S', 'T'), { recursive: true })
    await minted(await file(HELD), '\\.trash/Live', '.deleted')
    expect(await stat(inBundle('A', 'S', 'T')).catch(() => null)).toBeNull()
  })

  it('mints in its own store when the standing folder sits in a store of another kind', async () => {
    await rm(inBundle('A', 'S', 'T', 'P.md'))
    await minted(await file(HELD, ARCHIVE), `\\.nexus/archive/${ID}/Live`, '.archived')
    expect(await stat(inBundle('A', 'S', 'T', 'P.md')).catch(() => null)).toBeNull()
  })

  it('re-mints a whole bundle’s address under its own name', async () => {
    const whole = `.trash/Live/${STAMPED}__P.md.deleted`
    expect(await file(whole)).toEqual({ address: whole, landed: join(root, whole, 'P.md') })
    expect(await readRawRecord(join(root, whole))).toEqual({
      entity: 'page',
      parent: { kind: 'root' },
    })
  })

  const fileAs = async (at: string) => {
    const q = join(root, 'Live', 'Q.md')
    await mkdir(join(root, 'Live'), { recursive: true })
    await writeFile(q, 'back')
    return fileInto(root, TRASH, live(), q, { entity: 'page', parent: { kind: 'root' } }, at)
  }

  it('files an inner item’s address under its origin’s name', async () => {
    await rm(inBundle('A', 'S', 'T', 'P.md'))
    expect(await fileAs(HELD)).toEqual({ address: HELD, landed: inBundle('A', 'S', 'T', 'P.md') })
    expect(await readFile(inBundle('A', 'S', 'T', 'P.md'), 'utf8')).toBe('back')
  })

  it('files a whole bundle’s artifact under its origin’s name at the address it names', async () => {
    const whole = `.trash/Live/${STAMPED}__P.md.deleted`
    expect(await fileAs(whole)).toEqual({ address: whole, landed: join(root, whole, 'P.md') })
    expect(await readFile(join(root, whole, 'P.md'), 'utf8')).toBe('back')
  })
})
