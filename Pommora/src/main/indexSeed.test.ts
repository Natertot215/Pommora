import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ASSETS_DIR_REL } from '@shared/nexusPaths'
import { mkdir, mkdtemp, rm, unlink, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openSessionDb, closeSessionDb, sessionDb } from './sessionDb'
import { queryKeyHolders, queryMentions, readIndexedStats } from './Database/contentIndex'
import { corpusFiles } from './IO/walk'
import { sweepAdmitsBody } from './CRUD/util'
import { seedContentIndex } from './indexSeed'

const ULID_A = '01ARZ3NDEKTSV4RRFFQ69G5FAV'

let root: string
const abs = (...segs: string[]): string => join(root, ...segs)

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-seed-'))
  await mkdir(abs('.nexus'), { recursive: true })
  await writeFile(abs('.nexus', 'settings.json'), JSON.stringify({ excluded_folders: ['Hidden'] }))
  await mkdir(abs('Notes'), { recursive: true })
  await writeFile(abs('Notes', '_pagecollection.json'), JSON.stringify({ id: 'c1' }))
  await writeFile(
    abs('Notes', 'A.md'),
    `---\nPageID: ${ULID_A}\nStatus: Open\n---\n\nlinks [[Target]]\n`,
  )
  await mkdir(abs('Loose'), { recursive: true })
  await writeFile(abs('Loose', 'Note.md'), 'an un-adopted note linking [[Target]]\n')
  await mkdir(abs('Hidden'), { recursive: true })
  await writeFile(abs('Hidden', 'Secret.md'), 'an excluded note linking [[Target]]\n')
  openSessionDb(root)
})
afterEach(async () => {
  closeSessionDb()
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
    // The excluded note is unread and unrepresented — no rows, no stat gate entry.
    expect(stats?.has('Hidden/Secret.md')).toBe(false)
  })

  it("an Unknown file gets no rows but is stat-recorded, matching the sweep's skip", async () => {
    await writeFile(
      abs('Notes', 'Foreign.md'),
      '---\nTaskID: 01BX5ZZKBKACTAV9WEVGEMMVRZ\n---\n\n[[Target]]\n',
    )
    expect(sweepAdmitsBody(`---\nTaskID: 01BX5ZZKBKACTAV9WEVGEMMVRZ\n---\n\n[[Target]]\n`)).toBe(
      false,
    )
    await seedContentIndex(root)
    expect(queryMentions('target')?.sort()).toEqual(['Loose/Note.md', 'Notes/A.md'])
    expect(readIndexedStats()?.has('Notes/Foreign.md')).toBe(true)
  })

  it('the stat gate skips unmoved files and re-reads moved ones', async () => {
    await seedContentIndex(root)
    // Sabotage a row directly: an unmoved file must NOT be re-read, so the sabotage survives.
    sessionDb()?.prepare('DELETE FROM mentions WHERE path = ?').run('Notes/A.md')
    await seedContentIndex(root)
    expect(queryMentions('target')).toEqual(['Loose/Note.md'])
    // Move the file's stat; the re-read heals the sabotaged rows.
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
      `---\nPageID: ${ULID_A}\nStatus:\n  - Open\nfoo: bar\n---\n\nbody\n`,
    )
    await seedContentIndex(root)
    expect(queryKeyHolders('foo')).toEqual(['Notes/A.md'])
    expect(queryKeyHolders('Status')).toEqual(['Notes/A.md'])
    expect(queryKeyHolders('PageID')).toEqual(['Notes/A.md'])
  })

  it('with no database the seed stands down and queries stay null', async () => {
    closeSessionDb()
    await expect(seedContentIndex(root)).resolves.toBeUndefined()
    expect(queryMentions('target')).toBeNull()
  })
})
