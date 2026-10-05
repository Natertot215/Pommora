// A bundle is frozen at its delete while the world moves on — every nexus-wide sweep is tree-derived and the tree excludes `.trash`. These pin what a returning artifact is reconciled against, so restore can never reintroduce a governed key nothing stands behind.

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { splitFrontmatter } from '../Files/pageFile'
import { join } from '../Paths/posix'
import { tempRoot, readJsonAt } from '../Testing/hostFs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
import { pathExists } from '../Files/atomicWrite'
import { settledMutate } from '../Testing/settledMutate'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'
import { listBundles } from './holdings'
import { stampMissing } from '../Nexus/adopt'
import { readNexus } from '../Nexus/readNexus'
import { fault } from '../Contract/result'

import { closeSession, openSession } from '../Nexus/session'
import type { TrashDeps } from './bundle'

const trashWrites = vi.hoisted(() => ({ fail: false }))
vi.mock('../Files/atomicWrite', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../Files/atomicWrite')>()
  return {
    ...actual,
    rewritePreservingTimes: (file: string, data: string): Promise<void> =>
      trashWrites.fail && file.includes('/.trash/')
        ? Promise.reject(new Error('read-only'))
        : actual.rewritePreservingTimes(file, data),
  }
})

const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'
const PROP = 'prop_01KVGMT8BFP350FZZXAMG1QDVZ'
const LINK = 'prop_01KVGMT8BFP350FZZXAMG1QDVY'
const nexusDeps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

let root: string

const fm = async (rel: string): Promise<Record<string, unknown>> =>
  splitFrontmatter(await readFile(join(root, rel), 'utf8'))

const registry = (assigned: string[]): string =>
  JSON.stringify({ id: 'col-notes', properties: assigned })

async function cycle(rel: string, kind: 'page' | 'set', mutateWorld: () => Promise<void>) {
  const d = await settledMutate(root, { op: 'delete', path: rel, kind }, nexusDeps)
  expect(d.ok).toBe(true)
  await mutateWorld()
  await refreshTree(root)
  const [listed] = await listBundles(root)
  const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
  expect(r.ok).toBe(true)
}

beforeEach(async () => {
  root = tempRoot('pom-scrub-')
  await mkdir(join(root, '.nexus'), { recursive: true })
  await mkdir(contextsDir(root), { recursive: true })
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
            { value: 'hi', color: 'red' },
            { value: 'lo', color: 'blue' },
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
    `---\nID: ${PAGE_A}\n<Projects>:\n  - Pommora\nPriority: hi\n---\nbody`,
  )
  await openSession(root)
})

afterEach(async () => {
  dropLiveTree()
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('a returning artifact is reconciled against the world it comes back to', () => {
  it('keeps every governed key that still stands', async () => {
    await cycle('Notes/Alpha.md', 'page', async () => {})
    const f = await fm('Notes/Alpha.md')
    expect(f.Priority).toEqual(['hi'])
    expect(f['<Projects>']).toEqual(['Pommora'])
  })

  it('keeps a value whose property was deleted while it sat in the trash — the key is now foreign frontmatter', async () => {
    await cycle('Notes/Alpha.md', 'page', async () => {
      await writeFile(
        join(root, '.nexus', 'properties.json'),
        JSON.stringify({ order: [], defs: {} }),
      )
      await writeFile(join(root, 'Notes', '_pagecollection.json'), registry([]))
    })
    const f = await fm('Notes/Alpha.md')
    expect(f.Priority).toBe('hi')
    expect(f['<Projects>']).toEqual(['Pommora'])
  })

  it('keeps a value whose property is no longer assigned to the destination Collection', async () => {
    await cycle('Notes/Alpha.md', 'page', async () => {
      await writeFile(join(root, 'Notes', '_pagecollection.json'), registry([]))
    })
    expect((await fm('Notes/Alpha.md')).Priority).toBe('hi')
  })

  it('keeps a tag whose Context was erased while it sat in the trash — the key is foreign now', async () => {
    await cycle('Notes/Alpha.md', 'page', async () => {
      await writeFile(contextsRegistryFile(root), JSON.stringify({ contexts: [] }))
      await rm(join(contextsDir(root), 'Projects'), { recursive: true, force: true })
    })
    const f = await fm('Notes/Alpha.md')
    expect(f['<Projects>']).toEqual(['Pommora'])
    expect(f.Priority).toEqual(['hi'])
  })

  it('prunes only the dead Space from a tag whose Context survives', async () => {
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nID: ${PAGE_A}\n<Projects>:\n  - Pommora\n  - Sapphire\n---\nbody`,
    )
    await mkdir(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'),
      JSON.stringify({ id: 'sp-sap' }),
    )
    await cycle('Notes/Alpha.md', 'page', async () => {
      await rm(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true, force: true })
    })
    expect((await fm('Notes/Alpha.md'))['<Projects>']).toEqual(['Pommora'])
  })

  it('a returning page the scrub can’t write refuses the restore and keeps the bundle', async () => {
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nID: ${PAGE_A}\n<Projects>:\n  - Pommora\n  - Sapphire\n---\nbody`,
    )
    await mkdir(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'),
      JSON.stringify({ id: 'sp-sap' }),
    )
    const d = await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    expect(d.ok).toBe(true)
    await rm(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true, force: true })
    await refreshTree(root)
    const [listed] = await listBundles(root)
    trashWrites.fail = true
    try {
      const r = await settledMutate(
        root,
        { op: 'restore', bundlePath: listed.bundlePath },
        nexusDeps,
      ).catch(fault)
      expect(r.ok).toBe(false)
    } finally {
      trashWrites.fail = false
    }
    expect(await listBundles(root)).toHaveLength(1)
    expect(await pathExists(join(root, 'Notes', 'Alpha.md'))).toBe(false)
  })

  it('keeps a near-miss Space title’s spelling on the way back', async () => {
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nID: ${PAGE_A}\n<Projects>:\n  - pommora\n---\nbody`,
    )
    await cycle('Notes/Alpha.md', 'page', async () => {})
    expect((await fm('Notes/Alpha.md'))['<Projects>']).toEqual(['pommora'])
  })

  it('a value an outside write left as a number still names its Space', async () => {
    await mkdir(join(contextsDir(root), 'Projects', '2024'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', '2024', '_space.json'),
      JSON.stringify({ id: 'sp-2024' }),
    )
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nID: ${PAGE_A}\n<Projects>:\n  - 2024\n---\nbody`,
    )
    await cycle('Notes/Alpha.md', 'page', async () => {})
    expect((await fm('Notes/Alpha.md'))['<Projects>']).toEqual(['2024'])
  })

  const prunedTag = async (): Promise<void> => {
    await mkdir(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'),
      JSON.stringify({ id: 'sp-sap' }),
    )
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nID: ${PAGE_A}\n<Projects>:\n  - pommora\n  - Sapphire\n---\nbody`,
    )
    await cycle('Notes/Alpha.md', 'page', async () => {
      await rm(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true, force: true })
    })
  }

  it('prunes the dead Space from a near-miss tag and keeps the survivor’s spelling', async () => {
    await prunedTag()
    expect((await fm('Notes/Alpha.md'))['<Projects>']).toEqual(['pommora'])
  })

  it('reconciles every page inside a returning folder, not just a lone file', async () => {
    await writeFile(
      join(root, 'Notes', 'Daily', 'Journal.md'),
      `---\nID: 01KVGMT8BFP350FZZXAMG1QDVB\n<Projects>:\n  - Pommora\nPriority: lo\n---\nb`,
    )
    await cycle('Notes/Daily', 'set', async () => {
      await rm(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true, force: true })
    })
    const f = await fm('Notes/Daily/Journal.md')
    expect(f['<Projects>']).toBeUndefined()
    expect(f.Priority).toEqual(['lo'])
  })

  it('drops a Select value whose option was deleted while it sat in the Trash', async () => {
    // The definition still stands; the value it held no longer can. Both restore routes ask the same standing check, so this cannot survive here and be dropped by a property restore.
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
              select_options: [{ value: 'lo', color: 'blue' }],
            },
          },
        }),
      )
    })
    expect((await fm('Notes/Alpha.md')).Priority).toBeUndefined()
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
              { value: 'a', color: 'red' },
              { value: 'b', color: 'blue' },
            ],
          },
        },
      }),
    )
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nID: ${PAGE_A}\nTags:\n  - a\n  - b\n---\nbody`,
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
              select_options: [{ value: 'a', color: 'red' }],
            },
          },
        }),
      )
    })
    expect((await fm('Notes/Alpha.md')).Tags).toEqual(['a'])
    const def = (
      await readJsonAt<{ defs: Record<string, { select_options: { value: string }[] }> }>(
        join(root, '.nexus', 'properties.json'),
      )
    ).defs[PROP]
    expect(def.select_options.map((o) => o.value)).toEqual(['a'])
  })

  it('drops a Link naming a page gone, held under a key spelled in another case', async () => {
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: [LINK],
        defs: { [LINK]: { id: LINK, name: 'Related', type: 'link' } },
      }),
    )
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nID: ${PAGE_A}\nrelated: "[[Nowhere]]"\n---\nbody`,
    )
    await cycle('Notes/Alpha.md', 'page', async () => {})
    expect(await fm('Notes/Alpha.md')).not.toHaveProperty('related')
  })

  it('leaves foreign frontmatter and the body untouched while it strips', async () => {
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nID: ${PAGE_A}\nauthor: Username\n<Projects>:\n  - Pommora\nPriority: hi\n---\nthe body\n`,
    )
    await cycle('Notes/Alpha.md', 'page', async () => {
      await rm(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true, force: true })
    })
    const raw = await readFile(join(root, 'Notes', 'Alpha.md'), 'utf8')
    expect(raw).toContain('author: Username')
    expect(raw).toContain('Priority:\n  - hi')
    expect(raw).toContain('the body')
    expect(raw).not.toContain('Projects')
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
      JSON.stringify({ id: 'sp-sap', '<Areas>': ['Work'], Status: 'Done', color: 'blue' }),
    )
  }

  const sidecar = async (rel: string): Promise<Record<string, unknown>> =>
    await readJsonAt(join(contextsDir(root), rel, '_space.json'))

  it('drops a passenger tag whose Space died while the subtree sat in the trash', async () => {
    await seedPassenger()
    expect(
      (
        await settledMutate(
          root,
          { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
          nexusDeps,
        )
      ).ok,
    ).toBe(true)
    expect(
      (
        await settledMutate(
          root,
          { op: 'delete', path: '.nexus/contexts/Areas/Work', kind: 'space' },
          nexusDeps,
        )
      ).ok,
    ).toBe(true)
    const projects = (await listBundles(root)).find(
      (b) => b.record.entity === 'context' && b.bundlePath.includes('Projects'),
    )
    expect(projects).toBeDefined()
    const r = await settledMutate(
      root,
      { op: 'restore', bundlePath: projects?.bundlePath ?? '' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)

    const sap = await sidecar('Projects/Sapphire')
    expect(sap['<Areas>']).toBeUndefined()
    // Its identity and its foreign keys ride through — only what nothing stands behind goes.
    expect(sap.id).toBe('sp-sap')
    expect(sap.color).toBe('blue')
    expect(sap.Status).toBe('Done')
  })

  it('a returning Context’s own key is left for the rekey while a live Context holds its title', async () => {
    await seedPassenger()
    await writeFile(
      join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'),
      JSON.stringify({ id: 'sp-sap', '<Projects>': ['Pommora'] }),
    )
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    await writeFile(
      contextsRegistryFile(root),
      JSON.stringify({ contexts: [{ id: 'ctx_live', title: 'Projects' }] }),
    )
    await mkdir(join(contextsDir(root), 'Projects'), { recursive: true })
    await refreshTree(root)
    const [listed] = await listBundles(root)
    expect(
      (await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)).ok,
    ).toBe(true)
    expect((await sidecar('Projects (2)/Sapphire'))['<Projects (2)>']).toEqual(['Pommora'])
  })
})

describe('a parent the filesystem handed Pommora can still be named by id', () => {
  it('a page deleted from a Finder-made folder records a real parent and restores', async () => {
    // No sidecar: exactly what appears when a folder is created outside the app, until the open stamps it.
    await mkdir(join(root, 'Notes', 'Inbox'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'Inbox', 'Idea.md'),
      `---\nID: 01KVGMT8BFP350FZZXAMG1QDVC\n---\nbody`,
    )
    await stampMissing(root, (await readNexus(root)).unreadable)
    await refreshTree(root)
    const d = await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Inbox/Idea.md', kind: 'page' },
      nexusDeps,
    )
    expect(d.ok).toBe(true)

    const [listed] = await listBundles(root)
    expect(listed.record).toMatchObject({ entity: 'page', parent: { kind: 'container' } })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes', 'Inbox', 'Idea.md'))).toBe(true)
  })

  it('a page beneath a sidecar that cannot be read refuses the delete and leaves every byte', async () => {
    await mkdir(join(root, 'Notes', 'Broken'), { recursive: true })
    await writeFile(join(root, 'Notes', 'Broken', '_pageset.json'), '{corrupt')
    const page = `---\nID: 01KVGMT8BFP350FZZXAMG1QDVD\n---\nbody`
    await writeFile(join(root, 'Notes', 'Broken', 'Idea.md'), page)
    await refreshTree(root)
    const d = await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Broken/Idea.md', kind: 'page' },
      nexusDeps,
    )
    expect(d.ok).toBe(false)
    expect(await listBundles(root)).toEqual([])
    expect(await readFile(join(root, 'Notes', 'Broken', 'Idea.md'), 'utf8')).toBe(page)
    expect(await readFile(join(root, 'Notes', 'Broken', '_pageset.json'), 'utf8')).toBe('{corrupt')
  })
})
