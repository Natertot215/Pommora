import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PAGE_ID_KEY } from '@shared/identity'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { stampAdopted } from './adopt'
import { readSidecar } from './sidecarIO'
import { readFrontmatterFields } from './io/pageFile'
import { isUlid } from './ids'
import { pageCollectionSidecar, pageSetSidecar } from '@shared/schemas'
import { nexusConfig, nexusDir, NEXUS_CONFIG_FILES, SIDECAR_FILENAME } from './paths'

let root: string

// A raw, sidecar-less nexus: a top folder (→ Collection), a nested folder (→ Set) and a
// deeper one (→ Sub-Set), a page carrying foreign frontmatter but no id, and an excluded
// folder that must stay untouched.
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-adopt-'))
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
  await rm(root, { recursive: true, force: true })
})

const coll = (p: string) => readSidecar(p, 'collection', pageCollectionSidecar)
const set = (p: string) => readSidecar(p, 'set', pageSetSidecar)

describe('stampAdopted', () => {
  it('mints ULID sidecars for raw folders at every depth', async () => {
    const { stamped } = await stampAdopted(root)
    expect(stamped).toBeGreaterThan(0)

    const notes = await coll(join(root, 'Notes'))
    const daily = await set(join(root, 'Notes', 'Daily'))
    const deep = await set(join(root, 'Notes', 'Daily', 'Deep'))

    expect(notes?.id && isUlid(notes.id)).toBeTruthy()
    expect(daily?.id && isUlid(daily.id)).toBeTruthy()
    expect(deep?.id && isUlid(deep.id)).toBeTruthy()

    // Each is its own identity — parentage is the folder nesting, never a stored field.
    expect(new Set([notes!.id, daily!.id, deep!.id]).size).toBe(3)
  })

  it('stamps a frontmatter-less page id and preserves foreign frontmatter', async () => {
    await stampAdopted(root)

    const note1 = readFrontmatterFields(await readFile(join(root, 'Notes', 'Note1.md'), 'utf8'))
    expect(typeof note1[PAGE_ID_KEY] === 'string' && isUlid(note1[PAGE_ID_KEY])).toBeTruthy()
    expect(note1.aliases).toEqual(['foo']) // foreign key survived

    const day1 = readFrontmatterFields(
      await readFile(join(root, 'Notes', 'Daily', 'Day1.md'), 'utf8'),
    )
    expect(typeof day1[PAGE_ID_KEY] === 'string' && isUlid(day1[PAGE_ID_KEY])).toBeTruthy()
  })

  it('is idempotent — a second run stamps nothing and leaves ids unchanged', async () => {
    await stampAdopted(root)
    const firstId = (await coll(join(root, 'Notes')))!.id

    const { stamped } = await stampAdopted(root)
    expect(stamped).toBe(0)
    expect((await coll(join(root, 'Notes')))!.id).toBe(firstId)
  })

  it('never touches an excluded folder', async () => {
    await stampAdopted(root)
    expect(await coll(join(root, 'Excluded'))).toBeNull()
    expect(await set(join(root, 'Excluded'))).toBeNull()
  })

  it('never fabricates a Collection on an Agenda singleton (identified by config sidecar)', async () => {
    await mkdir(join(root, 'My Tasks'), { recursive: true })
    await writeFile(join(root, 'My Tasks', '_taskconfig.json'), '{}')
    await writeFile(join(root, 'My Tasks', 'Submit.md'), '# a member')
    await stampAdopted(root)
    expect(await coll(join(root, 'My Tasks'))).toBeNull() // no _pagecollection.json written
  })

  it('never fabricates a Collection on an empty, sidecar-less folder', async () => {
    await mkdir(join(root, 'Stray'), { recursive: true }) // no pages, no subfolders, no sidecar
    await stampAdopted(root)
    expect(await coll(join(root, 'Stray'))).toBeNull()
  })

  it('adopts a content-bearing folder named "Tasks" with no agenda config (name not reserved)', async () => {
    await mkdir(join(root, 'Tasks'), { recursive: true })
    await writeFile(join(root, 'Tasks', 'Note.md'), '# a real page')
    await stampAdopted(root)
    expect((await coll(join(root, 'Tasks')))?.id).toBeTruthy() // adopted as a normal Collection
  })

  it('never mints over a sidecar it could not read — the subtree still adopts around it', async () => {
    const sidecar = join(root, 'Notes', SIDECAR_FILENAME.collection)
    await writeFile(sidecar, '{ corrupt', 'utf8')
    await stampAdopted(root)
    expect(await readFile(sidecar, 'utf8')).toBe('{ corrupt') // byte-identical
    // The children are independent entities, so they adopt regardless of the parent's state.
    const daily = await set(join(root, 'Notes', 'Daily'))
    expect(daily?.id).toBeTruthy()
  })

  it('a page whose frontmatter refuses the id write is skipped, not clobbered', async () => {
    const page = join(root, 'Notes', 'Broken.md')
    await writeFile(page, '---\nbad: [unclosed\n---\nprose', 'utf8')
    await stampAdopted(root)
    expect(await readFile(page, 'utf8')).toBe('---\nbad: [unclosed\n---\nprose')
  })
})
