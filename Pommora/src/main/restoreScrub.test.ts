// A bundle is frozen at its delete while the world moves on — every nexus-wide sweep is
// tree-derived and the tree excludes `.trash`. These pin what a returning artifact is reconciled
// against, so restore can never reintroduce a governed key nothing stands behind.

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { pathExists } from './IO/atomicWrite'
import { handleMutate, type MutateDeps } from './mutate'
import { contextsDir, contextsRegistryFile } from './paths'
import { listBundles } from './provenance'
import { splitFrontmatter } from './readNexus'
import { closeSession, openSession } from './session'

const PAGE_A = '01KVGMT8BFG350FZZXAMG1QDVA'
const PROP = 'prop_01KVGMT8BFG350FZZXAMG1QDVZ'
const nexusDeps: MutateDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

let root: string

const fm = async (rel: string): Promise<Record<string, unknown>> =>
  splitFrontmatter(await readFile(join(root, rel), 'utf8'))

const registry = (assigned: string[]): string =>
  JSON.stringify({ id: 'col-notes', properties: assigned })

/** Delete `rel`, run `mutateWorld`, then restore — the shape every case here shares. */
async function cycle(rel: string, kind: 'page' | 'set', mutateWorld: () => Promise<void>) {
  const d = await handleMutate({ op: 'delete', path: rel, kind }, nexusDeps)
  expect(d.ok).toBe(true)
  await mutateWorld()
  const [listed] = await listBundles(root)
  const r = await handleMutate({ op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
  expect(r.ok).toBe(true)
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-scrub-'))
  await mkdir(join(root, '.nexus'), { recursive: true })
  await writeFile(
    join(root, '.nexus', 'nexus.json'),
    JSON.stringify({ id: 'nx', createdAt: '2026' }),
  )
  await writeFile(
    contextsRegistryFile(root),
    JSON.stringify({ contexts: [{ id: 'ctx_projects', title: 'Projects' }] }),
  )
  await mkdir(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
  await writeFile(
    join(contextsDir(root), 'Projects', 'Pommora', '_space.json'),
    JSON.stringify({ id: 'sp-pom' }),
  )
  await writeFile(
    join(root, '.nexus', 'properties.json'),
    JSON.stringify({
      order: [PROP],
      defs: {
        [PROP]: {
          id: PROP,
          name: 'Priority',
          type: 'select',
          select_options: [
            { value: 'hi', label: 'High', color: 'red' },
            { value: 'lo', label: 'Low', color: 'blue' },
          ],
        },
      },
    }),
  )
  await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
  await writeFile(join(root, 'Notes', '_pagecollection.json'), registry([PROP]))
  await writeFile(
    join(root, 'Notes', 'Daily', '_pageset.json'),
    JSON.stringify({ id: 'set-daily' }),
  )
  await writeFile(
    join(root, 'Notes', 'Alpha.md'),
    `---\nPageID: ${PAGE_A}\n(Projects):\n  - Pommora\n<Priority>: hi\n---\nbody`,
  )
  await openSession(root)
})

afterEach(async () => {
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('a returning artifact is reconciled against the world it comes back to', () => {
  it('keeps every governed key that still stands', async () => {
    await cycle('Notes/Alpha.md', 'page', async () => {})
    const f = await fm('Notes/Alpha.md')
    expect(f['<Priority>']).toBe('hi')
    expect(f['(Projects)']).toEqual(['Pommora'])
  })

  it('drops a value whose property was deleted while it sat in the trash', async () => {
    await cycle('Notes/Alpha.md', 'page', async () => {
      await writeFile(
        join(root, '.nexus', 'properties.json'),
        JSON.stringify({ order: [], defs: {} }),
      )
      await writeFile(join(root, 'Notes', '_pagecollection.json'), registry([]))
    })
    const f = await fm('Notes/Alpha.md')
    expect(f['<Priority>']).toBeUndefined()
    // The Context key is untouched — it still stands.
    expect(f['(Projects)']).toEqual(['Pommora'])
  })

  it('drops a value whose property is no longer assigned to the destination Collection', async () => {
    await cycle('Notes/Alpha.md', 'page', async () => {
      await writeFile(join(root, 'Notes', '_pagecollection.json'), registry([]))
    })
    expect((await fm('Notes/Alpha.md'))['<Priority>']).toBeUndefined()
  })

  it('drops a tag whose Context was erased while it sat in the trash', async () => {
    await cycle('Notes/Alpha.md', 'page', async () => {
      await writeFile(contextsRegistryFile(root), JSON.stringify({ contexts: [] }))
      await rm(join(contextsDir(root), 'Projects'), { recursive: true, force: true })
    })
    const f = await fm('Notes/Alpha.md')
    expect(f['(Projects)']).toBeUndefined()
    expect(f['<Priority>']).toBe('hi')
  })

  it('prunes only the dead Space from a tag whose Context survives', async () => {
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nPageID: ${PAGE_A}\n(Projects):\n  - Pommora\n  - Sapphire\n---\nbody`,
    )
    await mkdir(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'),
      JSON.stringify({ id: 'sp-sap' }),
    )
    await cycle('Notes/Alpha.md', 'page', async () => {
      await rm(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true, force: true })
    })
    expect((await fm('Notes/Alpha.md'))['(Projects)']).toEqual(['Pommora'])
  })

  it('keeps a near-miss Space title exactly as the file spelled it', async () => {
    // The live tree resolves `pommora` to the Space "Pommora"; so does restore. And it comes back
    // as written — standing decides what to drop, never what to rewrite.
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nPageID: ${PAGE_A}\n(Projects):\n  - pommora\n---\nbody`,
    )
    await cycle('Notes/Alpha.md', 'page', async () => {})
    expect((await fm('Notes/Alpha.md'))['(Projects)']).toEqual(['pommora'])
  })

  it('a value an outside write left as a number still names its Space', async () => {
    await mkdir(join(contextsDir(root), 'Projects', '2024'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', '2024', '_space.json'),
      JSON.stringify({ id: 'sp-2024' }),
    )
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nPageID: ${PAGE_A}\n(Projects):\n  - 2024\n---\nbody`,
    )
    await cycle('Notes/Alpha.md', 'page', async () => {})
    expect((await fm('Notes/Alpha.md'))['(Projects)']).toEqual([2024])
  })

  it('prunes the dead Space from a near-miss tag and leaves the survivor as written', async () => {
    await mkdir(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'),
      JSON.stringify({ id: 'sp-sap' }),
    )
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nPageID: ${PAGE_A}\n(Projects):\n  - pommora\n  - Sapphire\n---\nbody`,
    )
    await cycle('Notes/Alpha.md', 'page', async () => {
      await rm(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true, force: true })
    })
    expect((await fm('Notes/Alpha.md'))['(Projects)']).toEqual(['pommora'])
  })

  it('reconciles every page inside a returning folder, not just a lone file', async () => {
    await writeFile(
      join(root, 'Notes', 'Daily', 'Journal.md'),
      `---\nPageID: 01KVGMT8BFG350FZZXAMG1QDVB\n(Projects):\n  - Pommora\n<Priority>: lo\n---\nb`,
    )
    await cycle('Notes/Daily', 'set', async () => {
      await writeFile(
        join(root, '.nexus', 'properties.json'),
        JSON.stringify({ order: [], defs: {} }),
      )
      await writeFile(join(root, 'Notes', '_pagecollection.json'), registry([]))
    })
    const f = await fm('Notes/Daily/Journal.md')
    expect(f['<Priority>']).toBeUndefined()
    expect(f['(Projects)']).toEqual(['Pommora'])
  })

  it('drops a value whose OPTION was deleted while it sat in the trash', async () => {
    // The definition still stands; the value it held no longer can. Both restore routes ask the
    // same standing check, so this cannot survive here and be dropped by a property restore.
    await cycle('Notes/Alpha.md', 'page', async () => {
      await writeFile(
        join(root, '.nexus', 'properties.json'),
        JSON.stringify({
          order: [PROP],
          defs: {
            [PROP]: {
              id: PROP,
              name: 'Priority',
              type: 'select',
              select_options: [{ value: 'lo', label: 'Low', color: 'blue' }],
            },
          },
        }),
      )
    })
    expect((await fm('Notes/Alpha.md'))['<Priority>']).toBeUndefined()
  })

  it('keeps a multi-value tag’s survivors when only some options died', async () => {
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: [PROP],
        defs: {
          [PROP]: {
            id: PROP,
            name: 'Tags',
            type: 'multi_select',
            select_options: [
              { value: 'a', label: 'A', color: 'red' },
              { value: 'b', label: 'B', color: 'blue' },
            ],
          },
        },
      }),
    )
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nPageID: ${PAGE_A}\n<Tags>:\n  - a\n  - b\n---\nbody`,
    )
    await cycle('Notes/Alpha.md', 'page', async () => {
      await writeFile(
        join(root, '.nexus', 'properties.json'),
        JSON.stringify({
          order: [PROP],
          defs: {
            [PROP]: {
              id: PROP,
              name: 'Tags',
              type: 'multi_select',
              select_options: [{ value: 'a', label: 'A', color: 'red' }],
            },
          },
        }),
      )
    })
    expect((await fm('Notes/Alpha.md'))['<Tags>']).toEqual(['a'])
  })

  it('leaves foreign frontmatter and the body untouched while it strips', async () => {
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nPageID: ${PAGE_A}\nauthor: Username\n<Priority>: hi\n---\nthe body\n`,
    )
    await cycle('Notes/Alpha.md', 'page', async () => {
      await writeFile(join(root, 'Notes', '_pagecollection.json'), registry([]))
    })
    const raw = await readFile(join(root, 'Notes', 'Alpha.md'), 'utf8')
    expect(raw).toContain('author: Username')
    expect(raw).toContain('the body')
    expect(raw).not.toContain('<Priority>')
  })
})

describe('a Space sidecar is a context root too', () => {
  /** Sapphire rides inside Projects and tags a Space in Areas — a passenger link across Contexts. */
  async function seedPassenger(): Promise<void> {
    await writeFile(
      contextsRegistryFile(root),
      JSON.stringify({
        contexts: [
          { id: 'ctx_projects', title: 'Projects' },
          { id: 'ctx_areas', title: 'Areas' },
        ],
      }),
    )
    await mkdir(join(contextsDir(root), 'Areas', 'Work'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Areas', 'Work', '_space.json'),
      JSON.stringify({ id: 'sp-work' }),
    )
    await mkdir(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'),
      JSON.stringify({ id: 'sp-sap', '(Areas)': ['Work'], '<Status>': 'Done', color: 'blue' }),
    )
  }

  const sidecar = async (rel: string): Promise<Record<string, unknown>> =>
    JSON.parse(await readFile(join(contextsDir(root), rel, '_space.json'), 'utf8'))

  it('drops a passenger tag whose Context died while the subtree sat in the trash', async () => {
    await seedPassenger()
    expect(
      (
        await handleMutate(
          { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
          nexusDeps,
        )
      ).ok,
    ).toBe(true)
    expect(
      (
        await handleMutate(
          { op: 'delete', path: '.nexus/contexts/Areas', kind: 'context' },
          nexusDeps,
        )
      ).ok,
    ).toBe(true)
    const projects = (await listBundles(root)).find(
      (b) => b.record.entity === 'context' && b.bundlePath.includes('Projects'),
    )
    expect(projects).toBeDefined()
    const r = await handleMutate(
      { op: 'restore', bundlePath: projects?.bundlePath ?? '' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)

    const sap = await sidecar('Projects/Sapphire')
    expect(sap['(Areas)']).toBeUndefined()
    // Its identity and its foreign keys ride through — only what nothing stands behind goes.
    expect(sap.id).toBe('sp-sap')
    expect(sap.color).toBe('blue')
    expect(sap['<Status>']).toBe('Done')
  })

  it('a returning Context’s own key is left for the rekey, never judged mid-transit', async () => {
    await seedPassenger()
    // Sapphire also tags a Space in its OWN Context — the passenger the delete deliberately keeps.
    await writeFile(
      join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'),
      JSON.stringify({ id: 'sp-sap', '(Projects)': ['Pommora'] }),
    )
    await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    const [listed] = await listBundles(root)
    expect(
      (await handleMutate({ op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)).ok,
    ).toBe(true)
    expect((await sidecar('Projects/Sapphire'))['(Projects)']).toEqual(['Pommora'])
  })
})

describe('a parent the filesystem handed Pommora can still be named by id', () => {
  it('a page deleted from a Finder-made folder records a real parent and restores', async () => {
    // No sidecar: exactly what appears when a folder is created outside the app.
    await mkdir(join(root, 'Notes', 'Inbox'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'Inbox', 'Idea.md'),
      `---\nPageID: 01KVGMT8BFG350FZZXAMG1QDVC\n---\nbody`,
    )
    const d = await handleMutate(
      { op: 'delete', path: 'Notes/Inbox/Idea.md', kind: 'page' },
      nexusDeps,
    )
    expect(d.ok).toBe(true)

    const [listed] = await listBundles(root)
    expect(listed.record).toMatchObject({ entity: 'page', parent: { kind: 'container' } })
    const r = await handleMutate({ op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes', 'Inbox', 'Idea.md'))).toBe(true)
  })

  it('a sidecar that exists but cannot be read is never minted over', async () => {
    await mkdir(join(root, 'Notes', 'Broken'), { recursive: true })
    await writeFile(join(root, 'Notes', 'Broken', '_pageset.json'), '{corrupt')
    await writeFile(
      join(root, 'Notes', 'Broken', 'Idea.md'),
      `---\nPageID: 01KVGMT8BFG350FZZXAMG1QDVD\n---\nbody`,
    )
    await handleMutate({ op: 'delete', path: 'Notes/Broken/Idea.md', kind: 'page' }, nexusDeps)
    const [listed] = await listBundles(root)
    // Honest rather than destructive: the folder keeps the schema and views it still holds.
    expect(listed.record).toMatchObject({ parent: { kind: 'unaddressable' } })
    expect(await readFile(join(root, 'Notes', 'Broken', '_pageset.json'), 'utf8')).toBe('{corrupt')
  })
})
