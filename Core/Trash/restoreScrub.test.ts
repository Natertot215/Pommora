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
import { listBundles } from '../Bundles/bundle'
import { stampMissing } from '../Nexus/adopt'
import { readNexus } from '../Nexus/readNexus'
import { fault } from '../Contract/result'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { seedContentIndex } from '../Index/indexSeed'
import { closeSession, openSession } from '../Nexus/session'
import type { TrashDeps } from './discard'

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
  const [listed] = await listBundles(root, { kind: 'trash' })
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
          label: 'Priority',
          key: 'Priority',
          type: 'select',
          select_options: [
            { key: 'hi', label: 'hi', color: 'red' },
            { key: 'lo', label: 'lo', color: 'blue' },
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
    const [listed] = await listBundles(root, { kind: 'trash' })
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
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(1)
    expect(await pathExists(join(root, 'Notes', 'Alpha.md'))).toBe(false)
  })

  it('rewrites a Space title in another casing into the current title', async () => {
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nID: ${PAGE_A}\n<Projects>:\n  - pommora\n---\nbody`,
    )
    await cycle('Notes/Alpha.md', 'page', async () => {})
    expect((await fm('Notes/Alpha.md'))['<Projects>']).toEqual(['Pommora'])
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
    expect((await fm('Notes/Alpha.md'))['<Projects>']).toEqual([2024])
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

  it('prunes the dead Space from a tag and rewrites the survivor', async () => {
    await prunedTag()
    expect((await fm('Notes/Alpha.md'))['<Projects>']).toEqual(['Pommora'])
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
              label: 'Priority',
              key: 'Priority',
              type: 'select',
              select_options: [{ key: 'lo', label: 'lo', color: 'blue' }],
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
            label: 'Tags',
            key: 'Tags',
            type: 'multi_select',
            select_options: [
              { key: 'a', label: 'a', color: 'red' },
              { key: 'b', label: 'b', color: 'blue' },
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
              label: 'Tags',
              key: 'Tags',
              type: 'multi_select',
              select_options: [{ key: 'a', label: 'a', color: 'red' }],
            },
          },
        }),
      )
    })
    expect((await fm('Notes/Alpha.md')).Tags).toEqual(['a'])
    const def = (
      await readJsonAt<{ defs: Record<string, { select_options: { label: string }[] }> }>(
        join(root, '.nexus', 'properties.json'),
      )
    ).defs[PROP]
    expect(def.select_options.map((o) => o.label)).toEqual(['a'])
  })

  it('drops a gone Link held under its key in another casing and parks it', async () => {
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: [LINK],
        defs: { [LINK]: { id: LINK, label: 'Related', key: 'Related', type: 'link' } },
      }),
    )
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nID: ${PAGE_A}\nrelated: "[[Nowhere]]"\n---\nbody`,
    )
    await writeFile(
      join(root, 'Notes', 'Nowhere.md'),
      `---\nID: 01KVGMT8BFP350FZZXAMG1QDVE\n---\nbody`,
    )
    await refreshTree(root)
    for (const path of ['Notes/Alpha.md', 'Notes/Nowhere.md'])
      expect((await settledMutate(root, { op: 'delete', path, kind: 'page' }, nexusDeps)).ok).toBe(
        true,
      )
    const bundles = await listBundles(root, { kind: 'trash' })
    const bundleOf = (name: string): string =>
      bundles.find((b) => b.artifactName === name)?.bundlePath ?? ''
    expect(
      (await settledMutate(root, { op: 'restore', bundlePath: bundleOf('Alpha.md') }, nexusDeps))
        .ok,
    ).toBe(true)
    const f = await fm('Notes/Alpha.md')
    expect(f).not.toHaveProperty('related')
    expect(f).not.toHaveProperty('Related')
    const record = await readJsonAt<{ links?: unknown[] }>(
      join(root, bundleOf('Nowhere.md'), '_record.json'),
    )
    expect(record.links).toEqual([{ page: PAGE_A, property: LINK, value: '[[Nowhere]]' }])
  })

  it('keeps a Link naming a page renamed meanwhile, which follows it once landed', async () => {
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: [LINK],
        defs: { [LINK]: { id: LINK, label: 'Related', key: 'Related', type: 'link' } },
      }),
    )
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nID: ${PAGE_A}\nRelated: "[[Beta]]"\n---\nbody`,
    )
    await writeFile(
      join(root, 'Notes', 'Beta.md'),
      `---\nID: 01KVGMT8BFP350FZZXAMG1QDVE\n---\nbody`,
    )
    installStores(memoryStores().stores)
    try {
      await refreshTree(root)
      await seedContentIndex(root)
      await cycle('Notes/Alpha.md', 'page', async () => {
        const r = await settledMutate(
          root,
          { op: 'rename', path: 'Notes/Beta.md', kind: 'page', newName: 'Gamma' },
          nexusDeps,
        )
        expect(r.ok).toBe(true)
      })
      expect((await fm('Notes/Alpha.md')).Related).toBe('[[Gamma]]')
    } finally {
      installStores(NO_STORES)
    }
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

describe('a returning page takes the current keys', () => {
  const priority = (fields: Record<string, unknown>): Promise<void> =>
    writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: [PROP],
        defs: {
          [PROP]: {
            id: PROP,
            label: 'Priority',
            key: 'Priority',
            type: 'select',
            select_options: [
              { key: 'hi', label: 'hi', color: 'red' },
              { key: 'lo', label: 'lo', color: 'blue' },
            ],
            ...fields,
          },
        },
      }),
    )
  const page = (frontmatter: string): Promise<void> =>
    writeFile(join(root, 'Notes', 'Alpha.md'), `---\nID: ${PAGE_A}\n${frontmatter}\n---\nbody`)

  it('moves a key in another casing onto the current key', async () => {
    await page('priority: hi')
    await cycle('Notes/Alpha.md', 'page', async () => {})
    const f = await fm('Notes/Alpha.md')
    expect(f.Priority).toEqual(['hi'])
    expect(f).not.toHaveProperty('priority')
  })

  it('moves a key onto the one a Key Format change wrote while it sat in the Trash', async () => {
    await cycle('Notes/Alpha.md', 'page', async () => {
      await priority({ key: 'priority', key_format: 'lowercase' })
    })
    const f = await fm('Notes/Alpha.md')
    expect(f.priority).toEqual(['hi'])
    expect(f).not.toHaveProperty('Priority')
  })

  it('moves an option word onto the key a Value Format change wrote while it sat in the Trash', async () => {
    await cycle('Notes/Alpha.md', 'page', async () => {
      await priority({
        value_format: 'UPPERCASE',
        select_options: [
          { key: 'HI', label: 'hi', color: 'red' },
          { key: 'LO', label: 'lo', color: 'blue' },
        ],
      })
    })
    expect((await fm('Notes/Alpha.md')).Priority).toEqual(['HI'])
  })

  it('moves a key whose value stands as written, changing nothing else', async () => {
    await priority({ type: 'text', select_options: undefined })
    await page('priority: x')
    await cycle('Notes/Alpha.md', 'page', async () => {})
    expect(await readFile(join(root, 'Notes', 'Alpha.md'), 'utf8')).toBe(
      `---\nID: ${PAGE_A}\nPriority: x\n---\nbody`,
    )
  })

  it('a blank value takes no option whose label is only separators', async () => {
    await priority({
      select_options: [
        { key: 'hi', label: 'hi', color: 'red' },
        { key: '-', label: '-' },
      ],
    })
    await page('Priority: ""')
    await cycle('Notes/Alpha.md', 'page', async () => {})
    expect(await fm('Notes/Alpha.md')).not.toHaveProperty('Priority')
  })

  it('keeps the exact key’s value and leaves a variant beside it foreign', async () => {
    await page('Priority: hi\npriority: lo')
    await cycle('Notes/Alpha.md', 'page', async () => {})
    const f = await fm('Notes/Alpha.md')
    expect(f.Priority).toEqual(['hi'])
    expect(f.priority).toBe('lo')
  })

  it('leaves a spelling two current keys share as written', async () => {
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_due_date', 'prop_due_dash'],
        defs: {
          prop_due_date: { id: 'prop_due_date', label: 'Due Date', key: 'Due Date', type: 'text' },
          prop_due_dash: { id: 'prop_due_dash', label: 'Due-Date', key: 'Due-Date', type: 'text' },
        },
      }),
    )
    await page('due-date: x')
    await cycle('Notes/Alpha.md', 'page', async () => {})
    const f = await fm('Notes/Alpha.md')
    expect(f['due-date']).toBe('x')
    expect(f).not.toHaveProperty('Due Date')
    expect(f).not.toHaveProperty('Due-Date')
  })

  it('leaves a key whose property was renamed while it sat in the Trash as written', async () => {
    await cycle('Notes/Alpha.md', 'page', async () => {
      await priority({ label: 'Urgency', key: 'Urgency' })
    })
    const f = await fm('Notes/Alpha.md')
    expect(f.Priority).toBe('hi')
    expect(f).not.toHaveProperty('Urgency')
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
    const projects = (await listBundles(root, { kind: 'trash' })).find(
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
    await mkdir(join(contextsDir(root), 'Projects', 'pommora'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'pommora', '_space.json'),
      JSON.stringify({ id: 'sp-live-pom' }),
    )
    await refreshTree(root)
    const [listed] = await listBundles(root, { kind: 'trash' })
    expect(
      (await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)).ok,
    ).toBe(true)
    expect((await sidecar('Projects (2)/Sapphire'))['<Projects (2)>']).toEqual(['Pommora'])
  })

  it('a returning Context’s own key in another casing is left for the rekey beside a live Context holding its title', async () => {
    await rm(join(contextsDir(root), 'Projects'), { recursive: true, force: true })
    await writeFile(
      contextsRegistryFile(root),
      JSON.stringify({ contexts: [{ id: 'ctx_projects', title: 'projects' }] }),
    )
    await mkdir(join(contextsDir(root), 'projects', 'Sapphire'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'projects', 'Sapphire', '_space.json'),
      JSON.stringify({ id: 'sp-sap', '<projects>': ['Pommora'] }),
    )
    await refreshTree(root)
    expect(
      (
        await settledMutate(
          root,
          { op: 'delete', path: '.nexus/contexts/projects', kind: 'context' },
          nexusDeps,
        )
      ).ok,
    ).toBe(true)
    await writeFile(
      contextsRegistryFile(root),
      JSON.stringify({ contexts: [{ id: 'ctx_live', title: 'Projects' }] }),
    )
    await mkdir(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Pommora', '_space.json'),
      JSON.stringify({ id: 'sp-pom' }),
    )
    await refreshTree(root)
    const [listed] = await listBundles(root, { kind: 'trash' })
    expect(
      (await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)).ok,
    ).toBe(true)
    const sap = await sidecar('projects (2)/Sapphire')
    expect(sap['<projects (2)>']).toEqual(['Pommora'])
    expect(sap).not.toHaveProperty('<Projects>')
  })

  it('a variant of a returning Context’s own key stays as written beside a live Context holding its title', async () => {
    await rm(join(contextsDir(root), 'Projects'), { recursive: true, force: true })
    await writeFile(
      contextsRegistryFile(root),
      JSON.stringify({ contexts: [{ id: 'ctx_projects', title: 'projects' }] }),
    )
    await mkdir(join(contextsDir(root), 'projects', 'Sapphire'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'projects', 'Sapphire', '_space.json'),
      JSON.stringify({ id: 'sp-sap', '<PROJECTS>': ['pommora'] }),
    )
    await refreshTree(root)
    expect(
      (
        await settledMutate(
          root,
          { op: 'delete', path: '.nexus/contexts/projects', kind: 'context' },
          nexusDeps,
        )
      ).ok,
    ).toBe(true)
    await writeFile(
      contextsRegistryFile(root),
      JSON.stringify({ contexts: [{ id: 'ctx_live', title: 'Projects' }] }),
    )
    await mkdir(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Pommora', '_space.json'),
      JSON.stringify({ id: 'sp-pom' }),
    )
    await refreshTree(root)
    const [listed] = await listBundles(root, { kind: 'trash' })
    expect(
      (await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)).ok,
    ).toBe(true)
    const sap = await sidecar('projects (2)/Sapphire')
    expect(sap['<PROJECTS>']).toEqual(['pommora'])
    expect(sap).not.toHaveProperty('<Projects>')
  })

  it('a variant of a returning Context’s own key moves onto it when no live Context shares its title', async () => {
    await rm(join(contextsDir(root), 'Projects'), { recursive: true, force: true })
    await writeFile(
      contextsRegistryFile(root),
      JSON.stringify({ contexts: [{ id: 'ctx_projects', title: 'projects' }] }),
    )
    await mkdir(join(contextsDir(root), 'projects', 'Sapphire'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'projects', 'Sapphire', '_space.json'),
      JSON.stringify({ id: 'sp-sap', '<PROJECTS>': ['pommora'] }),
    )
    await refreshTree(root)
    expect(
      (
        await settledMutate(
          root,
          { op: 'delete', path: '.nexus/contexts/projects', kind: 'context' },
          nexusDeps,
        )
      ).ok,
    ).toBe(true)
    await refreshTree(root)
    const [listed] = await listBundles(root, { kind: 'trash' })
    expect(
      (await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)).ok,
    ).toBe(true)
    const sap = await sidecar('projects/Sapphire')
    expect(sap['<projects>']).toEqual(['pommora'])
    expect(sap).not.toHaveProperty('<PROJECTS>')
  })

  const spaceCycle = async (): Promise<void> => {
    expect(
      (
        await settledMutate(
          root,
          { op: 'delete', path: '.nexus/contexts/Projects/Sapphire', kind: 'space' },
          nexusDeps,
        )
      ).ok,
    ).toBe(true)
    const [listed] = await listBundles(root, { kind: 'trash' })
    expect(
      (await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)).ok,
    ).toBe(true)
  }

  it('a returning Space takes the current Context keys, Space titles, and property keys', async () => {
    await seedPassenger()
    await writeFile(
      join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'),
      JSON.stringify({ id: 'sp-sap', '<areas>': ['work'], priority: ['hi'] }),
    )
    await spaceCycle()
    expect(await sidecar('Projects/Sapphire')).toEqual({
      id: 'sp-sap',
      '<Areas>': ['Work'],
      Priority: ['hi'],
    })
  })

  it('a returning Space keeps a key Pommora manages byte-identical though a property spells it', async () => {
    await seedPassenger()
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_hidden'],
        defs: {
          prop_hidden: {
            id: 'prop_hidden',
            label: 'Heading Icon Hidden',
            key: 'Heading Icon Hidden',
            type: 'text',
          },
        },
      }),
    )
    const held = JSON.stringify({ id: 'sp-sap', heading_icon_hidden: true })
    const file = join(contextsDir(root), 'Projects', 'Sapphire', '_space.json')
    await writeFile(file, held)
    await spaceCycle()
    expect(await readFile(file, 'utf8')).toBe(held)
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

    const [listed] = await listBundles(root, { kind: 'trash' })
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
    expect(await listBundles(root, { kind: 'trash' })).toEqual([])
    expect(await readFile(join(root, 'Notes', 'Broken', 'Idea.md'), 'utf8')).toBe(page)
    expect(await readFile(join(root, 'Notes', 'Broken', '_pageset.json'), 'utf8')).toBe('{corrupt')
  })
})
