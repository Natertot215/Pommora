// A trashed artifact stays current while it sits in the Trash, since every cascade reaches it there. These pin what it returns holding: the current keys, titles, and links, and its own Context key left for the rekey while a live Context holds its title.

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { splitFrontmatter } from '../Files/pageFile'
import { isMarkdownFile, join } from '../Paths/posix'
import { readJsonAt, failLandings, seedNexus, tempRoot } from '../Testing/hostFs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dropLiveTree, refreshTree } from './liveTree'
import { settledMutate } from '../Testing/settledMutate'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'
import { listBundles } from '../Bundles/bundle'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { seedContentIndex } from '../Index/indexSeed'
import { closeSession, openSession } from './session'
import type { PropertyDefinition } from '../Properties/properties'

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
  root = tempRoot('pom-arrival-')
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

describe('a restore returns a trashed page as the Trash kept it', () => {
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
  })

  it('a trashed page’s Link follows a page renamed meanwhile', async () => {
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

  it('a restore returns the page’s bytes as they stood in the Trash', async () => {
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      `---\nID: ${PAGE_A}\nauthor: Username\n<Projects>:\n  - pommora\nPriority: hi\n---\nthe body\n`,
    )
    let trashed = ''
    await cycle('Notes/Alpha.md', 'page', async () => {
      const [listed] = await listBundles(root, { kind: 'trash' })
      trashed = await readFile(join(root, listed.bundlePath, 'Alpha.md'), 'utf8')
    })
    expect(await readFile(join(root, 'Notes', 'Alpha.md'), 'utf8')).toBe(trashed)
  })
})

describe('a returning page takes the current keys', () => {
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

  it('a page whose Set moved to another Collection while it sat in the Trash keeps a value only the Collection it left removed', async () => {
    await seedNexus(root, { assigned: { Notes: [PROP], Tasks: [PROP] } })
    await writeFile(
      join(root, 'Notes', 'Daily', 'Beta.md'),
      '---\nID: 01KVGMT8BFP350FZZXAMG1QDVB\nPriority: hi\n---\nbody',
    )
    await refreshTree(root)
    await cycle('Notes/Daily/Beta.md', 'page', async () => {
      const moved = await settledMutate(root, {
        op: 'moveSet',
        path: 'Notes/Daily',
        newParentPath: 'Tasks',
        order: ['set-daily'],
      })
      expect(moved.ok).toBe(true)
      const removed = { op: 'unassignProperty', containerPath: 'Notes', propertyId: PROP } as const
      expect((await settledMutate(root, removed)).ok).toBe(true)
    })
    expect((await fm('Tasks/Daily/Beta.md')).Priority).toBe('hi')
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

  it('a trashed Space follows a Context rename and a property rename', async () => {
    await seedPassenger()
    await writeFile(
      join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'),
      JSON.stringify({ id: 'sp-sap', '<Areas>': ['Work'], Priority: ['hi'] }),
    )
    await refreshTree(root)
    expect(
      (
        await settledMutate(root, {
          op: 'delete',
          path: '.nexus/contexts/Projects/Sapphire',
          kind: 'space',
        })
      ).ok,
    ).toBe(true)
    for (const req of [
      { op: 'renameContext', contextId: 'ctx_areas', newName: 'Domains' },
      { op: 'renameProperty', propertyId: PROP, label: 'Urgency' },
    ] as const)
      expect((await settledMutate(root, req)).ok).toBe(true)
    const [listed] = await listBundles(root, { kind: 'trash' })
    expect((await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })).ok).toBe(
      true,
    )
    expect(await sidecar('Projects/Sapphire')).toEqual({
      id: 'sp-sap',
      '<Domains>': ['Work'],
      Urgency: ['hi'],
    })
  })
})
