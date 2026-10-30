// A bundle is frozen at its delete while the world moves on — every nexus-wide sweep is tree-derived and the tree excludes `.trash`. These pin what a returning artifact is reconciled against: it takes the current keys and spellings, keeps what it can't read as a live write does, and loses a Link naming a page gone.

import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { splitFrontmatter } from '../Files/pageFile'
import { isMarkdownFile, join } from '../Paths/posix'
import { readJsonAt, failLandings, seedNexus, tempRoot } from '../Testing/hostFs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
import { pathExists } from '../Files/atomicWrite'
import { settledMutate } from '../Testing/settledMutate'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'
import { listBundles } from '../Bundles/bundle'
import { stampMissing } from '../Nexus/adopt'
import { readNexus } from '../Nexus/readNexus'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { seedContentIndex } from '../Index/indexSeed'
import { closeSession, openSession } from '../Nexus/session'
import type { PropertyDefinition } from '../Properties/properties'
import { readNotes } from '../Nexus/owed'
import { finishOwed } from '../Nexus/finishOwed'
import { noModeBits } from '../Testing/hostFs'
import { STATUS_DEF } from '../Testing/definitions'

const trashPage = (file: string): boolean => file.includes('/.trash/') && isMarkdownFile(file)

const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'
const PROP = 'prop_01KVGMT8BFP350FZZXAMG1QDVZ'
const LINK = 'prop_01KVGMT8BFP350FZZXAMG1QDVY'
const PRIORITY: PropertyDefinition = {
  id: PROP,
  label: 'Priority',
  key: 'Priority',
  type: 'select',
  select_options: [
    { id: 'opt_hi', key: 'hi', label: 'hi', color: 'red' },
    { id: 'opt_lo', key: 'lo', label: 'lo', color: 'blue' },
  ],
}
const RELATED: PropertyDefinition = { id: LINK, label: 'Related', key: 'Related', type: 'link' }
const tags = (keys: string[]): PropertyDefinition => ({
  id: PROP,
  label: 'Tags',
  key: 'Tags',
  type: 'multiSelect',
  select_options: keys.map((k) => ({
    id: `opt_${k}`,
    key: k,
    label: k,
    color: k === 'a' ? 'red' : 'blue',
  })),
})

let root: string

const fm = async (rel: string): Promise<Record<string, unknown>> =>
  splitFrontmatter(await readFile(join(root, rel), 'utf8'))

async function cycle(rel: string, kind: 'page' | 'set', mutateWorld: () => Promise<void>) {
  const d = await settledMutate(root, { op: 'delete', path: rel, kind })
  expect(d.ok).toBe(true)
  await mutateWorld()
  await refreshTree(root)
  const [listed] = await listBundles(root, { kind: 'trash' })
  const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
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
  await seedNexus(root, { defs: [PRIORITY], assigned: { Notes: [PROP] } })
  await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
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
  vi.restoreAllMocks()
  dropLiveTree()
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('a returning artifact is reconciled against the world it comes back to', () => {
  it('keeps every governed key that still stands', async () => {
    await cycle('Notes/Alpha.md', 'page', async () => {})
    const f = await fm('Notes/Alpha.md')
    expect(f.Priority).toBe('hi')
    expect(f['<Projects>']).toEqual(['Pommora'])
  })

  it('keeps a value whose property was deleted while it sat in the trash — the key is now foreign frontmatter', async () => {
    await cycle('Notes/Alpha.md', 'page', async () => {
      await seedNexus(root, { defs: [], assigned: { Notes: [] } })
    })
    const f = await fm('Notes/Alpha.md')
    expect(f.Priority).toBe('hi')
    expect(f['<Projects>']).toEqual(['Pommora'])
  })

  it('keeps a value whose property is no longer assigned to the destination Collection', async () => {
    await cycle('Notes/Alpha.md', 'page', async () => {
      await seedNexus(root, { assigned: { Notes: [] } })
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
    expect(f.Priority).toBe('hi')
  })

  // Alpha names a Space in another casing, and the scrub can't write its trashed copy.
  const missedScrub = async (): Promise<Awaited<ReturnType<typeof settledMutate>>> => {
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nID: ${PAGE_A}\n<Projects>:\n  - pommora\n---\nbody`,
    )
    const d = await settledMutate(root, { op: 'delete', path: 'Notes/Alpha.md', kind: 'page' })
    expect(d.ok).toBe(true)
    await refreshTree(root)
    const [listed] = await listBundles(root, { kind: 'trash' })
    const failing = failLandings(trashPage)
    try {
      return await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    } finally {
      failing.mockRestore()
    }
  }

  it('a returning page the scrub can’t write owes what it worked out', async () => {
    const r = await missedScrub()
    expect(r.ok && r.value.cascade).toMatchObject({
      owed: true,
      warning: 'Couldn’t update 1 Item.',
    })
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(0)
    expect((await readNotes(root))['Notes/Alpha.md']).toMatchObject({
      kind: 'relink',
      values: {
        'Notes/Alpha.md': { '<Projects>': { from: ['pommora'], to: ['Pommora'] } },
      },
    })
    await finishOwed(root)
    expect((await fm('Notes/Alpha.md'))['<Projects>']).toEqual(['Pommora'])
    expect(await readNotes(root)).toEqual({})
  })

  it('an edit made after the restore keeps it through Try Again', async () => {
    const r = await missedScrub()
    expect(r.ok && r.value.cascade?.owed).toBe(true)
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nID: ${PAGE_A}\n<Projects>:\n  - Sapphire\n---\nbody`,
    )
    await finishOwed(root)
    expect((await fm('Notes/Alpha.md'))['<Projects>']).toEqual(['Sapphire'])
    expect(await readNotes(root)).toEqual({})
  })

  it('a trashed holder the restore’s refill couldn’t write is named', async () => {
    await seedNexus(root, { defs: [PRIORITY, RELATED], assigned: { Notes: [PROP, LINK] } })
    const PAGE_B = '01KVGMT8BFP350FZZXAMG1QDVB'
    await writeFile(
      join(root, 'Notes', 'Beta.md'),
      `---\nID: ${PAGE_B}\nRelated: "[[Alpha]]"\n---\nb`,
    )
    await refreshTree(root)
    for (const path of ['Notes/Alpha.md', 'Notes/Beta.md'])
      expect((await settledMutate(root, { op: 'delete', path, kind: 'page' })).ok).toBe(true)
    const bundles = await listBundles(root, { kind: 'trash' })
    const alpha = bundles.find((b) => b.artifactName === 'Alpha.md')
    const failing = failLandings(trashPage)
    try {
      const r = await settledMutate(root, { op: 'restore', bundlePath: alpha?.bundlePath ?? '' })
      expect(r.ok && r.value.unrestored).toEqual(['Beta'])
    } finally {
      failing.mockRestore()
    }
    expect(Object.values(await readNotes(root))).not.toContainEqual(
      expect.objectContaining({ kind: 'relink', values: expect.anything() }),
    )
  })

  it.skipIf(noModeBits)(
    'a restore whose returning Space sidecar can’t be read still restores, and warns',
    async () => {
      await writeFile(
        join(contextsDir(root), 'Projects', 'Pommora', '_space.json'),
        JSON.stringify({ id: 'sp-pom', '<Projects>': ['Sapphire'] }),
      )
      await refreshTree(root)
      const d = await settledMutate(root, {
        op: 'delete',
        path: '.nexus/contexts/Projects',
        kind: 'context',
      })
      if (!d.ok || !d.value.bundled) throw new Error('the delete did not trash')
      const { bundlePath } = d.value.bundled
      const copy = join(root, bundlePath, 'Projects', 'Pommora', '_space.json')
      await chmod(copy, 0o000)
      try {
        const r = await settledMutate(root, { op: 'restore', bundlePath })
        if (!r.ok) throw new Error(r.error.message)
        expect(await pathExists(join(root, bundlePath))).toBe(false)
        expect(r.value.cascade?.warning).toContain(
          'Couldn’t update values in “Projects” across 1 Item.',
        )
      } finally {
        await chmod(join(contextsDir(root), 'Projects', 'Pommora', '_space.json'), 0o644).catch(
          () => chmod(copy, 0o644),
        )
      }
    },
  )

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

  it('keeps a Space that died while it sat in the Trash, as a live write does, and rewrites the survivor', async () => {
    await prunedTag()
    expect((await fm('Notes/Alpha.md'))['<Projects>']).toEqual(['Pommora', 'Sapphire'])
  })

  it('reconciles every page inside a returning folder, not just a lone file', async () => {
    await writeFile(
      join(root, 'Notes', 'Daily', 'Journal.md'),
      `---\nID: 01KVGMT8BFP350FZZXAMG1QDVB\n<Projects>:\n  - pommora\nPriority: lo\n---\nb`,
    )
    await cycle('Notes/Daily', 'set', async () => {})
    const f = await fm('Notes/Daily/Journal.md')
    expect(f['<Projects>']).toEqual(['Pommora'])
    expect(f.Priority).toBe('lo')
  })

  it('keeps a Select word whose option was deleted while it sat in the Trash, as a word no option names', async () => {
    await cycle('Notes/Alpha.md', 'page', async () => {
      await seedNexus(root, {
        defs: [
          {
            ...PRIORITY,
            select_options: [{ id: 'opt_lo', key: 'lo', label: 'lo', color: 'blue' }],
          },
        ],
      })
    })
    expect((await fm('Notes/Alpha.md')).Priority).toBe('hi')
  })

  it('keeps a Status word no option names', async () => {
    await seedNexus(root, {
      defs: [PRIORITY, STATUS_DEF],
      assigned: { Notes: [PROP, STATUS_DEF.id] },
    })
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nID: ${PAGE_A}\nStatus: Urgent\n---\nbody`,
    )
    await cycle('Notes/Alpha.md', 'page', async () => {})
    expect((await fm('Notes/Alpha.md')).Status).toBe('Urgent')
  })

  it('keeps a Multi-Select’s words no option names, an option deleted while it sat in the Trash included, which register as any held word does', async () => {
    await seedNexus(root, { defs: [tags(['a', 'b'])] })
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nID: ${PAGE_A}\nTags:\n  - a\n  - b\n  - zeta\n---\nbody`,
    )
    await cycle('Notes/Alpha.md', 'page', async () => {
      await seedNexus(root, { defs: [tags(['a'])] })
    })
    expect((await fm('Notes/Alpha.md')).Tags).toEqual(['a', 'b', 'zeta'])
    const def = (
      await readJsonAt<{ defs: Record<string, { select_options: { label: string }[] }> }>(
        join(root, '.nexus', 'properties.json'),
      )
    ).defs[PROP]
    expect(def.select_options.map((o) => o.label)).toEqual(['a', 'b', 'zeta'])
  })

  it('drops a gone Link held under its key in another casing and parks it', async () => {
    await seedNexus(root, { defs: [RELATED] })
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
      expect((await settledMutate(root, { op: 'delete', path, kind: 'page' })).ok).toBe(true)
    const bundles = await listBundles(root, { kind: 'trash' })
    const bundleOf = (name: string): string =>
      bundles.find((b) => b.artifactName === name)?.bundlePath ?? ''
    expect(
      (await settledMutate(root, { op: 'restore', bundlePath: bundleOf('Alpha.md') })).ok,
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
    await seedNexus(root, { defs: [RELATED] })
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
        const r = await settledMutate(root, {
          op: 'rename',
          path: 'Notes/Beta.md',
          kind: 'page',
          newName: 'Gamma',
        })
        expect(r.ok).toBe(true)
      })
      expect((await fm('Notes/Alpha.md')).Related).toBe('[[Gamma]]')
    } finally {
      installStores(NO_STORES)
    }
  })

  it('leaves foreign frontmatter and the body untouched while it rewrites', async () => {
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nID: ${PAGE_A}\nauthor: Username\n<Projects>:\n  - pommora\nPriority: hi\n---\nthe body\n`,
    )
    await cycle('Notes/Alpha.md', 'page', async () => {})
    const raw = await readFile(join(root, 'Notes', 'Alpha.md'), 'utf8')
    expect(raw).toContain('author: Username')
    expect(raw).toContain('<Projects>:\n  - Pommora')
    expect(raw).toContain('Priority: hi\n')
    expect(raw).toContain('the body')
  })
})

describe('a returning page takes the current keys', () => {
  const priority = (fields: Partial<PropertyDefinition>): Promise<void> =>
    seedNexus(root, { defs: [{ ...PRIORITY, ...fields }] })
  const page = (frontmatter: string): Promise<void> =>
    writeFile(join(root, 'Notes', 'Alpha.md'), `---\nID: ${PAGE_A}\n${frontmatter}\n---\nbody`)

  it('moves a key in another casing onto the current key', async () => {
    await page('priority: hi')
    await cycle('Notes/Alpha.md', 'page', async () => {})
    const f = await fm('Notes/Alpha.md')
    expect(f.Priority).toBe('hi')
    expect(f).not.toHaveProperty('priority')
  })

  it('moves a key onto the one a Key Format change wrote while it sat in the Trash', async () => {
    await cycle('Notes/Alpha.md', 'page', async () => {
      await priority({ key: 'priority', key_format: 'lowercase' })
    })
    const f = await fm('Notes/Alpha.md')
    expect(f.priority).toBe('hi')
    expect(f).not.toHaveProperty('Priority')
  })

  it('moves an option word onto the key a Value Format change wrote while it sat in the Trash', async () => {
    await cycle('Notes/Alpha.md', 'page', async () => {
      await priority({
        value_format: 'UPPERCASE',
        select_options: [
          { id: 'opt_HI', key: 'HI', label: 'hi', color: 'red' },
          { id: 'opt_LO', key: 'LO', label: 'lo', color: 'blue' },
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
        { id: 'opt_hi', key: 'hi', label: 'hi', color: 'red' },
        { id: 'opt_-', key: '-', label: '-' },
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
    expect(f.Priority).toBe('hi')
    expect(f.priority).toBe('lo')
  })

  it('leaves a spelling two current keys share as written', async () => {
    await seedNexus(root, {
      defs: [
        { id: 'prop_due_date', label: 'Due Date', key: 'Due Date', type: 'text' },
        { id: 'prop_due_dash', label: 'Due-Date', key: 'Due-Date', type: 'text' },
      ],
    })
    await page('due-date: x')
    await cycle('Notes/Alpha.md', 'page', async () => {})
    const f = await fm('Notes/Alpha.md')
    expect(f['due-date']).toBe('x')
    expect(f).not.toHaveProperty('Due Date')
    expect(f).not.toHaveProperty('Due-Date')
  })

  it('a page that sat in the Trash through a property, option, Space, and Context rename returns holding the new names', async () => {
    await cycle('Notes/Alpha.md', 'page', async () => {
      for (const req of [
        { op: 'renameProperty', propertyId: PROP, label: 'Urgency' },
        { op: 'renameOption', propertyId: PROP, optionId: 'opt_hi', label: 'high' },
        { op: 'renameSpace', spaceId: 'sp-pom', newName: 'Pommora 2' },
        { op: 'renameContext', contextId: 'ctx_projects', newName: 'Ventures' },
      ] as const)
        expect((await settledMutate(root, req)).ok).toBe(true)
      const [listed] = await listBundles(root, { kind: 'trash' })
      const trashed = await fm(join(listed.bundlePath, 'Alpha.md'))
      expect(trashed.Urgency).toEqual(['high'])
      expect(trashed['<Ventures>']).toEqual(['Pommora 2'])
      expect(trashed).not.toHaveProperty('Priority')
      expect(trashed).not.toHaveProperty('<Projects>')
    })
    const f = await fm('Notes/Alpha.md')
    expect(f.Urgency).toEqual(['high'])
    expect(f['<Ventures>']).toEqual(['Pommora 2'])
    expect(f).not.toHaveProperty('Priority')
    expect(f).not.toHaveProperty('<Projects>')
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

  it('a trashed Space loses a tag of a Space deleted meanwhile and takes it back with that Space’s restore', async () => {
    await seedPassenger()
    expect(
      (
        await settledMutate(root, {
          op: 'delete',
          path: '.nexus/contexts/Projects',
          kind: 'context',
        })
      ).ok,
    ).toBe(true)
    expect(
      (
        await settledMutate(root, {
          op: 'delete',
          path: '.nexus/contexts/Areas/Work',
          kind: 'space',
        })
      ).ok,
    ).toBe(true)
    const trashed = await listBundles(root, { kind: 'trash' })
    const projects = trashed.find(
      (b) => b.record.entity === 'context' && b.bundlePath.includes('Projects'),
    )
    const work = trashed.find((b) => b.record.entity === 'space' && b.bundlePath.includes('Work'))
    expect(projects).toBeDefined()
    expect(work).toBeDefined()
    const r = await settledMutate(root, { op: 'restore', bundlePath: projects?.bundlePath ?? '' })
    expect(r.ok).toBe(true)
    expect((await sidecar('Projects/Sapphire'))['<Areas>']).toBeUndefined()
    expect(
      (await settledMutate(root, { op: 'restore', bundlePath: work?.bundlePath ?? '' })).ok,
    ).toBe(true)

    const sap = await sidecar('Projects/Sapphire')
    expect(sap['<Areas>']).toEqual(['Work'])
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
    await settledMutate(root, { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' })
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
    expect((await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })).ok).toBe(
      true,
    )
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
        await settledMutate(root, {
          op: 'delete',
          path: '.nexus/contexts/projects',
          kind: 'context',
        })
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
    expect((await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })).ok).toBe(
      true,
    )
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
        await settledMutate(root, {
          op: 'delete',
          path: '.nexus/contexts/projects',
          kind: 'context',
        })
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
    expect((await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })).ok).toBe(
      true,
    )
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
        await settledMutate(root, {
          op: 'delete',
          path: '.nexus/contexts/projects',
          kind: 'context',
        })
      ).ok,
    ).toBe(true)
    await refreshTree(root)
    const [listed] = await listBundles(root, { kind: 'trash' })
    expect((await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })).ok).toBe(
      true,
    )
    const sap = await sidecar('projects/Sapphire')
    expect(sap['<projects>']).toEqual(['pommora'])
    expect(sap).not.toHaveProperty('<PROJECTS>')
  })

  const spaceCycle = async (): Promise<void> => {
    expect(
      (
        await settledMutate(root, {
          op: 'delete',
          path: '.nexus/contexts/Projects/Sapphire',
          kind: 'space',
        })
      ).ok,
    ).toBe(true)
    const [listed] = await listBundles(root, { kind: 'trash' })
    expect((await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })).ok).toBe(
      true,
    )
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
    await seedNexus(root, {
      defs: [
        {
          id: 'prop_hidden',
          label: 'Heading Icon Hidden',
          key: 'Heading Icon Hidden',
          type: 'text',
        },
      ],
    })
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
    const d = await settledMutate(root, { op: 'delete', path: 'Notes/Inbox/Idea.md', kind: 'page' })
    expect(d.ok).toBe(true)

    const [listed] = await listBundles(root, { kind: 'trash' })
    expect(listed.record).toMatchObject({ entity: 'page', parent: { kind: 'container' } })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes', 'Inbox', 'Idea.md'))).toBe(true)
  })

  it('a page beneath a sidecar that cannot be read refuses the delete and leaves every byte', async () => {
    await mkdir(join(root, 'Notes', 'Broken'), { recursive: true })
    await writeFile(join(root, 'Notes', 'Broken', '_pageset.json'), '{corrupt')
    const page = `---\nID: 01KVGMT8BFP350FZZXAMG1QDVD\n---\nbody`
    await writeFile(join(root, 'Notes', 'Broken', 'Idea.md'), page)
    await refreshTree(root)
    const d = await settledMutate(root, {
      op: 'delete',
      path: 'Notes/Broken/Idea.md',
      kind: 'page',
    })
    expect(d.ok).toBe(false)
    expect(await listBundles(root, { kind: 'trash' })).toEqual([])
    expect(await readFile(join(root, 'Notes', 'Broken', 'Idea.md'), 'utf8')).toBe(page)
    expect(await readFile(join(root, 'Notes', 'Broken', '_pageset.json'), 'utf8')).toBe('{corrupt')
  })
})
