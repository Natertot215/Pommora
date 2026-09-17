import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ASSETS_DIR_REL } from '../Paths/nexusPaths'
import { mkdir, rm, unlink, utimes, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import {
  queryHeadingMentions,
  queryKeyHolders,
  queryMembers,
  queryMentions,
  readHeadings,
  readIndexedStats,
} from './contentIndex'
import { corpusFiles } from '../Files/walk'
import { sweepAdmitsBody, splitEnvelope } from '../Files/pageFile'
import { readFile } from 'node:fs/promises'
import { indexWrittenPage, seedContentIndex } from './indexSeed'
import { renameHeadingCascade } from '../Nexus/cascade'
import { newContentId } from '../Nexus/ids'

const ULID_A = '01ARZ3NDEKPSV4RRFFQ69G5FAV'

let root: string
let mem: ReturnType<typeof memoryStores>
const abs = (...segs: string[]): string => join(root, ...segs)

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
  installStores(NO_STORES)
  await rm(root, { recursive: true, force: true })
})

describe('seedContentIndex', () => {
  it('MUST AGREE with the corpus: every admitted corpusFiles path is indexed; excluded paths are in neither', async () => {
    await seedContentIndex(root)
    const corpus = await corpusFiles(root, { excluded: ['Hidden'], assetDir: ASSETS_DIR_REL })
    expect(corpus.sort()).toEqual(['Loose/Note.md', 'Notes/A.md'])
    const stats = readIndexedStats()
    for (const rel of corpus) expect(stats?.has(rel)).toBe(true)
    expect(queryMentions('target')?.sort()).toEqual(['Loose/Note.md', 'Notes/A.md'])
    expect(queryKeyHolders('Status')).toEqual(['Notes/A.md'])
    expect(stats?.has('Hidden/Secret.md')).toBe(false)
  })

  it("an Unknown file gets no rows but is stat-recorded, matching the sweep's skip", async () => {
    await writeFile(
      abs('Notes', 'Foreign.md'),
      '---\nID: 01BX5ZZKBKTCTAV9WEVGEMMVRZ\n---\n\n[[Target]]\n',
    )
    expect(sweepAdmitsBody(`---\nID: 01BX5ZZKBKTCTAV9WEVGEMMVRZ\n---\n\n[[Target]]\n`)).toBe(false)
    await seedContentIndex(root)
    expect(queryMentions('target')?.sort()).toEqual(['Loose/Note.md', 'Notes/A.md'])
    expect(readIndexedStats()?.has('Notes/Foreign.md')).toBe(true)
  })

  it('the stat gate skips unmoved files and re-reads moved ones', async () => {
    await seedContentIndex(root)
    // Sabotage a row directly: an unmoved file must NOT be re-read, so the sabotage survives.
    for (const [key, row] of mem.index.mentions)
      if (row.path === 'Notes/A.md') mem.index.mentions.delete(key)
    await seedContentIndex(root)
    expect(queryMentions('target')).toEqual(['Loose/Note.md'])
    await utimes(abs('Notes', 'A.md'), new Date(), new Date(Date.now() + 5000))
    await seedContentIndex(root)
    expect(queryMentions('target')?.sort()).toEqual(['Loose/Note.md', 'Notes/A.md'])
  })

  it("a deleted file's rows prune on the next seed", async () => {
    await seedContentIndex(root)
    await unlink(abs('Loose', 'Note.md'))
    await seedContentIndex(root)
    expect(queryMentions('target')).toEqual(['Notes/A.md'])
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

  it('records every `<Title>` key as memberships, one normalized row per value, scalar or list', async () => {
    await writeFile(
      abs('Notes', 'A.md'),
      `---\nID: ${ULID_A}\n<Projects>:\n  - Pommora\n  - pommora\n<Areas>: 2024\n---\n\nbody\n`,
    )
    await writeFile(abs('Loose', 'Note.md'), '---\n<Projects>: Sapphire\n---\n\nun-adopted\n')
    await seedContentIndex(root)
    expect(queryMembers('<Projects>', 'pommora')).toEqual(['Notes/A.md'])
    expect(queryMembers('<Projects>', 'sapphire')).toEqual(['Loose/Note.md'])
    expect(queryMembers('<Projects>')?.sort()).toEqual(['Loose/Note.md', 'Notes/A.md'])
    expect(queryMembers('<Areas>', '2024')).toEqual(['Notes/A.md'])
    expect(queryMembers('<Areas>', 'pommora')).toEqual([])
  })

  it('records a page’s heading keys and its heading links to another page', async () => {
    await writeFile(
      abs('Notes', 'A.md'),
      `---\nID: ${ULID_A}\n---\n\n## Setup\n\nlinks [[B#Intro]]\n`,
    )
    await seedContentIndex(root)
    expect(readHeadings()).toMatchObject({ 'Notes/A.md': ['setup'] })
    expect(queryHeadingMentions('b', 'intro')).toEqual(['Notes/A.md'])
  })

  it('records a bare `[[#Heading]]` as a heading mention naming its own page', async () => {
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n## Setup\n\n[[#Setup]]\n`)
    await seedContentIndex(root)
    expect(queryHeadingMentions('a', 'setup')).toEqual(['Notes/A.md'])
  })

  it('recognizes an external heading rename and cascades it (B and A’s own bare link both follow)', async () => {
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n## Setup\n\n[[#Setup]]\n`)
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${newContentId('page')}\n---\n\n[[A#Setup]]\n`)
    await seedContentIndex(root)
    // An external editor rewrites only the heading line — the raw file's link still reads the old heading, exactly as an outside writer leaves it.
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n## Intro\n\n[[#Setup]]\n`)
    const seen = await indexWrittenPage(root, abs('Notes', 'A.md'))
    expect(seen).toEqual({ title: 'A', old: 'setup', next: 'Intro' })
    await renameHeadingCascade(root, seen!.title, seen!.old, seen!.next, null)
    // The cascade's own writes re-enter the re-scan with nothing gone, so nothing loops.
    expect(await indexWrittenPage(root, abs('Notes', 'B.md'))).toBeNull()
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
    expect(await indexWrittenPage(root, abs('Notes', 'A.md'))).toBeNull()
  })

  it('a linked heading replaced by a section elsewhere is not a rename', async () => {
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n## Setup\n\n## Keep\n`)
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${newContentId('page')}\n---\n\n[[A#Setup]]\n`)
    await seedContentIndex(root)
    await writeFile(
      abs('Notes', 'A.md'),
      `---\nID: ${ULID_A}\n---\n\n## Keep\n\n## Meeting Notes\n`,
    )
    expect(await indexWrittenPage(root, abs('Notes', 'A.md'))).toBeNull()
  })

  it('with no database the seed stands down and queries stay null', async () => {
    installStores(NO_STORES)
    await expect(seedContentIndex(root)).resolves.toBeUndefined()
    expect(queryMentions('target')).toBeNull()
  })
})
