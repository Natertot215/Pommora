import { describe, it, expect, afterEach, vi } from 'vitest'
import { chmod, mkdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { join, relative } from '../Paths/posix'
import { noModeBits, raceLandings, tempRoot } from '../Testing/hostFs'
import { jsonText, rewritePageSerialized } from '../Files/atomicWrite'
import { refillOf, sweepCount, sweepGovernedRoots, type SweepPlan } from './governedSweep'
import type { PropertyDefinition } from '../Properties/properties'
import { machine } from '../Platform/machine'
import { updatePageBody } from './page'
import { closeSession, openSession } from './session'
import { dropLiveTree, heldTreeOf, refreshTree } from './liveTree'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import * as indexSeed from '../Index/indexSeed'
import { seedContentIndex } from '../Index/indexSeed'
import * as contentIndex from '../Index/contentIndex'
import { readNexus } from './readNexus'
// Installs the own tap that records each landing in the index and the tree.
import './settle'

const roots: string[] = []
afterEach(async () => {
  vi.restoreAllMocks()
  dropLiveTree()
  installStores(NO_STORES)
  closeSession()
  for (const r of roots.splice(0)) await rm(r, { recursive: true, force: true })
})

async function seed(): Promise<{ root: string; a: string; b: string }> {
  const root = tempRoot('pom-sweep-')
  roots.push(root)
  await mkdir(join(root, 'Notes'), { recursive: true })
  await mkdir(join(root, 'Locked'), { recursive: true })
  const a = join(root, 'Notes', 'A.md')
  const b = join(root, 'Locked', 'B.md')
  await writeFile(a, '---\nID: 01KVGMT8BFP350FZZXAMG1QDRA\n---\nbody\n')
  await writeFile(b, '---\nID: 01KVGMT8BFP350FZZXAMG1QDRB\n---\nbody\n')
  return { root, a, b }
}

async function seedSidecar(root: string): Promise<{ file: string; text: string }> {
  await mkdir(join(root, '.nexus', 'contexts', 'Areas', 'Health'), { recursive: true })
  const file = join(root, '.nexus', 'contexts', 'Areas', 'Health', '_space.json')
  const text = jsonText({ id: '01KVGMT8BFP350FZZXAMG1QDRC' })
  await writeFile(file, text)
  return { file, text }
}

const plan: SweepPlan = { text: (c) => `${c}x`, raw: (raw) => ({ ...raw, Tags: ['b'] }) }
const tagging: SweepPlan = { raw: (raw) => ({ ...raw, Tags: ['b'] }) }

// A session over a Collection of `count` pages, its index seeded and its tree held.
async function indexed(count: number): Promise<{ root: string; pages: string[] }> {
  const root = tempRoot('pom-sweep-')
  roots.push(root)
  await mkdir(join(root, '.nexus'), { recursive: true })
  await mkdir(join(root, 'Notes'), { recursive: true })
  await writeFile(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: 'x' }))
  await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'c1' }))
  const pages = Array.from({ length: count }, (_, i) => join(root, 'Notes', `P${i}.md`))
  for (const [i, p] of pages.entries())
    await writeFile(p, `---\nID: 01KVGMT8BFP350FZZXAMG1Q${String(i).padStart(3, '0')}\n---\nbody\n`)
  await openSession(root)
  installStores(memoryStores().stores)
  await seedContentIndex(root)
  await refreshTree(root)
  return { root, pages }
}

// Holds the next landing until `release` runs.
function pausedLanding(): { landing: Promise<void>; release: () => void } {
  const m = machine()
  const real = m.land.bind(m)
  let release = (): void => {}
  let landed = (): void => {}
  const gate = new Promise<void>((r) => {
    release = r
  })
  const landing = new Promise<void>((r) => {
    landed = r
  })
  vi.spyOn(m, 'land').mockImplementationOnce(async (files) => {
    landed()
    await gate
    return real(files)
  })
  return { landing, release }
}

describe('sweepGovernedRoots', () => {
  it.skipIf(noModeBits)(
    'a file it can’t write is skipped and the files after it still sweep',
    async () => {
      const { root, a, b } = await seed()
      await chmod(join(root, 'Locked'), 0o555)
      try {
        const r = await sweepGovernedRoots([b, a], plan)
        expect(r).toEqual({
          skipped: [b],
          refused: [],
          touched: new Map([
            [
              a,
              {
                before: '---\nID: 01KVGMT8BFP350FZZXAMG1QDRA\n---\nbody\n',
                after: '---\nID: 01KVGMT8BFP350FZZXAMG1QDRA\n---\nbody\nx',
              },
            ],
          ]),
        })
      } finally {
        await chmod(join(root, 'Locked'), 0o755)
      }
    },
  )

  it('a root that can’t round-trip counts as skipped', async () => {
    const { root } = await seed()
    const unknown = join(root, 'Notes', 'Alien.md')
    const alien = '---\nID: 01KVGMT8BFT350FZZXAMG1QDTB\n---\nbody\n'
    await writeFile(unknown, alien)
    const bad = join(root, '.nexus', 'contexts', 'Areas', 'Health', '_space.json')
    await mkdir(join(root, '.nexus', 'contexts', 'Areas', 'Health'), { recursive: true })
    await writeFile(bad, '{ not json')
    const r = await sweepGovernedRoots([unknown, bad], plan)
    expect(r).toEqual({ skipped: [unknown, bad], refused: [unknown, bad], touched: new Map() })
    expect(await readFile(unknown, 'utf8')).toBe(alien)
    expect(await readFile(bad, 'utf8')).toBe('{ not json')
  })

  it('a dry run writes nothing and reports each write it would make', async () => {
    const { root, a } = await seed()
    const sidecar = await seedSidecar(root)
    const page = await readFile(a, 'utf8')
    const r = await sweepGovernedRoots([a, sidecar.file], plan, true)
    expect(r).toEqual({
      skipped: [],
      refused: [],
      touched: new Map([
        [a, { before: page, after: `${page}x` }],
        [
          sidecar.file,
          {
            before: sidecar.text,
            after: jsonText({ id: '01KVGMT8BFP350FZZXAMG1QDRC', Tags: ['b'] }),
          },
        ],
      ]),
    })
    expect(await readFile(a, 'utf8')).toBe(page)
    expect(await readFile(sidecar.file, 'utf8')).toBe(sidecar.text)
  })

  it('a page keeps its modification time and a sidecar is re-dated, each written by its kind', async () => {
    const { root, a } = await seed()
    const sidecar = await seedSidecar(root)
    const past = new Date('2020-06-01T12:00:00Z')
    await utimes(a, past, past)
    await utimes(sidecar.file, past, past)
    await sweepGovernedRoots([a, sidecar.file], plan)
    expect(Math.floor((await stat(a)).mtimeMs / 1000)).toBe(Math.floor(past.getTime() / 1000))
    expect((await stat(sidecar.file)).mtimeMs).toBeGreaterThan(past.getTime())
  })

  it.skipIf(noModeBits)(
    'a dry run files a file it can’t read as skipped, and sweepCount leaves it out',
    async () => {
      const { root, a, b } = await seed()
      const page = await readFile(a, 'utf8')
      await chmod(b, 0o000)
      try {
        expect(await sweepGovernedRoots([b, a], plan, true)).toEqual({
          skipped: [b],
          refused: [],
          touched: new Map([[a, { before: page, after: `${page}x` }]]),
        })
        expect(await sweepCount(root, [b, a], plan)).toBe(1)
      } finally {
        await chmod(b, 0o644)
      }
    },
  )

  it('a file changed outside the app since its read is left as written and skipped', async () => {
    const { a, b } = await seed()
    const outside = '---\nID: 01KVGMT8BFP350FZZXAMG1QDRB\n---\nwritten elsewhere\n'
    raceLandings((file) => file === b, outside)
    const r = await sweepGovernedRoots([a, b], tagging)
    expect(r.skipped).toEqual([b])
    expect([...r.touched.keys()]).toEqual([a])
    expect(await readFile(b, 'utf8')).toBe(outside)
    expect(await readFile(a, 'utf8')).toContain('Tags:')
  })

  it('a write to a page its chunk holds waits for the landing, and both land', async () => {
    const { a, b } = await seed()
    const { landing, release } = pausedLanding()
    const sweep = sweepGovernedRoots([a, b], tagging)
    await landing
    let edited = false
    const edit = updatePageBody(a, 'edited\n').then((r) => {
      edited = true
      return r
    })
    await new Promise((r) => setTimeout(r, 30))
    expect(edited).toBe(false)
    release()
    expect((await sweep).skipped).toEqual([])
    expect((await edit).ok).toBe(true)
    const text = await readFile(a, 'utf8')
    expect(text).toContain('Tags:')
    expect(text).toContain('edited')
  })

  it('a write queued behind a chunk records after the chunk does, so the index and the tree hold the file', async () => {
    const { root, pages } = await indexed(2)
    const [a] = pages
    const relA = relative(root, a)
    let open = (): void => {}
    const gate = new Promise<void>((r) => {
      open = r
    })
    const m = machine()
    const read = m.readText.bind(m)
    vi.spyOn(m, 'readText').mockImplementation(async (p) => {
      if (p === a) open()
      return read(p)
    })
    // The chunk's record is slowed, so a writer that wasn't held behind it would record first.
    const record = indexSeed.indexWrittenPages
    vi.spyOn(indexSeed, 'indexWrittenPages').mockImplementationOnce(async (...args) => {
      await new Promise((r) => setTimeout(r, 50))
      return record(...args)
    })
    const writer = gate.then(() => rewritePageSerialized(a, (c) => `${c}Z [[P1]]`))
    const { touched } = await sweepGovernedRoots(pages, tagging)
    await writer
    expect(await readFile(a, 'utf8')).toBe(`${touched.get(a)?.after}Z [[P1]]`)
    const held = contentIndex.readPageRelations([relA])
    const node = heldTreeOf(root)?.collections[0].pages.find((p) => p.path === relA)
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    expect(held).toEqual(contentIndex.readPageRelations([relA]))
    expect(node).toEqual((await readNexus(root)).collections[0].pages.find((p) => p.path === relA))
  })

  it('two sweeps over the same files in opposite orders both finish', {
    timeout: 2000,
  }, async () => {
    const { a, b } = await seed()
    const m = machine()
    const real = m.land.bind(m)
    vi.spyOn(m, 'land').mockImplementation(async (files) => {
      await new Promise((r) => setTimeout(r, 20))
      return real(files)
    })
    const [one, two] = await Promise.all([
      sweepGovernedRoots([a, b], tagging),
      sweepGovernedRoots([b, a], { raw: (raw) => ({ ...raw, Kind: 'x' }) }),
    ])
    expect([one.skipped, two.skipped]).toEqual([[], []])
  })

  it('lands 64 files a chunk, each chunk indexed in one commit', async () => {
    const { pages } = await indexed(65)
    const lands = vi.spyOn(machine(), 'land')
    const upserts = vi.spyOn(contentIndex, 'upsertPageIndexes')
    await sweepGovernedRoots(pages, tagging)
    expect(lands.mock.calls.map(([files]) => files.length)).toEqual([64, 1])
    expect(upserts).toHaveBeenCalledTimes(2)
  })

  it('a file whose rewrite throws costs only itself', async () => {
    const { a, b } = await seed()
    const r = await sweepGovernedRoots([a, b], {
      raw: (raw, file) => {
        if (file === a) throw new Error('boom')
        return { ...raw, Tags: ['b'] }
      },
    })
    expect(r.skipped).toEqual([a])
    expect(r.refused).toEqual([])
    expect([...r.touched.keys()]).toEqual([b])
  })
})

describe('sweepCount', () => {
  it('counts each file the plan would rewrite and writes none', async () => {
    const { root, a } = await seed()
    const sidecar = await seedSidecar(root)
    const page = await readFile(a, 'utf8')
    expect(await sweepCount(root, [a, sidecar.file], plan)).toBe(2)
    expect(await readFile(a, 'utf8')).toBe(page)
    expect(await readFile(sidecar.file, 'utf8')).toBe(sidecar.text)
  })

  it('counts no file the Archive holds, while the sweep it previews writes it', async () => {
    const { root, a } = await seed()
    const bundle = join(
      root,
      '.nexus',
      'archive',
      'C1',
      'Notes',
      '2026-10-20T12-00-00-000Z__C.md.archived',
    )
    await mkdir(bundle, { recursive: true })
    const archived = join(bundle, 'C.md')
    await writeFile(archived, '---\nID: 01KVGMT8BFP350FZZXAMG1QDRC\n---\nbody\n')
    expect(await sweepCount(root, [a, archived], plan)).toBe(1)
    expect((await sweepGovernedRoots([a, archived], plan, true)).touched.size).toBe(2)
  })
})

describe('refillOf', () => {
  const tags: PropertyDefinition = {
    id: 'prop_tags',
    label: 'Tags',
    key: 'Tags',
    type: 'multiSelect',
    select_options: [{ id: 'opt_alpha', key: 'alpha', label: 'alpha' }],
  }
  const refill = refillOf(tags, { holds: () => true })

  it('lands a Multi-Select in the order it was set aside in, its options and the words no option names alike', () => {
    expect(refill({ ID: 'x' }, ['zeta', 'alpha'])).toEqual({ ID: 'x', Tags: ['zeta', 'alpha'] })
  })
})
