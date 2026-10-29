import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ID_KEY, isUlidShaped, kindOf } from './identityMark'
import { rm, mkdir, writeFile, readFile, readdir, stat, utimes } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { failLandings, tempRoot, readJsonAt } from '../Testing/hostFs'
import { lockContention } from '../Testing/machines'
import { ensurePageId, stampAdopted, stampMissing, stampPage } from './adopt'
import { splitFrontmatter } from '../Files/pageFile'
import { contentIdAt, idTime } from './ids'
import { nexusConfig, nexusDir, sidecarPath } from '../Paths/paths'
import { NEXUS_CONFIG_FILES, SIDECAR_FILENAME } from '../Paths/nexusPaths'
import { machine } from '../Platform/machine'
import { readJsonStrict, writeJson, readJsonObject } from '../Files/atomicWrite'
import type { HostContext } from '../Contract/handlers'
import { openNexusSequence } from './handlers'
import { closeSession } from './session'
import { dropLiveTree } from './liveTree'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'

let root: string

// A raw, sidecar-less nexus: a top folder (→ Collection), a nested folder (→ Set), a deeper one (→ Sub-Set), a page carrying foreign frontmatter but no id, and an excluded folder.
beforeEach(async () => {
  root = tempRoot('pom-adopt-')
  await mkdir(join(root, 'Notes', 'Daily', 'Deep'), { recursive: true })
  await writeFile(join(root, 'Notes', 'Note1.md'), '---\naliases:\n  - foo\n---\n\nbody text')
  await writeFile(join(root, 'Notes', 'Daily', 'Day1.md'), '# Day\n\nno frontmatter')
  await mkdir(join(root, 'Excluded'), { recursive: true })
  await mkdir(nexusDir(root), { recursive: true })
  await writeFile(
    nexusConfig(root, NEXUS_CONFIG_FILES.settings),
    JSON.stringify({ excluded_folders: ['Excluded'] }),
  )
})
afterEach(async () => {
  vi.restoreAllMocks()
  closeSession()
  dropLiveTree()
  installStores(NO_STORES)
  await rm(root, { recursive: true, force: true })
})

const ctx = {
  push: () => {},
  device: null,
  openStores: () => installStores(memoryStores().stores),
  trashMode: async () => 'nexus',
} as unknown as HostContext
const open = (): Promise<void> => openNexusSequence(ctx, root, false)

const coll = (p: string) => readJsonObject(sidecarPath(p, 'collection'))
const set = (p: string) => readJsonObject(sidecarPath(p, 'set'))

describe('stampAdopted', () => {
  it('stamps a folder under its sidecar lock, so a write held across the pass keeps both facts', async () => {
    const notes = join(root, 'Notes')
    const file = sidecarPath(notes, 'collection')
    await writeFile(file, JSON.stringify({ icon: 'box' }))
    let release = (): void => {}
    const lock = lockContention(file)
    const held = machine().lock(file, async () => {
      const cur = await readJsonStrict(file)
      await new Promise<void>((r) => {
        release = r
      })
      if (cur.ok) await writeJson(file, { ...cur.value, banner: 'Wallpaper.png' })
    })
    const pass = stampAdopted(root)
    await Promise.race([pass, lock.contended])
    lock.restore()
    release()
    await Promise.all([held, pass])
    const after = await readJsonAt(file)
    expect(after).toMatchObject({ icon: 'box', banner: 'Wallpaper.png' })
    expect(isUlidShaped(after.id)).toBe(true)
  })

  it('mints ULID sidecars for raw folders at every depth', async () => {
    await stampAdopted(root)

    const notes = await coll(join(root, 'Notes'))
    const daily = await set(join(root, 'Notes', 'Daily'))
    const deep = await set(join(root, 'Notes', 'Daily', 'Deep'))

    expect(isUlidShaped(notes?.id)).toBe(true)
    expect(isUlidShaped(daily?.id)).toBe(true)
    expect(isUlidShaped(deep?.id)).toBe(true)

    // Each is its own identity — parentage is the folder nesting, never a stored field.
    expect(new Set([notes!.id, daily!.id, deep!.id]).size).toBe(3)
  })

  it('the open stamps a frontmatter-less page id and preserves foreign frontmatter', async () => {
    await open()

    const note1 = splitFrontmatter(await readFile(join(root, 'Notes', 'Note1.md'), 'utf8'))
    expect(isUlidShaped(note1[ID_KEY])).toBe(true)
    expect(note1.aliases).toEqual(['foo'])

    const day1 = splitFrontmatter(await readFile(join(root, 'Notes', 'Daily', 'Day1.md'), 'utf8'))
    expect(isUlidShaped(day1[ID_KEY])).toBe(true)
  })

  it("a page the open stamps has an id that decodes to the file's mtime when that is older than now", async () => {
    const file = join(root, 'Notes', 'Note1.md')
    const past = new Date('2020-06-01T12:00:00Z')
    await utimes(file, past, past)
    await open()
    const id = splitFrontmatter(await readFile(file, 'utf8'))[ID_KEY] as string
    expect(Math.floor(idTime(id)! / 1000)).toBe(Math.floor(past.getTime() / 1000))
  })

  it("stamping leaves the file's mtime where it was", async () => {
    const file = join(root, 'Notes', 'Note1.md')
    const past = new Date('2020-06-01T12:00:00Z')
    await utimes(file, past, past)
    await open()
    expect(Math.floor((await stat(file)).mtimeMs / 1000)).toBe(Math.floor(past.getTime() / 1000))
  })

  it('is idempotent — a second open stamps nothing and leaves ids unchanged', async () => {
    await open()
    const files = [
      sidecarPath(join(root, 'Notes'), 'collection'),
      sidecarPath(join(root, 'Notes', 'Daily'), 'set'),
      sidecarPath(join(root, 'Notes', 'Daily', 'Deep'), 'set'),
      join(root, 'Notes', 'Note1.md'),
      join(root, 'Notes', 'Daily', 'Day1.md'),
    ]
    const read = () => Promise.all(files.map((f) => readFile(f, 'utf8')))
    const first = await read()

    await open()
    expect(await read()).toEqual(first)
  })

  it('never touches an excluded folder', async () => {
    await stampAdopted(root)
    expect(await coll(join(root, 'Excluded'))).toBeNull()
    expect(await set(join(root, 'Excluded'))).toBeNull()
  })

  // Unregistered, so this is the weaker guarantee that carrying an agenda config is enough to keep a folder out of Collections; the registered case is pinned in admission.test.ts.
  it('never fabricates a Collection on a folder carrying an agenda config', async () => {
    await mkdir(join(root, 'My Tasks'), { recursive: true })
    await writeFile(join(root, 'My Tasks', '_taskconfig.json'), '{}')
    await writeFile(join(root, 'My Tasks', 'Submit.md'), '# a member')
    await stampAdopted(root)
    expect(await coll(join(root, 'My Tasks'))).toBeNull()
  })

  it('never fabricates a Collection on an empty, sidecar-less folder', async () => {
    await mkdir(join(root, 'Stray'), { recursive: true })
    await stampAdopted(root)
    expect(await coll(join(root, 'Stray'))).toBeNull()
  })

  it('adopts a content-bearing folder named "Tasks" with no agenda config (name not reserved)', async () => {
    await mkdir(join(root, 'Tasks'), { recursive: true })
    await writeFile(join(root, 'Tasks', 'Note.md'), '# a real page')
    await stampAdopted(root)
    expect((await coll(join(root, 'Tasks')))?.id).toBeTruthy()
  })

  it('never mints over a sidecar it could not read — the subtree still adopts around it', async () => {
    const sidecar = join(root, 'Notes', SIDECAR_FILENAME.collection)
    await writeFile(sidecar, '{ corrupt', 'utf8')
    await stampAdopted(root)
    expect(await readFile(sidecar, 'utf8')).toBe('{ corrupt')
    const daily = await set(join(root, 'Notes', 'Daily'))
    expect(daily?.id).toBeTruthy()
  })

  it('a damaged settings file stops the pass before it stamps a folder it may exclude', async () => {
    await writeFile(
      nexusConfig(root, NEXUS_CONFIG_FILES.settings),
      '{"excluded_folders":["Private"],}',
    )
    await mkdir(join(root, 'Private'), { recursive: true })
    const secret = join(root, 'Private', 'secret.md')
    await writeFile(secret, '# secret\n\nbody')
    await expect(stampAdopted(root)).rejects.toThrow('settings.json')
    expect(await readFile(secret, 'utf8')).toBe('# secret\n\nbody')
    expect(await readdir(join(root, 'Private'))).toEqual(['secret.md'])
  })

  it('a page whose frontmatter refuses the id write is skipped, not clobbered', async () => {
    const page = join(root, 'Notes', 'Broken.md')
    await writeFile(page, '---\nbad: [unclosed\n---\nprose', 'utf8')
    await open()
    expect(await readFile(page, 'utf8')).toBe('---\nbad: [unclosed\n---\nprose')
  })
})

describe('stampMissing', () => {
  it('answers every id it wrote, a folder’s as well as a page’s', async () => {
    const idOf = async (...segs: string[]) =>
      splitFrontmatter(await readFile(join(root, ...segs), 'utf8'))[ID_KEY]
    const landed = await stampMissing(root, [
      { path: 'Notes/Note1.md', kind: 'page', reason: 'missing' },
      { path: 'Notes', kind: 'collection', reason: 'missing' },
      { path: 'Notes/Daily/Day1.md', kind: 'page', reason: 'missing' },
    ])
    expect(landed).toEqual([
      (await coll(join(root, 'Notes')))?.id,
      await idOf('Notes', 'Note1.md'),
      await idOf('Notes', 'Daily', 'Day1.md'),
    ])
  })

  it('lands its page stamps as one group, a stamp that fails costing only its page', async () => {
    const [a, b, c] = ['A', 'B', 'C'].map((t) => join(root, 'Notes', `${t}.md`))
    for (const p of [a, b, c]) await writeFile(p, 'body')
    const lands = failLandings((file) => file === b)
    const landed = await stampMissing(
      root,
      ['A', 'B', 'C'].map((t) => ({ path: `Notes/${t}.md`, kind: 'page', reason: 'missing' })),
    )
    expect(lands).toHaveBeenCalledTimes(1)
    const idOf = async (p: string) => splitFrontmatter(await readFile(p, 'utf8'))[ID_KEY]
    expect(landed).toEqual([await idOf(a), await idOf(c)])
    expect(landed.every(isUlidShaped)).toBe(true)
    expect(await readFile(b, 'utf8')).toBe('body')
  })

  it('a held ID two listed pages carry goes back to one of them', async () => {
    const [a, b] = ['A', 'B'].map((t) => join(root, 'Notes', `${t}.md`))
    for (const p of [a, b]) await writeFile(p, 'body')
    const held = contentIdAt(Date.UTC(2020, 0, 1), 'page')
    const landed = await stampMissing(
      root,
      ['A', 'B'].map((t) => ({ path: `Notes/${t}.md`, kind: 'page', reason: 'missing', held })),
    )
    expect(landed).toHaveLength(2)
    expect(landed.filter((id) => id === held)).toHaveLength(1)
  })
})

describe('stampPage', () => {
  it('stats its page once and mints from that stat', async () => {
    const page = join(root, 'Notes', 'Note1.md')
    const stats = vi.spyOn(machine(), 'stat')
    const id = await stampPage(page, 'page')
    const own = stats.mock.calls.flatMap(([p], i) => (p === page ? [stats.mock.results[i]] : []))
    expect(own).toHaveLength(1)
    const seen = await own[0].value
    expect(id && idTime(id)).toBe(Math.floor(Math.min(seen.birthtimeMs, seen.mtimeMs)))
  })
})

describe('ensurePageId', () => {
  const page = () => join(root, 'Notes', 'Note1.md')

  it('stamps an ID-less page with a page ID dated at its birthtime, keeping its mtime', async () => {
    const before = await stat(page())
    const r = await ensurePageId(page())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(kindOf(r.value)).toBe('page')
    expect(idTime(r.value)).toBe(Math.floor(Math.min(before.birthtimeMs, before.mtimeMs)))
    expect(splitFrontmatter(await readFile(page(), 'utf8'))[ID_KEY]).toBe(r.value)
    expect(Math.floor((await stat(page())).mtimeMs / 1000)).toBe(Math.floor(before.mtimeMs / 1000))
  })

  it('returns a stamped page its own ID and leaves the file untouched', async () => {
    const id = '01KVGMT8BFP350FZZXAMG1QDRA'
    await writeFile(page(), `---\nID: ${id}\n---\n\nbody`)
    expect(await ensurePageId(page())).toEqual({ ok: true, value: id })
    expect(await readFile(page(), 'utf8')).toBe(`---\nID: ${id}\n---\n\nbody`)
  })

  it('two concurrent calls on one ID-less page return the same ID, the one on disk', async () => {
    const [a, b] = await Promise.all([ensurePageId(page()), ensurePageId(page())])
    const onDisk = splitFrontmatter(await readFile(page(), 'utf8'))[ID_KEY]
    expect(a).toEqual({ ok: true, value: onDisk })
    expect(b).toEqual({ ok: true, value: onDisk })
  })
})
