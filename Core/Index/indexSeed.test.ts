import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ASSETS_DIR_REL } from '../Paths/nexusPaths'
import { mkdir, readFile, rename, rm, unlink, utimes, writeFile } from 'node:fs/promises'
import { dirname, join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { installStores, type Relation, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import * as contentIndex from './contentIndex'
import {
  queryKeyHolders,
  queryMembers,
  queryMentions,
  readHeadings,
  readIndexedStats,
} from './contentIndex'
import { corpusFiles } from '../Files/walk'
import { sweepParse, splitEnvelope } from '../Files/pageFile'
import { deindexPath, indexWrittenPages, moveIndexPaths, seedContentIndex } from './indexSeed'
import { renameCascade } from '../Nexus/cascade'
import { owedFor, oweSeen } from '../Nexus/fileEvents'
import { newContentId } from '../Nexus/ids'
import { machine } from '../Platform/machine'

const ULID_A = '01ARZ3NDEKPSV4RRFFQ69G5FAV'
const ULID_B = '01BX5ZZKBKPCTAV9WEVGEMMVRZ'
const ULID_C = '01CX5ZZKBKPCTAV9WEVGEMMVRC'
const BUNDLES = '.nexus/archive/c1/Notes/2026-10-20T12-00-00-000Z'

let root: string
let mem: ReturnType<typeof memoryStores>
const abs = (...segs: string[]): string => join(root, ...segs)
const rowsOf = (path: string): Relation[] =>
  [...mem.index.relations.values()]
    .filter((r) => r.path === path)
    .map(({ kind, target, qualifier, key }) => ({ kind, target, qualifier, key }))
    .sort((a, b) =>
      `${a.kind}\u0000${a.target}\u0000${a.qualifier}\u0000${a.key}`.localeCompare(
        `${b.kind}\u0000${b.target}\u0000${b.qualifier}\u0000${b.key}`,
      ),
    )

beforeEach(async () => {
  root = tempRoot('pom-seed-')
  await mkdir(abs('.nexus'), { recursive: true })
  await writeFile(abs('.nexus', 'settings.json'), JSON.stringify({ excluded_folders: ['Hidden'] }))
  await mkdir(abs('Notes'), { recursive: true })
  await writeFile(abs('Notes', '_pagecollection.json'), JSON.stringify({ id: 'c1' }))
  await writeFile(
    abs('Notes', 'A.md'),
    `---\nID: ${ULID_A}\nStatus: Open\n---\n\nlinks [[Target]]\n`,
  )
  await mkdir(abs('Loose'), { recursive: true })
  await writeFile(abs('Loose', 'Note.md'), 'an un-adopted note linking [[Target]]\n')
  await mkdir(abs('Hidden'), { recursive: true })
  await writeFile(abs('Hidden', 'Secret.md'), 'an excluded note linking [[Target]]\n')
  mem = memoryStores()
  installStores(mem.stores)
})
afterEach(async () => {
  vi.restoreAllMocks()
  installStores(NO_STORES)
  await rm(root, { recursive: true, force: true })
})

describe('seedContentIndex', () => {
  it('a seed of exactly 200 pages commits them once', async () => {
    for (let i = 0; i < 198; i++) await writeFile(abs('Notes', `P${i}.md`), `page ${i}\n`)
    const upserts = vi.spyOn(contentIndex, 'upsertPageIndexes')
    await seedContentIndex(root)
    expect(upserts.mock.calls.map(([rows]) => rows.length)).toEqual([200])
  })

  it('MUST AGREE with the corpus: every admitted corpusFiles path is indexed; excluded paths are in neither', async () => {
    await seedContentIndex(root)
    const corpus = await corpusFiles(root, { excluded: ['Hidden'], assetDir: ASSETS_DIR_REL })
    expect(corpus.sort()).toEqual(['Loose/Note.md', 'Notes/A.md'])
    const stats = readIndexedStats()
    for (const rel of corpus) expect(stats?.has(rel)).toBe(true)
    expect(queryMentions(['target'])?.sort()).toEqual(['Loose/Note.md', 'Notes/A.md'])
    expect(queryKeyHolders('Status')).toEqual(['Notes/A.md'])
    expect(stats?.has('Hidden/Secret.md')).toBe(false)
  })

  it('seeds the Archive as the corpus’s second root, and a hidden folder inside an archived Set gets no rows', async () => {
    const page = `${BUNDLES}__Old.md.archived/Old.md`
    const raw = `${BUNDLES}__Set.archived/Set/_raw/X.md`
    for (const rel of [page, raw]) await mkdir(dirname(abs(rel)), { recursive: true })
    await writeFile(abs(page), `---\nID: ${ULID_B}\n---\n\nlinks [[Target]]\n`)
    await writeFile(abs(raw), 'links [[Target]]\n')
    await seedContentIndex(root)
    const stats = readIndexedStats()
    expect(stats?.get(page)).toMatchObject({ id: ULID_B })
    expect(queryMentions(['target'])?.sort()).toEqual(['Loose/Note.md', 'Notes/A.md', page].sort())
    expect(stats?.has(raw)).toBe(false)
  })

  it('moves a page’s rows into the Archive and back, and a Set’s by prefix', async () => {
    await mkdir(abs('Notes', 'Sub'), { recursive: true })
    await writeFile(abs('Notes', 'Sub', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    await seedContentIndex(root)
    const moves = [
      ['Notes/A.md', `${BUNDLES}__A.md.archived/A.md`, 'Notes/A.md', ULID_A],
      ['Notes/Sub', `${BUNDLES}__Sub.archived/Sub`, 'Notes/Sub/B.md', ULID_B],
    ]
    for (const [from, to, page, id] of moves) {
      const archived = page.replace(from, to)
      await mkdir(dirname(abs(to)), { recursive: true })
      await rename(abs(from), abs(to))
      await moveIndexPaths(root, abs(from), abs(to))
      expect(readIndexedStats('.nexus/archive')?.get(archived)).toMatchObject({ id })
      expect(readIndexedStats()?.has(page)).toBe(false)
      await rename(abs(to), abs(from))
      await moveIndexPaths(root, abs(to), abs(from))
      expect(readIndexedStats()?.get(page)).toMatchObject({ id })
      expect(readIndexedStats()?.has(archived)).toBe(false)
    }
  })

  it('a removal of the Archive itself prunes every row beneath it', async () => {
    const page = `${BUNDLES}__Old.md.archived/Old.md`
    await mkdir(dirname(abs(page)), { recursive: true })
    await writeFile(abs(page), `---\nID: ${ULID_B}\n---\n\nold\n`)
    await seedContentIndex(root)
    const seen = await deindexPath(root, abs('.nexus/archive'))
    expect(seen.vanished).toEqual([{ id: ULID_B, title: 'Old', path: page }])
    expect(readIndexedStats('.nexus/archive')?.size).toBe(0)
  })

  it('writes and moves index only what the corpus admits: hidden and excluded paths get no rows', async () => {
    await seedContentIndex(root)
    await mkdir(abs('.obsidian', 'plugins'), { recursive: true })
    await mkdir(abs('Notes', '_Drafts'), { recursive: true })
    for (const rel of [
      '.obsidian/plugins/README.md',
      'Notes/_Drafts/Idea.md',
      'Hidden/Secret.md',
    ]) {
      await writeFile(abs(rel), 'links [[Target]]\n')
      await indexWrittenPages(root, [{ absPath: abs(rel) }])
    }
    expect(queryMentions(['target'])?.sort()).toEqual(['Loose/Note.md', 'Notes/A.md'])
    await moveIndexPaths(root, abs('Loose'), abs('Hidden', 'Loose'))
    expect(queryMentions(['target'])).toEqual(['Notes/A.md'])
    expect(readIndexedStats()?.has('Hidden/Loose/Note.md')).toBe(false)
  })

  it("an Unknown file gets no rows but is stat-recorded, matching the sweep's skip", async () => {
    await writeFile(
      abs('Notes', 'Foreign.md'),
      '---\nID: 01BX5ZZKBKTCTAV9WEVGEMMVRZ\n---\n\n[[Target]]\n',
    )
    expect(sweepParse(`---\nID: 01BX5ZZKBKTCTAV9WEVGEMMVRZ\n---\n\n[[Target]]\n`)).toBeNull()
    await seedContentIndex(root)
    expect(queryMentions(['target'])?.sort()).toEqual(['Loose/Note.md', 'Notes/A.md'])
    expect(readIndexedStats()?.has('Notes/Foreign.md')).toBe(true)
  })

  it('the stat gate skips unmoved files and re-reads moved ones', async () => {
    await seedContentIndex(root)
    // Sabotage a row directly: an unmoved file must NOT be re-read, so the sabotage survives.
    for (const [key, row] of mem.index.relations)
      if (row.path === 'Notes/A.md' && row.kind !== 'space') mem.index.relations.delete(key)
    await seedContentIndex(root)
    expect(queryMentions(['target'])).toEqual(['Loose/Note.md'])
    await utimes(abs('Notes', 'A.md'), new Date(), new Date(Date.now() + 5000))
    await seedContentIndex(root)
    expect(queryMentions(['target'])?.sort()).toEqual(['Loose/Note.md', 'Notes/A.md'])
  })

  it("a deleted file's rows prune on the next seed", async () => {
    await seedContentIndex(root)
    await unlink(abs('Loose', 'Note.md'))
    await seedContentIndex(root)
    expect(queryMentions(['target'])).toEqual(['Notes/A.md'])
    expect(readIndexedStats()?.has('Loose/Note.md')).toBe(false)
  })

  it('records every frontmatter key, registered or not, so a name registered later finds its holders', async () => {
    await writeFile(
      abs('Notes', 'A.md'),
      `---\nID: ${ULID_A}\nStatus:\n  - Open\nfoo: bar\n---\n\nbody\n`,
    )
    await seedContentIndex(root)
    expect(queryKeyHolders('foo')).toEqual(['Notes/A.md'])
    expect(queryKeyHolders('Status')).toEqual(['Notes/A.md'])
    expect(queryKeyHolders('ID')).toEqual(['Notes/A.md'])
  })

  it('records every `<Title>` key as a space row, one row per exact value, scalar or list; a member of any other shape names nothing', async () => {
    await writeFile(
      abs('Notes', 'A.md'),
      `---\nID: ${ULID_A}\n<Projects>:\n  - Pommora\n  - pommora\n<Areas>: 2024\n<Topics>:\n  - [[Pommora]]\n---\n\nbody\n`,
    )
    await writeFile(abs('Loose', 'Note.md'), '---\n<Projects>: Sapphire\n---\n\nun-adopted\n')
    await seedContentIndex(root)
    expect(queryMembers('<Projects>', 'pommora')).toEqual(['Notes/A.md'])
    expect(queryMembers('<Projects>', 'Sapphire')).toEqual(['Loose/Note.md'])
    expect(queryMembers('<Projects>')?.sort()).toEqual(['Loose/Note.md', 'Notes/A.md'])
    expect(queryMembers('<Areas>', '2024')).toEqual(['Notes/A.md'])
    expect(queryMembers('<Areas>', 'pommora')).toEqual([])
    expect(queryMembers('<Topics>', 'pommora')).toEqual([])
  })

  it('records a page’s headings as text and level, and its heading links to another page', async () => {
    await writeFile(
      abs('Notes', 'A.md'),
      `---\nID: ${ULID_A}\n---\n\n## Setup\n### Notes\n\nlinks [[B#Intro]]\n`,
    )
    await seedContentIndex(root)
    expect(readHeadings()).toMatchObject({
      'Notes/A.md': [
        { text: 'Setup', level: 2 },
        { text: 'Notes', level: 3 },
      ],
    })
    expect(queryMentions(['b'], 'intro')).toEqual(['Notes/A.md'])
  })

  it('records a bare `[[#Heading]]` as a heading mention of its own page, keyed to no title', async () => {
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n## Setup\n\n[[#Setup]]\n`)
    await seedContentIndex(root)
    expect(queryMentions([''], 'setup')).toEqual(['Notes/A.md'])
  })

  it('recognizes an external heading rename and cascades it (B and A’s own bare link both follow)', async () => {
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n## Setup\n\n[[#Setup]]\n`)
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${newContentId('page')}\n---\n\n[[A#Setup]]\n`)
    await seedContentIndex(root)
    // An external editor rewrites only the heading line — the raw file's link still reads the old heading, exactly as an outside writer leaves it.
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n## Intro\n\n[[#Setup]]\n`)
    const [seen] = (await indexWrittenPages(root, [{ absPath: abs('Notes', 'A.md') }])).renames
    expect(seen).toEqual({ path: 'Notes/A.md', old: 'setup', next: 'Intro' })
    await renameCascade(root, { path: seen.path, heading: seen.old, to: seen.next })
    // The cascade's own writes re-enter the re-scan with nothing gone, so nothing loops.
    expect((await indexWrittenPages(root, [{ absPath: abs('Notes', 'B.md') }])).renames).toEqual([])
    expect(splitEnvelope(await readFile(abs('Notes', 'A.md'), 'utf8')).body).toBe(
      '## Intro\n\n[[#Intro]]\n',
    )
    expect(splitEnvelope(await readFile(abs('Notes', 'B.md'), 'utf8')).body).toBe('[[A#Intro]]\n')
  })

  it('leaves a page alone when two new headings appear at once (murkier than a rename)', async () => {
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n## Setup\n\n[[#Setup]]\n`)
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${newContentId('page')}\n---\n\n[[A#Setup]]\n`)
    await seedContentIndex(root)
    await writeFile(
      abs('Notes', 'A.md'),
      `---\nID: ${ULID_A}\n---\n\n## One\n\n## Two\n\n[[#Setup]]\n`,
    )
    expect((await indexWrittenPages(root, [{ absPath: abs('Notes', 'A.md') }])).renames).toEqual([])
  })

  it('a linked heading replaced by a section elsewhere is not a rename', async () => {
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n## Setup\n\n## Keep\n`)
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${newContentId('page')}\n---\n\n[[A#Setup]]\n`)
    await seedContentIndex(root)
    await writeFile(
      abs('Notes', 'A.md'),
      `---\nID: ${ULID_A}\n---\n\n## Keep\n\n## Meeting Notes\n`,
    )
    expect((await indexWrittenPages(root, [{ absPath: abs('Notes', 'A.md') }])).renames).toEqual([])
  })

  it('renaming one of two headings sharing the old text is not a rename', async () => {
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n## Setup\n\n## Setup\n`)
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${newContentId('page')}\n---\n\n[[A#Setup]]\n`)
    await seedContentIndex(root)
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n## Intro\n\n## Setup\n`)
    expect((await indexWrittenPages(root, [{ absPath: abs('Notes', 'A.md') }])).renames).toEqual([])
  })

  it('with no database the seed stands down and queries stay null', async () => {
    installStores(NO_STORES)
    await expect(seedContentIndex(root)).resolves.toEqual({
      db: null,
      rels: [],
      renames: [],
      vanished: [],
      landed: [],
    })
    expect(queryMentions(['target'])).toBeNull()
  })

  it('reports a pruned page as vanished and a page the snapshot lacked as landed; a cold seed reports neither', async () => {
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    const cold = await seedContentIndex(root)
    expect([cold.vanished, cold.landed]).toEqual([[], []])
    await unlink(abs('Notes', 'B.md'))
    await writeFile(abs('Notes', 'C.md'), `---\nID: ${ULID_C}\n---\n\ngamma\n`)
    await writeFile(abs('Notes', 'Bare.md'), 'bare\n')
    const warm = await seedContentIndex(root)
    expect(warm.vanished).toEqual([{ id: ULID_B, title: 'B', path: 'Notes/B.md' }])
    expect(warm.landed).toEqual([ULID_C])
  })

  it('the vanished and landed pages a seed reports reach the record', async () => {
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    await seedContentIndex(root)
    await unlink(abs('Notes', 'B.md'))
    await writeFile(abs('Notes', 'C.md'), `---\nID: ${ULID_C}\n---\n\ngamma\n`)
    oweSeen(root, await seedContentIndex(root))
    expect([...owedFor(root).vanished.values()]).toEqual([
      { id: ULID_B, title: 'B', path: 'Notes/B.md' },
    ])
    expect([...owedFor(root).landed]).toEqual([ULID_C])
  })
})

describe('what an index step reports', () => {
  beforeEach(async () => {
    await mkdir(abs('Notes', 'Sub'), { recursive: true })
    await writeFile(abs('Notes', 'Sub', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    await seedContentIndex(root)
  })

  it('removing a page answers that page and removes its rows', async () => {
    await unlink(abs('Notes', 'A.md'))
    expect(await deindexPath(root, abs('Notes', 'A.md'))).toEqual({
      renames: [],
      vanished: [{ id: ULID_A, title: 'A', path: 'Notes/A.md' }],
      landed: [],
    })
    expect(readIndexedStats()?.has('Notes/A.md')).toBe(false)
  })

  it('removing a folder answers every page under it and removes their rows', async () => {
    await rm(abs('Notes'), { recursive: true })
    const seen = await deindexPath(root, abs('Notes'))
    expect(seen.vanished.sort((a, b) => a.path.localeCompare(b.path))).toEqual([
      { id: ULID_A, title: 'A', path: 'Notes/A.md' },
      { id: ULID_B, title: 'B', path: 'Notes/Sub/B.md' },
    ])
    expect([...(readIndexedStats()?.keys() ?? [])]).toEqual(['Loose/Note.md'])
  })

  it('a page re-indexed under another ID answers the old page vanished and the new ID landed', async () => {
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_C}\n---\n\nalpha\n`)
    expect(await indexWrittenPages(root, [{ absPath: abs('Notes', 'A.md') }])).toEqual({
      renames: [],
      vanished: [{ id: ULID_A, title: 'A', path: 'Notes/A.md' }],
      landed: [ULID_C],
    })
  })

  it('a page indexed at a path the index lacked lands its ID; one it held, or one without an ID, lands nothing', async () => {
    await writeFile(abs('Notes', 'C.md'), `---\nID: ${ULID_C}\n---\n\ngamma\n`)
    expect((await indexWrittenPages(root, [{ absPath: abs('Notes', 'C.md') }])).landed).toEqual([
      ULID_C,
    ])
    expect((await indexWrittenPages(root, [{ absPath: abs('Notes', 'C.md') }])).landed).toEqual([])
    expect((await indexWrittenPages(root, [{ absPath: abs('Notes', 'A.md') }])).landed).toEqual([])
    await writeFile(abs('Notes', 'Bare.md'), 'bare\n')
    expect((await indexWrittenPages(root, [{ absPath: abs('Notes', 'Bare.md') }])).landed).toEqual(
      [],
    )
  })

  it("a batch keeps the row a writer landed during a page's read, and writes nothing once a switch moved the database", async () => {
    const a = abs('Notes', 'A.md')
    const b = abs('Notes', 'Sub', 'B.md')
    const read = machine().readText.bind(machine())
    let during: { path: string; act: () => Promise<void> } | null = null
    vi.spyOn(machine(), 'readText').mockImplementation(async (p) => {
      const text = await read(p)
      const hook = during?.path === p ? during : null
      if (hook) {
        during = null
        await hook.act()
      }
      return text
    })
    const writer = async (): Promise<void> => {
      await writeFile(a, `---\nID: ${ULID_A}\nStatus: Writer\n---\n`)
      await indexWrittenPages(root, [{ absPath: a }])
    }
    const statusOfA = (): string[] =>
      [...mem.index.values.values()]
        .filter((v) => v.path === 'Notes/A.md' && v.key === 'Status')
        .map((v) => v.value)
    for (const path of [b, a]) {
      await writeFile(a, `---\nID: ${ULID_A}\nStatus: Batch\n---\n`)
      during = { path, act: writer }
      await indexWrittenPages(root, [{ absPath: a }, { absPath: b }])
      expect(statusOfA()).toEqual([JSON.stringify('Writer')])
    }
    const fresh = memoryStores()
    during = { path: b, act: async () => installStores(fresh.stores) }
    await indexWrittenPages(root, [{ absPath: b }])
    expect(fresh.index.stats.size).toBe(0)
    // An entry outside the corpus reads only the settings its scope comes from, so the switch lands after b's in-loop check.
    const later = memoryStores()
    const switching = {
      path: abs('.nexus', 'settings.json'),
      act: async () => installStores(later.stores),
    }
    during = {
      path: b,
      act: async () => {
        during = switching
      },
    }
    await indexWrittenPages(root, [{ absPath: b }, { absPath: abs('Hidden', 'Secret.md') }])
    expect(later.index.stats.size).toBe(0)
  })

  it('a batch keeps the row a writer that kept the page’s time and size landed during its read', async () => {
    const a = abs('Notes', 'A.md')
    const b = abs('Notes', 'Sub', 'B.md')
    const at = (text: string) => async (): Promise<void> => {
      await writeFile(a, `---\nID: ${ULID_A}\nStatus: ${text}\n---\n`)
      await utimes(a, 1700000000, 1700000000)
    }
    await at('Batch')()
    await seedContentIndex(root)
    const read = machine().readText.bind(machine())
    vi.spyOn(machine(), 'readText').mockImplementation(async (p) => {
      const text = await read(p)
      if (p === b) {
        await at('Bunch')()
        await indexWrittenPages(root, [{ absPath: a }])
      }
      return text
    })
    await indexWrittenPages(root, [{ absPath: a }, { absPath: b }])
    const status = [...mem.index.values.values()].filter(
      (v) => v.path === 'Notes/A.md' && v.key === 'Status',
    )
    expect(status.map((v) => v.value)).toEqual([JSON.stringify('Bunch')])
  })

  it('a batch leaves out the row of a page unindexed during its read', async () => {
    const a = abs('Notes', 'A.md')
    const b = abs('Notes', 'Sub', 'B.md')
    const read = machine().readText.bind(machine())
    vi.spyOn(machine(), 'readText').mockImplementation(async (p) => {
      const text = await read(p)
      if (p === b) {
        await unlink(a)
        await deindexPath(root, a)
      }
      return text
    })
    await indexWrittenPages(root, [{ absPath: a }, { absPath: b }])
    expect(readIndexedStats()?.has('Notes/A.md')).toBe(false)
  })

  it('a batch leaves out the row of a page whose folder was removed during its read', async () => {
    const a = abs('Notes', 'A.md')
    const b = abs('Notes', 'Sub', 'B.md')
    const read = machine().readText.bind(machine())
    vi.spyOn(machine(), 'readText').mockImplementation(async (p) => {
      const text = await read(p)
      if (p === b) {
        await rm(abs('Notes'), { recursive: true })
        await deindexPath(root, abs('Notes'))
      }
      return text
    })
    await indexWrittenPages(root, [{ absPath: a }, { absPath: b }])
    expect([...(readIndexedStats()?.keys() ?? [])]).toEqual(['Loose/Note.md'])
  })

  it('a batch leaves a page whose folder moved during its read at the new path alone', async () => {
    const a = abs('Notes', 'A.md')
    const b = abs('Notes', 'Sub', 'B.md')
    const read = machine().readText.bind(machine())
    vi.spyOn(machine(), 'readText').mockImplementation(async (p) => {
      const text = await read(p)
      if (p === b) {
        await rename(abs('Notes'), abs('Moved'))
        await moveIndexPaths(root, abs('Notes'), abs('Moved'))
      }
      return text
    })
    await indexWrittenPages(root, [{ absPath: a }, { absPath: b }])
    expect([...(readIndexedStats()?.keys() ?? [])].sort()).toEqual([
      'Loose/Note.md',
      'Moved/A.md',
      'Moved/Sub/B.md',
    ])
  })
})

describe('the relations a page yields', () => {
  const page = async (body: string): Promise<void> => {
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n${body}`)
    await seedContentIndex(root)
  }

  it('a body link is one `body` row', async () => {
    await page('links [[Zeta]]\n')
    expect(rowsOf('Notes/A.md')).toEqual([{ kind: 'body', target: 'zeta', qualifier: '', key: '' }])
  })

  it('a lone embed is an `embed` row, never a `body` one', async () => {
    await page('![[Zeta]]\n')
    expect(rowsOf('Notes/A.md')).toEqual([
      { kind: 'embed', target: 'zeta', qualifier: '', key: '' },
    ])
  })

  it('a mid-line embed is the connection after its `!`, a `body` row', async () => {
    await page('shows ![[Zeta]]\n')
    expect(rowsOf('Notes/A.md')).toEqual([{ kind: 'body', target: 'zeta', qualifier: '', key: '' }])
  })

  it('a markdown link behind a `!` is a `body` row, alone on its line or inline', async () => {
    await page('![Alias](Zeta)\n')
    expect(rowsOf('Notes/A.md')).toEqual([{ kind: 'body', target: 'zeta', qualifier: '', key: '' }])
    await page('shows ![Alias](Zeta)\n')
    expect(rowsOf('Notes/A.md')).toEqual([{ kind: 'body', target: 'zeta', qualifier: '', key: '' }])
  })

  it('a lone heading embed is an `embed` row qualified by the heading', async () => {
    await page('![[Zeta#Part]]\n')
    expect(rowsOf('Notes/A.md')).toEqual([
      { kind: 'embed', target: 'zeta', qualifier: 'part', key: '' },
    ])
  })

  it('a whole-value link is a `value` row under its key', async () => {
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\nRef: '[[Zeta]]'\n---\n\nbody\n`)
    await seedContentIndex(root)
    expect(rowsOf('Notes/A.md')).toEqual([
      { kind: 'value', target: 'zeta', qualifier: '', key: 'Ref' },
    ])
  })

  it('a whole-value link aimed at a heading is a `value` row qualified by it', async () => {
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\nRef: '[[Zeta#Part]]'\n---\n\nbody\n`)
    await seedContentIndex(root)
    expect(rowsOf('Notes/A.md')).toEqual([
      { kind: 'value', target: 'zeta', qualifier: 'part', key: 'Ref' },
    ])
  })

  it('a `<Title>` key is a `space` row holding the Space title and the Context key', async () => {
    await writeFile(
      abs('Notes', 'A.md'),
      `---\nID: ${ULID_A}\n<Projects>:\n  - Pommora\n---\n\nbody\n`,
    )
    await seedContentIndex(root)
    expect(rowsOf('Notes/A.md')).toEqual([
      { kind: 'space', target: 'Pommora', qualifier: '<Projects>', key: '' },
    ])
  })

  it('a link inside a footnote definition overlays a `citation` row on its `body` row', async () => {
    await page('intro\n\n[^1]: see [[Zeta]]\n')
    expect(rowsOf('Notes/A.md')).toEqual([
      { kind: 'body', target: 'zeta', qualifier: '', key: '' },
      { kind: 'citation', target: 'zeta', qualifier: '', key: '' },
    ])
  })

  it('two occurrences of one target are one row', async () => {
    await page('links [[Zeta]] and again [[Zeta]]\n')
    expect(rowsOf('Notes/A.md')).toEqual([{ kind: 'body', target: 'zeta', qualifier: '', key: '' }])
  })

  it('classifies by line, not by offset: a link far past the block’s line index stays out of it', async () => {
    // The opening link's OFFSET exceeds the footnote block's LINE index, so reading one as the other misfiles it.
    const lead = `${'lead words '.repeat(12)}[[Zeta]]`
    const filler = Array.from({ length: 40 }, (_, i) => `filler line ${i}`).join('\n')
    await page(`${lead}\n${filler}\n\n[^1]: see [[Zeta]]\n`)
    expect(rowsOf('Notes/A.md')).toEqual([
      { kind: 'body', target: 'zeta', qualifier: '', key: '' },
      { kind: 'citation', target: 'zeta', qualifier: '', key: '' },
    ])
  })

  it('a `[^1]:` line inside a fenced block opens no footnote block', async () => {
    const body = 'links [[Zeta]]\n\n```\n[^1]: see [[Omega]]\n```\n'
    await page(body)
    expect(rowsOf('Notes/A.md')).toEqual([{ kind: 'body', target: 'zeta', qualifier: '', key: '' }])
  })

  it('a `[^1]:` cell inside a table opens no footnote block', async () => {
    const body = 'links [[Zeta]]\n\n| Note | Ref |\n| --- | --- |\n| [^1]: see [[Omega]] | x |\n'
    await page(body)
    expect(rowsOf('Notes/A.md')).toEqual([
      { kind: 'body', target: 'omega', qualifier: '', key: '' },
      { kind: 'body', target: 'zeta', qualifier: '', key: '' },
    ])
  })

  // The ruled form: a rename writes a `§` run inside a cell as the cell codec escapes it, and the index reads the row's source, so the run keeps the row and loses the edge; a codec-aware read would change this.
  it('a `§` run escaped inside a table cell yields no row, where the same run in prose does', async () => {
    await page('## A|B\n\n| h |\n|---|\n| §A\\|B |\n')
    expect(rowsOf('Notes/A.md')).toEqual([])
    await page('## A|B\n\n§A|B\n')
    expect(rowsOf('Notes/A.md')).toEqual([{ kind: 'body', target: '', qualifier: 'a|b', key: '' }])
  })

  it('a wikilink inside an inline code span names nothing', async () => {
    await page('a sample `[[Zeta]]` here\n')
    expect(rowsOf('Notes/A.md')).toEqual([])
  })

  it('a link inside a value is a `value` row under its key, its own heading keyed to no title', async () => {
    await writeFile(
      abs('Notes', 'A.md'),
      `---\nID: ${ULID_A}\ndescription: see [[Zeta]] and [[#Part]]\n---\n\n## Part\n`,
    )
    await seedContentIndex(root)
    expect(rowsOf('Notes/A.md')).toEqual([
      { kind: 'value', target: '', qualifier: 'part', key: 'description' },
      { kind: 'value', target: 'zeta', qualifier: '', key: 'description' },
    ])
  })

  it('one target under two keys is a `value` row per key, beside the body’s own row', async () => {
    await writeFile(
      abs('Notes', 'A.md'),
      `---\nID: ${ULID_A}\nRef: '[[Zeta]]'\nNotes: see [[Zeta]] twice [[Zeta]]\n---\n\nalso [[Zeta]]\n`,
    )
    await seedContentIndex(root)
    expect(rowsOf('Notes/A.md')).toEqual([
      { kind: 'body', target: 'zeta', qualifier: '', key: '' },
      { kind: 'value', target: 'zeta', qualifier: '', key: 'Notes' },
      { kind: 'value', target: 'zeta', qualifier: '', key: 'Ref' },
    ])
  })
})
