import { applyEvents } from '../Nexus/fileEvents'
import * as liveTree from '../Nexus/liveTree'
import { settleNow } from '../Nexus/settle'
import { handleMutate } from '../Nexus/mutate'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { splitFrontmatter } from '../Files/pageFile'
import { basename, dirname, join, relative } from '../Paths/posix'
import { noModeBits, readJsonAt, seedNexus } from '../Testing/hostFs'
import {
  bundleDirs,
  bundleNexusEachTest,
  PAGE_A,
  PAGE_B,
  PAGE_C,
  seedPropertyBundle,
  stateOrder,
} from '../Testing/bundles'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { machine } from '../Platform/machine'
import { pathExists } from '../Files/atomicWrite'
import { bundleOf, settledMutate } from '../Testing/settledMutate'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'
import { listBundles } from './bundle'
import { patchRecord, readRecord, writeRecord } from './record'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { seedContentIndex } from '../Index/indexSeed'
import { readNexus } from '../Nexus/readNexus'
import { nexusPages } from '../Nexus/heldPages'
import { setPanelContextOrder, setSpaceOrder } from '../Nexus/reorder'
import { refreshTree } from '../Nexus/liveTree'
import type { ContextsRegistry } from '../Contexts/contexts'
import type { RestoreDestination } from '../Nexus/mutateRequest'
import { readNotes } from '../Nexus/owed'
import { finishOwed } from '../Nexus/finishOwed'
import { OWED_REL } from '../Paths/nexusPaths'
import type { MutateReply } from '../Nexus/mutateRequest'

let root: string
bundleNexusEachTest('pom-restore-', (r) => (root = r))

describe('a Context’s place', () => {
  const registryIds = async (): Promise<string[]> =>
    (await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))).contexts.map((c) => c.id)
  const seeded = {
    spaces: { ctx_projects: ['sp-sap', 'sp-pom'], ctx_areas: ['sp-home'] },
    contexts: ['ctx_projects', 'ctx_areas'],
  }
  const deleteProjects = () =>
    settledMutate(root, { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' })

  beforeEach(async () => {
    await writeFile(
      contextsRegistryFile(root),
      JSON.stringify({
        contexts: [
          { id: 'ctx_areas', title: 'Areas' },
          { id: 'ctx_projects', title: 'Projects' },
          { id: 'ctx_zeta', title: 'Zeta' },
        ],
      }),
    )
    await setSpaceOrder(root, 'ctx_projects', ['sp-sap', 'sp-pom'])
    await setSpaceOrder(root, 'ctx_areas', ['sp-home'])
    await setPanelContextOrder(root, ['ctx_projects', 'ctx_areas'])
  })

  it('a Context’s delete takes its panel id and Space order into its record, and its restore returns it to its place in both orders', async () => {
    const r = await deleteProjects()
    if (!bundleOf(r)) throw new Error('the delete did not trash')
    const bundlePath = bundleOf(r)
    expect(await stateOrder(root)).toEqual({
      spaces: { ctx_areas: ['sp-home'] },
      contexts: ['ctx_areas'],
    })
    expect(await readRecord(join(root, bundlePath))).toMatchObject({
      place: { above: 'ctx_zeta', below: 'ctx_areas' },
      panel: { above: 'ctx_areas' },
      spaceOrder: ['sp-sap', 'sp-pom'],
    })
    expect((await settledMutate(root, { op: 'restore', bundlePath })).ok).toBe(true)
    expect(await registryIds()).toEqual(['ctx_areas', 'ctx_projects', 'ctx_zeta'])
    const tree = await readNexus(root)
    expect(tree.contexts[1].spaces.map((sp) => sp.id)).toEqual(['sp-sap', 'sp-pom'])
    expect(tree.config.order.contexts).toEqual(['ctx_projects', 'ctx_areas'])
    expect(await stateOrder(root)).toEqual(seeded)
  })

  it('a Context returns beside the neighbor its record names, wherever that neighbor has moved', async () => {
    const r = await deleteProjects()
    if (!bundleOf(r)) throw new Error('the delete did not trash')
    await writeFile(
      contextsRegistryFile(root),
      JSON.stringify({
        contexts: [
          { id: 'ctx_zeta', title: 'Zeta' },
          { id: 'ctx_areas', title: 'Areas' },
        ],
      }),
    )
    await refreshTree(root)
    expect((await settledMutate(root, { op: 'restore', bundlePath: bundleOf(r) })).ok).toBe(true)
    expect(await registryIds()).toEqual(['ctx_projects', 'ctx_zeta', 'ctx_areas'])
  })
})

describe('restore — the record spends, headless', () => {
  it('a restore and an empty leave no folder their bundle emptied in the Trash', async () => {
    const trashed = async (): Promise<string> =>
      bundleOf(
        await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }),
      )
    const restored = await trashed()
    expect(restored).toMatch(/^\.trash\/Notes\/Daily\/[^/]+__Alpha\.md\.deleted$/)
    expect((await settledMutate(root, { op: 'restore', bundlePath: restored })).ok).toBe(true)
    expect(await pathExists(join(root, '.trash', 'Notes'))).toBe(false)
    const emptied = await trashed()
    expect((await settledMutate(root, { op: 'emptyBundle', bundlePath: emptied })).ok).toBe(true)
    expect(await pathExists(join(root, '.trash', 'Notes'))).toBe(false)
    expect(await pathExists(join(root, '.trash'))).toBe(true)
  })

  it('a bundle whose artifact has left refuses its restore in either store with one line', async () => {
    const refused = async (bundlePath: string, artifact: string): Promise<MutateReply> => {
      await rm(join(root, bundlePath, artifact))
      return settledMutate(root, { op: 'restore', bundlePath })
    }
    await writeFile(join(root, 'Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\n---\nbeta`)
    await refreshTree(root)
    const deleted = await settledMutate(root, {
      op: 'delete',
      path: 'Notes/Daily/Alpha.md',
      kind: 'page',
    })
    const archived = await settledMutate(root, {
      op: 'archive',
      path: 'Notes/Daily/Beta.md',
      kind: 'page',
    })
    for (const r of [
      await refused(bundleOf(deleted), 'Alpha.md'),
      await refused(bundleOf(archived), 'Beta.md'),
    ])
      expect(r.ok ? '' : r.error.message).toBe('That item is no longer there.')
  })

  it('a Space round-trips: the surviving roots carry its tag again', async () => {
    await settledMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects/Pommora',
      kind: 'space',
    })
    expect(
      splitFrontmatter(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8'))[
        '<Projects>'
      ],
    ).toBeUndefined()

    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r.ok).toBe(true)
    expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora', '_space.json'))).toBe(
      true,
    )
    expect(
      splitFrontmatter(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8'))[
        '<Projects>'
      ],
    ).toEqual(['Pommora'])
    const sap = await readJsonAt(join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'))
    expect(sap['<Projects>']).toEqual(['Pommora'])
  })

  describe('a Space’s tags go back under its Context’s exact key', () => {
    const alpha = (): string => join(root, 'Notes', 'Daily', 'Alpha.md')
    const restoredPommora = async (keys: string): Promise<Record<string, unknown>> => {
      await settledMutate(root, {
        op: 'delete',
        path: '.nexus/contexts/Projects/Pommora',
        kind: 'space',
      })
      await writeFile(alpha(), `---\nID: ${PAGE_A}\n${keys}\n---\nbody`)
      await refreshTree(root)
      const [listed] = await listBundles(root, { kind: 'trash' })
      const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
      expect(r.ok).toBe(true)
      return splitFrontmatter(await readFile(alpha(), 'utf8'))
    }

    it('lands the exact key beside another casing, which keeps its members', async () => {
      const fm = await restoredPommora('<projects>:\n  - sapphire')
      expect(fm['<projects>']).toEqual(['sapphire'])
      expect(fm['<Projects>']).toEqual(['Pommora'])
    })
  })

  it('a Space restored during its Context’s rename lands in the renamed Context, its tags under the new key', async () => {
    await settledMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects/Pommora',
      kind: 'space',
    })
    const [listed] = await listBundles(root, { kind: 'trash' })
    const [renamed, restored] = await Promise.all([
      settledMutate(root, { op: 'renameContext', contextId: 'ctx_projects', newName: 'Ventures' }),
      settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }),
    ])
    expect(renamed.ok && restored.ok).toBe(true)
    expect(await pathExists(join(contextsDir(root), 'Ventures', 'Pommora', '_space.json'))).toBe(
      true,
    )
    expect(await pathExists(join(contextsDir(root), 'Projects'))).toBe(false)
    const fm = splitFrontmatter(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8'))
    expect(fm['<Ventures>']).toEqual(['Pommora'])
    expect('<Projects>' in fm).toBe(false)
  })

  it('a tag that can’t go back is named, and the bundle is spent', async () => {
    await settledMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects/Pommora',
      kind: 'space',
    })
    const alpha = join(root, 'Notes', 'Daily', 'Alpha.md')
    await writeFile(alpha, `---\nID: ${PAGE_A}\nbroken: [\n---\nbody`)
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r).toEqual({ ok: true, value: { unrestored: ['Alpha'] } })
    expect(await pathExists(join(root, listed.bundlePath))).toBe(false)
  })

  it('a tag neither of two pages claiming one id takes back is named, and the bundle is spent', async () => {
    await settledMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects/Pommora',
      kind: 'space',
    })
    const copy = join(root, 'Notes', 'Daily', 'Alpha copy.md')
    await writeFile(copy, `---\nID: ${PAGE_A}\n---\ncopy`)
    await refreshTree(root)
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r).toEqual({ ok: true, value: { unrestored: ['Alpha copy'] } })
    expect(await pathExists(join(root, listed.bundlePath))).toBe(false)
    for (const file of [join(root, 'Notes', 'Daily', 'Alpha.md'), copy])
      expect(splitFrontmatter(await readFile(file, 'utf8'))).not.toHaveProperty('<Projects>')
  })

  it('a root gone since isn’t named among the tags that didn’t go back', async () => {
    await settledMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects/Pommora',
      kind: 'space',
    })
    await rm(join(root, 'Notes', 'Daily', 'Alpha.md'))
    await refreshTree(root)
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r).toEqual({ ok: true, value: {} })
  })

  it('a Context round-trips: its registry entry returns and membership re-applies', async () => {
    await settledMutate(root, { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' })
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r.ok).toBe(true)
    const reg = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
    expect(reg.contexts).toContainEqual({
      id: 'ctx_projects',
      title: 'Projects',
      singular: 'Project',
      icon: 'target',
    })
    expect(
      splitFrontmatter(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8'))[
        '<Projects>'
      ],
    ).toEqual(['Pommora'])
    const sap = await readJsonAt(join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'))
    expect(sap['<Projects>']).toEqual(['Pommora'])
  })

  it('a Context restore leaves a member written in another casing than its Space off the page', async () => {
    const alpha = join(root, 'Notes', 'Daily', 'Alpha.md')
    await writeFile(alpha, `---\nID: ${PAGE_A}\n<Projects>:\n  - pommora\n---\nbody`)
    await refreshTree(root)
    await settledMutate(root, { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' })
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r).toEqual({ ok: true, value: {} })
    expect('<Projects>' in splitFrontmatter(await readFile(alpha, 'utf8'))).toBe(false)
  })

  it('the resolver re-runs inside the op — a parent gone between list and restore refuses', async () => {
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    const [listed] = await listBundles(root, { kind: 'trash' })
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r.ok).toBe(false)
  })

  it('an incomplete deletion refuses, and its record stays put', async () => {
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    const [dir] = await bundleDirs(root)
    await rm(join(dir, 'Alpha.md'), { force: true })
    const r = await settledMutate(root, {
      op: 'restore',
      bundlePath: join('.trash', 'Notes', 'Daily', basename(dir)),
    })
    expect(r.ok).toBe(false)
    expect(await pathExists(join(dir, '_record.json'))).toBe(true)
  })
})

describe('a stripped Link value refilled where it stood', () => {
  const beta = (): string => join(root, 'Notes', 'Beta.md')
  const restore = async (name: string): Promise<void> => {
    const listed = (await listBundles(root, { kind: 'trash' })).find((b) => b.artifactName === name)
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed?.bundlePath ?? '' })
    expect(r.ok).toBe(true)
  }

  beforeEach(async () => {
    await seedNexus(root, {
      defs: [{ id: 'prop_related', label: 'Related', key: 'Related', type: 'link' }],
    })
    await writeFile(beta(), `---\nID: ${PAGE_B}\nRelated: "[[Alpha]]"\n---\nlinker`)
    await refreshTree(root)
  })

  const placed = `---\nID: ${PAGE_B}\nNote: a\nRelated: "[[Alpha]]"\nZed: z\n---\nb\n`
  const deleteAlpha = () =>
    settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })

  it('a Link key a delete stripped comes back where it stood', async () => {
    await writeFile(beta(), placed)
    await refreshTree(root)
    await deleteAlpha()
    expect(splitFrontmatter(await readFile(beta(), 'utf8'))).not.toHaveProperty('Related')
    await restore('Alpha.md')
    expect(await readFile(beta(), 'utf8')).toBe(placed)
    await deleteAlpha()
    await writeFile(beta(), `---\nID: ${PAGE_B}\nNote: a\n---\nb\n`)
    await refreshTree(root)
    await restore('Alpha.md')
    expect(await readFile(beta(), 'utf8')).toBe(
      `---\nID: ${PAGE_B}\nNote: a\nRelated: "[[Alpha]]"\n---\nb\n`,
    )
  })

  it('a holder stripped under two Link properties takes both back in one landing', async () => {
    await seedNexus(root, {
      defs: [
        { id: 'prop_related', label: 'Related', key: 'Related', type: 'link' },
        { id: 'prop_see', label: 'See', key: 'See', type: 'link' },
      ],
    })
    const held = `---\nID: ${PAGE_B}\nRelated: "[[Alpha]]"\nMid: m\nSee: "[[Alpha]]"\nZed: z\n---\nb\n`
    await writeFile(beta(), held)
    await refreshTree(root)
    await deleteAlpha()
    expect(await readFile(beta(), 'utf8')).toBe(`---\nID: ${PAGE_B}\nMid: m\nZed: z\n---\nb\n`)
    const land = vi.spyOn(machine(), 'land')
    await restore('Alpha.md')
    expect(await readFile(beta(), 'utf8')).toBe(held)
    expect(
      land.mock.calls.flatMap(([files]) => files).filter((f) => f.path === beta()),
    ).toHaveLength(1)
  })

  it('a stripped Link key comes back where it stood in a Trash copy', async () => {
    await writeFile(beta(), placed)
    await refreshTree(root)
    await deleteAlpha()
    await settledMutate(root, { op: 'delete', path: 'Notes/Beta.md', kind: 'page' })
    await restore('Alpha.md')
    const listed = (await listBundles(root, { kind: 'trash' })).find(
      (b) => b.artifactName === 'Beta.md',
    )
    expect(await readFile(join(root, listed?.bundlePath ?? '', 'Beta.md'), 'utf8')).toBe(placed)
  })

  it('fills the exact key, leaving another casing the copy holds blank', async () => {
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    await writeFile(beta(), `---\nID: ${PAGE_B}\nrelated:\n---\nlinker`)
    await refreshTree(root)
    await settledMutate(root, { op: 'delete', path: 'Notes/Beta.md', kind: 'page' })
    await restore('Alpha.md')
    await restore('Beta.md')
    const fm = splitFrontmatter(await readFile(beta(), 'utf8'))
    expect(fm.Related).toBe('[[Alpha]]')
    expect(fm.related).toBeNull()
  })
})

describe('restore — the returning page’s links follow the pages they named', () => {
  const ALPHA = join('Notes', 'Daily', 'Alpha.md')
  const text = (rel: string): Promise<string> => readFile(join(root, rel), 'utf8')
  const write = (rel: string, id: string, fm: string, body: string): Promise<void> =>
    writeFile(join(root, rel), `---\nID: ${id}\n${fm}---\n${body}`)
  const reseed = async (): Promise<void> => {
    await refreshTree(root)
    await seedContentIndex(root)
  }
  const del = async (path: string, kind: 'page' | 'set' = 'page'): Promise<void> => {
    expect((await settledMutate(root, { op: 'delete', path, kind })).ok).toBe(true)
  }
  const restore = async (name: string, destination?: RestoreDestination) => {
    const bundles = await listBundles(root, { kind: 'trash' })
    const listed = bundles.filter((b) => b.artifactName === name).at(-1)
    const r = await settledMutate(root, {
      op: 'restore',
      bundlePath: listed?.bundlePath ?? '',
      ...(destination ? { destination } : {}),
    })
    expect(r.ok).toBe(true)
    return r.ok ? r.value : undefined
  }

  beforeEach(async () => {
    installStores(memoryStores().stores)
    await seedNexus(root, {
      defs: [{ id: 'prop_related', label: 'Related', key: 'Related', type: 'link' }],
    })
    await mkdir(join(root, 'Notes', 'Other'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'Other', '_pageset.json'),
      JSON.stringify({ id: 'set-other' }),
    )
    await write(ALPHA, PAGE_A, 'Related: "[[Beta]]"\n', '[[Beta]] ![[Beta]]')
    await write('Notes/Beta.md', PAGE_B, '', 'beta')
    await reseed()
  })
  afterEach(() => installStores(NO_STORES))

  it('follows a page renamed meanwhile, in its body, its embed, and its value', async () => {
    await del(ALPHA)
    const renamed = await settledMutate(root, {
      op: 'rename',
      path: 'Notes/Beta.md',
      kind: 'page',
      newName: 'Gamma',
    })
    expect(renamed.ok).toBe(true)
    await restore('Alpha.md')
    expect(await text(ALPHA)).toBe(
      `---\nID: ${PAGE_A}\nRelated: "[[Gamma]]"\n---\n[[Gamma]] ![[Gamma]]`,
    )
  })

  it('keeps every link byte for byte when nothing it named changed meanwhile', async () => {
    const written = `---\nID: ${PAGE_A}\nRelated: "[[beta]]"\n---\n[[beta]] [[notes/beta]] [b](beta)`
    await writeFile(join(root, ALPHA), written)
    await reseed()
    await del(ALPHA)
    await restore('Alpha.md')
    expect(await text(ALPHA)).toBe(written)
  })

  it('follows a case-only rename meanwhile, leaving a link to an unchanged page that carries .md as written', async () => {
    await write(ALPHA, PAGE_A, 'Related: "[[beta]]"\n', '[[beta]] [[Gamma.md]]')
    await write('Notes/Gamma.md', '01KVGMT8BFP350FZZXAMG1QDVG', '', 'gamma')
    await reseed()
    await del(ALPHA)
    const renamed = await settledMutate(root, {
      op: 'rename',
      path: 'Notes/Beta.md',
      kind: 'page',
      newName: 'BETA',
    })
    expect(renamed.ok).toBe(true)
    await restore('Alpha.md')
    expect(await text(ALPHA)).toBe(
      `---\nID: ${PAGE_A}\nRelated: "[[BETA]]"\n---\n[[BETA]] [[Gamma.md]]`,
    )
  })

  it('leaves its links as written to a page moved meanwhile', async () => {
    await del(ALPHA)
    const moved = await settledMutate(root, {
      op: 'movePage',
      path: 'Notes/Beta.md',
      newParentPath: 'Notes/Other',
    })
    expect(moved.ok).toBe(true)
    await restore('Alpha.md')
    expect(await text(ALPHA)).toBe(
      `---\nID: ${PAGE_A}\nRelated: "[[Beta]]"\n---\n[[Beta]] ![[Beta]]`,
    )
  })

  const ARCHIVED = (name: string): string =>
    `.nexus/archive/col-notes/Notes/2026-10-20T12-00-00-000Z__${name}.md.archived/${name}.md`

  it('a restore keeps the returning page’s Link value naming an archived page', async () => {
    await del(ALPHA)
    await mkdir(dirname(join(root, ARCHIVED('Beta'))), { recursive: true })
    await rename(join(root, 'Notes', 'Beta.md'), join(root, ARCHIVED('Beta')))
    await reseed()
    await restore('Alpha.md')
    expect(splitFrontmatter(await text(ALPHA)).Related).toBe('[[Beta]]')
  })

  it('a restore puts a stripped Link value back into the archived page that held it', async () => {
    await mkdir(dirname(join(root, ARCHIVED('Old'))), { recursive: true })
    await write(ARCHIVED('Old'), PAGE_C, 'Related: "[[Alpha]]"\n', 'old')
    await reseed()
    await del(ALPHA)
    expect(splitFrontmatter(await text(ARCHIVED('Old')))).not.toHaveProperty('Related')
    await restore('Alpha.md')
    expect(splitFrontmatter(await text(ARCHIVED('Old'))).Related).toBe('[[Alpha]]')
  })

  it('a restore leaves a stripped Link value out of both pages claiming its holder’s id, and names it', async () => {
    await write('Notes/Gamma.md', PAGE_C, 'Related: "[[Alpha]]"\n', 'gamma')
    await reseed()
    await del(ALPHA)
    await write('Notes/Other/Gamma.md', PAGE_C, '', 'copy')
    await reseed()
    expect(await restore('Alpha.md')).toEqual({ unrestored: ['Gamma'] })
    for (const rel of ['Notes/Gamma.md', 'Notes/Other/Gamma.md'])
      expect(splitFrontmatter(await text(rel))).not.toHaveProperty('Related')
  })

  it('keeps its body, and a page deleted meanwhile records the value it stripped from the trashed copy', async () => {
    await del(ALPHA)
    await del('Notes/Beta.md')
    await restore('Alpha.md')
    const restored = await text(ALPHA)
    expect(restored).toContain('[[Beta]] ![[Beta]]')
    expect(splitFrontmatter(restored)).not.toHaveProperty('Related')
    const beta = (await listBundles(root, { kind: 'trash' })).find(
      (b) => b.artifactName === 'Beta.md',
    )
    expect(beta?.record).toMatchObject({
      links: [{ page: PAGE_A, property: 'prop_related', value: '[[Beta]]' }],
    })
  })

  it('a page landing in the Collection once its Set is gone re-spells a live path link to it, and leaves a bare one', async () => {
    await write(
      'Notes/Linker.md',
      '01KVGMT8BFP350FZZXAMG1QDVK',
      '',
      '[[Daily/Alpha]] and [[Alpha]]',
    )
    await reseed()
    await del(ALPHA)
    await del('Notes/Daily', 'set')
    const reply = await restore('Alpha.md', { kind: 'container', id: 'col-notes' })
    expect(await pathExists(join(root, 'Notes', 'Alpha.md'))).toBe(true)
    expect(await text('Notes/Linker.md')).toContain('[[Notes/Alpha|Alpha]] and [[Alpha]]')
    expect(reply?.cascade?.pages).toEqual(['Notes/Linker.md'])
  })

  it('a twin made meanwhile elsewhere: its bare linkers gain its path, and a stripped bare link refills with the returning page’s', async () => {
    await write(ALPHA, PAGE_A, '', 'alpha')
    await write('Notes/Beta.md', PAGE_B, 'Related: "[[Alpha]]"\n', 'beta')
    await reseed()
    await del(ALPHA)
    const created = await settledMutate(root, {
      op: 'createPage',
      id: '01KVGMT8BFP350FZZXAMG1QDVM',
      parentPath: 'Notes/Other',
      name: 'Alpha',
    })
    expect(created.ok).toBe(true)
    await write('Notes/Third.md', '01KVGMT8BFP350FZZXAMG1QDVR', '', 'see [[Alpha]]')
    await reseed()
    const reply = await restore('Alpha.md')
    expect(reply?.unrestored).toBeUndefined()
    expect(await text('Notes/Third.md')).toContain('see [[Notes/Other/Alpha|Alpha]]')
    expect(splitFrontmatter(await text('Notes/Beta.md')).Related).toBe(
      '[[Notes/Daily/Alpha|Alpha]]',
    )
  })

  it('a Set restore keeps a value naming a page it holds that carries no ID', async () => {
    const gamma = 'Notes/Daily/Gamma.md'
    await write(gamma, '01KVGMT8BFP350FZZXAMG1QDVG', 'Related: "[[Omega]]"\n', 'gamma')
    await writeFile(join(root, 'Notes', 'Daily', 'Omega.md'), 'omega')
    await reseed()
    await del('Notes/Daily', 'set')
    const [listed] = await listBundles(root, { kind: 'trash' })
    // Unsettled: a relocate stamps no page, so the held tree leaves the ID-less one out where a fresh read lists it.
    const r = await handleMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r).toEqual({ ok: true, value: {} })
    expect(splitFrontmatter(await text(gamma)).Related).toBe('[[Omega]]')
    expect(await listBundles(root, { kind: 'trash' })).toEqual([])
  })

  it('a page returning beside a new namesake in its own folder refills its stripped link under its new name, and leaves the namesake’s linkers be', async () => {
    await write('Notes/Beta.md', PAGE_B, 'Related: "[[Alpha]]"\n', 'beta')
    await reseed()
    await del(ALPHA)
    const created = await settledMutate(root, {
      op: 'createPage',
      id: '01KVGMT8BFP350FZZXAMG1QDVM',
      parentPath: 'Notes/Daily',
      name: 'Alpha',
    })
    expect(created.ok).toBe(true)
    await write(
      'Notes/Third.md',
      '01KVGMT8BFP350FZZXAMG1QDVR',
      'Related: "[[Alpha]]"\n',
      'see [[Alpha]]',
    )
    await reseed()
    const third = await text('Notes/Third.md')
    const reply = await restore('Alpha.md')
    expect(await pathExists(join(root, 'Notes', 'Daily', 'Alpha (2).md'))).toBe(true)
    expect(reply?.unrestored).toBeUndefined()
    expect(splitFrontmatter(await text('Notes/Beta.md')).Related).toBe('[[Alpha (2)]]')
    expect(await text('Notes/Third.md')).toBe(third)
  })

  it('a Set returning beside a twin made meanwhile gives that twin’s bare linkers its path', async () => {
    await del('Notes/Daily', 'set')
    const created = await settledMutate(root, {
      op: 'createPage',
      id: '01KVGMT8BFP350FZZXAMG1QDVM',
      parentPath: 'Notes/Other',
      name: 'Alpha',
    })
    expect(created.ok).toBe(true)
    await write('Notes/Third.md', '01KVGMT8BFP350FZZXAMG1QDVR', '', 'see [[Alpha]]')
    await reseed()
    await restore('Daily')
    expect(await text('Notes/Third.md')).toContain('see [[Notes/Other/Alpha|Alpha]]')
  })

  describe('a namesake made meanwhile leaves the returning files’ own links on their own pages', () => {
    const namesake = async (): Promise<void> => {
      const created = await settledMutate(root, {
        op: 'createPage',
        id: '01KVGMT8BFP350FZZXAMG1QDVM',
        parentPath: 'Notes/Other',
        name: 'Alpha',
      })
      expect(created.ok).toBe(true)
      await reseed()
    }

    it('a page’s link to itself', async () => {
      await write(ALPHA, PAGE_A, '', 'me: [[Alpha]]')
      await reseed()
      await del(ALPHA)
      await namesake()
      await restore('Alpha.md')
      expect(await text(ALPHA)).toBe(`---\nID: ${PAGE_A}\n---\nme: [[Notes/Daily/Alpha|Alpha]]`)
    })

    it('a Set’s link to its returning sibling', async () => {
      await write('Notes/Daily/Gamma.md', PAGE_C, '', 'see [[Alpha]]')
      await reseed()
      await del('Notes/Daily', 'set')
      await namesake()
      await restore('Daily')
      expect(await text('Notes/Daily/Gamma.md')).toBe(
        `---\nID: ${PAGE_C}\n---\nsee [[Notes/Daily/Alpha|Alpha]]`,
      )
    })

    it('a Set’s Link value and body link to its returning sibling, the namesake in another Collection', async () => {
      await write('Notes/Daily/Gamma.md', PAGE_C, 'Related: "[[Alpha]]"\n', 'see [[Alpha]]')
      await reseed()
      await del('Notes/Daily', 'set')
      await mkdir(join(root, 'Plain'))
      await writeFile(
        join(root, 'Plain', '_pagecollection.json'),
        JSON.stringify({ id: 'col-plain' }),
      )
      await write('Plain/Alpha.md', '01KVGMT8BFP350FZZXAMG1QDVM', '', 'new')
      await reseed()
      await restore('Daily')
      expect(await text('Notes/Daily/Gamma.md')).toBe(
        `---\nID: ${PAGE_C}\nRelated: "[[Notes/Daily/Alpha|Alpha]]"\n---\nsee [[Notes/Daily/Alpha|Alpha]]`,
      )
    })
  })

  it('a restore that finds no settled world says its links weren’t updated', async () => {
    await del(ALPHA)
    const unsettled = vi.spyOn(liveTree, 'heldTreeOf').mockReturnValue(null)
    try {
      const reply = await restore('Alpha.md')
      expect(reply?.cascade?.warning).toBe("Links to “Alpha” weren't updated.")
    } finally {
      unsettled.mockRestore()
    }
  })

  describe('a Space’s values follow the pages they named', () => {
    const sidecar = () => join(contextsDir(root), 'Projects', 'Pommora', '_space.json')
    const renameBeta = async (): Promise<void> => {
      const renamed = await settledMutate(root, {
        op: 'rename',
        path: 'Notes/Beta.md',
        kind: 'page',
        newName: 'Gamma',
      })
      expect(renamed.ok).toBe(true)
    }
    beforeEach(async () => {
      await writeFile(sidecar(), JSON.stringify({ id: 'sp-pom', Related: '[[Beta]]' }))
      await reseed()
    })

    it('a Space restored on its own re-spells a value whose page was renamed meanwhile', async () => {
      expect(
        (
          await settledMutate(root, {
            op: 'delete',
            path: '.nexus/contexts/Projects/Pommora',
            kind: 'space',
          })
        ).ok,
      ).toBe(true)
      await renameBeta()
      await restore('Pommora')
      expect((await readJsonAt(sidecar())).Related).toBe('[[Gamma]]')
    })

    it('a trashed Context’s Spaces’ values follow a page renamed meanwhile', async () => {
      expect(
        (
          await settledMutate(root, {
            op: 'delete',
            path: '.nexus/contexts/Projects',
            kind: 'context',
          })
        ).ok,
      ).toBe(true)
      await renameBeta()
      await restore('Projects')
      expect((await readJsonAt(sidecar())).Related).toBe('[[Gamma]]')
    })
  })
})

describe('where a restore steps aside or refuses', () => {
  it('a corrupt registry refuses a Context restore with the bundle intact', async () => {
    await settledMutate(root, { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' })
    await writeFile(contextsRegistryFile(root), '{corrupt')
    await applyEvents(root, [
      { event: 'change', absPath: contextsRegistryFile(root), origin: 'watched' },
    ])
    await settleNow({ push: () => {}, watch: async () => {} }, root)
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r.ok).toBe(false)
    // Nothing moved and the evidence survives — the restore is retryable once the registry heals.
    expect(await bundleDirs(root)).toHaveLength(1)
    expect(await pathExists(join(contextsDir(root), 'Projects'))).toBe(false)
  })

  it('a Context restore under a title collision lands the FINAL title everywhere', async () => {
    await settledMutate(root, { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' })
    // An impostor mints the freed title while the original sits in trash.
    const reg = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
    reg.contexts.push({ id: 'ctx_impostor', title: 'Projects' })
    await writeFile(contextsRegistryFile(root), JSON.stringify(reg))
    await mkdir(join(contextsDir(root), 'Projects'), { recursive: true })
    await refreshTree(root)

    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r.ok).toBe(true)
    // Folder, registry entry, and membership key all wear the resolver's final title.
    expect(
      await pathExists(join(contextsDir(root), 'Projects (2)', 'Pommora', '_space.json')),
    ).toBe(true)
    const after = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
    expect(after.contexts).toContainEqual({
      id: 'ctx_projects',
      title: 'Projects (2)',
      singular: 'Project',
      icon: 'target',
    })
    const fm = splitFrontmatter(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8'))
    expect(fm['<Projects (2)>']).toEqual(['Pommora'])
    expect(fm['<Projects>']).toBeUndefined()
  })

  it('an occupant the tree cannot see is stepped around — never a clobber', async () => {
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    // An Unknown squatter takes the resolved target: same name, contradicting kind key.
    const squatter = '---\nID: 01KVGMT8BFT350FZZXAMG1QDVD\n---\nsquatter'
    await writeFile(join(root, 'Notes', 'Daily', 'Alpha.md'), squatter)
    await applyEvents(root, [
      { event: 'add', absPath: join(root, 'Notes', 'Daily', 'Alpha.md'), origin: 'watched' },
    ])
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r).toMatchObject({ ok: true, value: { landedAs: 'Alpha (2)' } })
    expect(await readFile(join(root, 'Notes', 'Daily', 'Alpha (2).md'), 'utf8')).toContain(PAGE_A)
    expect(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8')).toBe(squatter)
    expect(await bundleDirs(root)).toHaveLength(0)
  })

  it('a Set restored onto a folder Settings excludes steps aside, the excluded entry untouched', async () => {
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' })
    const settings = JSON.stringify({ excluded_folders: ['Notes/Daily'] })
    await writeFile(join(root, '.nexus', 'settings.json'), settings)
    await refreshTree(root)
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r).toMatchObject({ ok: true, value: { landedAs: 'Daily (2)' } })
    expect(await pathExists(join(root, 'Notes', 'Daily (2)', '_pageset.json'))).toBe(true)
    expect(await readFile(join(root, '.nexus', 'settings.json'), 'utf8')).toBe(settings)
  })

  it('a restore whose title the tree already holds answers the title it took', async () => {
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    await writeFile(join(root, 'Notes', 'Daily', 'Alpha.md'), `---\nID: ${PAGE_B}\n---\nlive`)
    await applyEvents(root, [
      { event: 'add', absPath: join(root, 'Notes', 'Daily', 'Alpha.md'), origin: 'watched' },
    ])
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r).toMatchObject({ ok: true, value: { landedAs: 'Alpha (2)' } })
  })

  it('a restore landing on its own title answers no landedAs', async () => {
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r.ok).toBe(true)
    expect(r.ok && 'landedAs' in r.value).toBe(false)
  })

  it('a Space steps past a folder its Context holds that the tree doesn’t', async () => {
    await settledMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects/Pommora',
      kind: 'space',
    })
    await mkdir(join(contextsDir(root), 'Projects', 'Pommora'))
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r).toMatchObject({ ok: true, value: { landedAs: 'Pommora (2)' } })
    expect(
      await pathExists(join(contextsDir(root), 'Projects', 'Pommora (2)', '_space.json')),
    ).toBe(true)
  })

  it('a Context steps past a folder under .nexus/contexts the registry doesn’t name, and the registry takes the stepped title', async () => {
    await settledMutate(root, { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' })
    await mkdir(join(contextsDir(root), 'Projects'))
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r).toMatchObject({ ok: true, value: { landedAs: 'Projects (2)' } })
    expect(
      await pathExists(join(contextsDir(root), 'Projects (2)', 'Pommora', '_space.json')),
    ).toBe(true)
    const registry = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
    expect(registry.contexts).toContainEqual(
      expect.objectContaining({ id: 'ctx_projects', title: 'Projects (2)' }),
    )
  })

  it('a path neither store holds refuses to restore', async () => {
    await mkdir(join(root, 'Notes', 'fake.deleted'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'fake.deleted', '_record.json'),
      JSON.stringify({ entity: 'page', id: 'x', parent: { kind: 'root' } }),
    )
    const r = await settledMutate(root, { op: 'restore', bundlePath: 'Notes/fake.deleted' })
    expect(r.ok).toBe(false)
    expect(await pathExists(join(root, 'Notes', 'fake.deleted', '_record.json'))).toBe(true)
  })

  it('of two trashed copies of one id the first restores and the second is refused as live', async () => {
    await writeFile(join(root, 'Notes', 'Daily', 'Alpha copy.md'), `---\nID: ${PAGE_A}\n---\ncopy`)
    await refreshTree(root)
    for (const path of ['Notes/Daily/Alpha copy.md', 'Notes/Daily/Alpha.md'])
      expect((await settledMutate(root, { op: 'delete', path, kind: 'page' })).ok).toBe(true)
    const claimed = (await nexusPages(root, await liveTree.liveTreeOf(root))).byId.get(PAGE_A)
    const bundles = await listBundles(root, { kind: 'trash' })
    const first = bundles.find((b) => claimed?.path.startsWith(`${b.bundlePath}/`))
    const second = bundles.find((b) => b !== first)
    const restore = (bundlePath = '') => settledMutate(root, { op: 'restore', bundlePath })
    const live = {
      ok: false,
      error: { message: 'Something in the nexus already carries this identity.' },
    }
    expect(await restore(second?.bundlePath)).toMatchObject(live)
    expect((await restore(first?.bundlePath)).ok).toBe(true)
    expect(await restore(second?.bundlePath)).toMatchObject(live)
  })

  it('a property whose definition can no longer stand does not return, and its record stays', async () => {
    const bundle = await seedPropertyBundle(root, {
      entity: 'property',
      id: 'prop_x',
      def: { id: 'prop_x' },
      values: {},
    })
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r.ok).toBe(false)
    expect(await pathExists(join(bundle, '_record.json'))).toBe(true)
    expect(await pathExists(join(root, '.nexus', 'properties.json'))).toBe(false)
  })
})

describe('what a hostile path or record can’t reach, and what a restore keeps intact', () => {
  it('a bundle path that escapes the Nexus refuses before anything opens', async () => {
    const r = await settledMutate(root, { op: 'restore', bundlePath: '../x' })
    expect(r.ok ? '' : r.error.message).toBe('Path escapes the nexus root.')
  })

  it('a record cannot steer the artifact outside the nexus', async () => {
    await settledMutate(root, { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' })
    const [dir] = await bundleDirs(root)
    const record = await readJsonAt<{ registry: Record<string, unknown> }>(
      join(dir, '_record.json'),
    )
    record.registry.title = '../../../escape-target'
    await writeFile(join(dir, '_record.json'), JSON.stringify(record))
    expect(await listBundles(root, { kind: 'trash' })).toEqual([])
    const r = await settledMutate(root, { op: 'restore', bundlePath: relative(root, dir) })
    expect(r.ok).toBe(false)
    expect(await pathExists(join(root, '..', 'escape-target'))).toBe(false)
  })

  it('a numeric-prefixed filename round-trips intact — the artifact keeps its real name', async () => {
    await writeFile(
      join(root, 'Notes', 'Daily', '12__Notes.md'),
      '---\nID: 01KVGMT8BFP350FZZXAMG1QDVE\n---\nbody',
    )
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/12__Notes.md', kind: 'page' })
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes', 'Daily', '12__Notes.md'))).toBe(true)
    expect(await pathExists(join(root, 'Notes', 'Daily', 'Notes.md'))).toBe(false)
  })

  it.skipIf(noModeBits)(
    'a failed move rolls the registry re-entry back — the restore stays retryable',
    async () => {
      const { chmod } = await import('node:fs/promises')
      await settledMutate(root, { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' })
      await chmod(join(root, '.nexus', 'contexts'), 0o555)
      try {
        const [listed] = await listBundles(root, { kind: 'trash' })
        const failed = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
        expect(failed.ok).toBe(false)
        // No ghost entry: the append reversed when the move refused.
        const reg = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
        expect(reg.contexts.some((c) => c.id === 'ctx_projects')).toBe(false)
      } finally {
        await chmod(join(root, '.nexus', 'contexts'), 0o755)
      }
      const [listed] = await listBundles(root, { kind: 'trash' })
      const retried = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
      expect(retried.ok).toBe(true)
      expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora'))).toBe(true)
    },
  )

  it('a disambiguated Context restore re-keys its own passengers to the final title', async () => {
    // Sapphire tags Pommora INSIDE Projects — a passenger link the delete never strips.
    await settledMutate(root, { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' })
    const reg = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
    reg.contexts.push({ id: 'ctx_impostor', title: 'Projects' })
    await writeFile(contextsRegistryFile(root), JSON.stringify(reg))
    await mkdir(join(contextsDir(root), 'Projects'), { recursive: true })
    await refreshTree(root)

    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r.ok).toBe(true)
    const sap = await readJsonAt(join(contextsDir(root), 'Projects (2)', 'Sapphire', '_space.json'))
    // The passenger's key follows the final title — never left pointing at the impostor.
    expect(sap['<Projects (2)>']).toEqual(['Pommora'])
    expect('<Projects>' in sap).toBe(false)
  })
})

describe('restore — into a chosen destination', () => {
  const lastBundle = async (name: string): Promise<string> => {
    const hit = (await listBundles(root, { kind: 'trash' })).find((b) => b.artifactName === name)
    expect(hit).toBeDefined()
    return (hit as { bundlePath: string }).bundlePath
  }

  it('a page whose Set is gone lands in the Collection the user picks', async () => {
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' })
    const bundlePath = await lastBundle('Alpha.md')
    // Nothing climbs on its own: the plain restore refuses first.
    expect((await settledMutate(root, { op: 'restore', bundlePath })).ok).toBe(false)
    const r = await settledMutate(root, {
      op: 'restore',
      bundlePath,
      destination: { kind: 'container', id: 'col-notes' },
    })
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes', 'Alpha.md'))).toBe(true)
  })

  it('a picked destination lands last in the destination’s order', async () => {
    await writeFile(join(root, 'Notes', 'Beta.md'), `---\nID: ${PAGE_B}\n---\nbody`)
    await writeFile(join(root, 'Notes', 'Gamma.md'), `---\nID: ${PAGE_C}\n---\nbody`)
    await refreshTree(root)
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    const r = await settledMutate(root, {
      op: 'restore',
      bundlePath: await lastBundle('Alpha.md'),
      destination: { kind: 'container', id: 'col-notes' },
    })
    expect(r.ok).toBe(true)
    expect((await readJsonAt(join(root, 'Notes', '_pagecollection.json'))).page_order).toEqual([
      PAGE_B,
      PAGE_C,
      PAGE_A,
    ])
  })

  it('a page lands in a Set, and a Set lands in a Collection', async () => {
    await mkdir(join(root, 'Notes', 'Weekly'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'Weekly', '_pageset.json'),
      JSON.stringify({ id: 'set-week' }),
    )
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    const pageBundle = await lastBundle('Alpha.md')
    expect(
      (
        await settledMutate(root, {
          op: 'restore',
          bundlePath: pageBundle,
          destination: { kind: 'container', id: 'set-week' },
        })
      ).ok,
    ).toBe(true)
    expect(await pathExists(join(root, 'Notes', 'Weekly', 'Alpha.md'))).toBe(true)

    await settledMutate(root, { op: 'delete', path: 'Notes/Weekly', kind: 'set' })
    const setBundle = await lastBundle('Weekly')
    expect(
      (
        await settledMutate(root, {
          op: 'restore',
          bundlePath: setBundle,
          destination: { kind: 'container', id: 'col-notes' },
        })
      ).ok,
    ).toBe(true)
    expect(await pathExists(join(root, 'Notes', 'Weekly', 'Alpha.md'))).toBe(true)
  })

  it('a Space whose Context is gone lands in the Context the user picks', async () => {
    const reg = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
    reg.contexts.push({ id: 'ctx_areas', title: 'Areas' })
    await writeFile(contextsRegistryFile(root), JSON.stringify(reg))
    await mkdir(join(contextsDir(root), 'Areas'), { recursive: true })

    await settledMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects/Pommora',
      kind: 'space',
    })
    await settledMutate(root, { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' })
    const bundlePath = await lastBundle('Pommora')
    expect((await settledMutate(root, { op: 'restore', bundlePath })).ok).toBe(false)
    const r = await settledMutate(root, {
      op: 'restore',
      bundlePath,
      destination: { kind: 'context', id: 'ctx_areas' },
    })
    expect(r.ok).toBe(true)
    expect(await pathExists(join(contextsDir(root), 'Areas', 'Pommora', '_space.json'))).toBe(true)
  })

  it('refuses an Archive destination naming no Archive bundle, or given to a Space', async () => {
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    await settledMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects/Pommora',
      kind: 'space',
    })
    for (const name of ['Alpha.md', 'Pommora']) {
      const r = await settledMutate(root, {
        op: 'restore',
        bundlePath: await lastBundle(name),
        destination: { kind: 'archive', at: '.nexus/archive/c1/x' },
      })
      expect(r.ok ? '' : r.error.message).toBe('That kind cannot be given a destination.')
    }
  })

  it('refuses an Undo whose address lies outside the Archive', async () => {
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    const bundlePath = await lastBundle('Alpha.md')
    await writeRecord(join(root, bundlePath), {
      entity: 'page',
      id: PAGE_A,
      parent: { kind: 'container', id: 'set-daily' },
    })
    const r = await settledMutate(root, {
      op: 'restore',
      bundlePath,
      destination: { kind: 'archive', at: '../Notes/Beta.md.archived' },
    })
    expect(r.ok ? '' : r.error.message).toBe('That kind cannot be given a destination.')
    expect(await pathExists(join(root, bundlePath, 'Alpha.md'))).toBe(true)
    expect(await pathExists(join(root, 'Notes', 'Daily', 'Alpha.md'))).toBe(false)
  })

  it('refuses the destination the move check would refuse — a Space is not a container', async () => {
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' })
    const bundlePath = await lastBundle('Alpha.md')
    // The Space's own id, offered as a container — the same answer the move check gives a page dragged onto a Space folder.
    const r = await settledMutate(root, {
      op: 'restore',
      bundlePath,
      destination: { kind: 'container', id: 'sp-pom' },
    })
    expect(r.ok).toBe(false)
    const moved = await settledMutate(root, {
      op: 'movePage',
      path: 'Notes/Daily/Alpha.md',
      newParentPath: '.nexus/contexts/Projects/Pommora',
    })
    expect(moved.ok).toBe(false)
  })

  it('refuses a destination whose own label contradicts the id it carries', async () => {
    // A live Context id, arriving labeled as a container. Honoring it would place the Space correctly by accident on a message that is malformed — a claim that disagrees with its own id is not a claim this path acts on.
    await settledMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects/Pommora',
      kind: 'space',
    })
    const bundlePath = await lastBundle('Pommora')
    const r = await settledMutate(root, {
      op: 'restore',
      bundlePath,
      destination: { kind: 'container', id: 'ctx_projects' },
    })
    expect(r.ok).toBe(false)
    expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora'))).toBe(false)
  })

  it('refuses a Space offered a container, and a container id naming nothing', async () => {
    await settledMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects/Pommora',
      kind: 'space',
    })
    const spaceBundle = await lastBundle('Pommora')
    expect(
      (
        await settledMutate(root, {
          op: 'restore',
          bundlePath: spaceBundle,
          destination: { kind: 'container', id: 'col-notes' },
        })
      ).ok,
    ).toBe(false)
    // Never falls back to the recorded parent when the pick names nothing.
    expect(
      (
        await settledMutate(root, {
          op: 'restore',
          bundlePath: spaceBundle,
          destination: { kind: 'context', id: 'ctx_nope' },
        })
      ).ok,
    ).toBe(false)
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(1)
  })

  it('refuses a destination for a kind that cannot be homeless', async () => {
    await settledMutate(root, { op: 'delete', path: 'Notes', kind: 'collection' })
    const bundlePath = await lastBundle('Notes')
    const r = await settledMutate(root, {
      op: 'restore',
      bundlePath,
      destination: { kind: 'container', id: 'col-notes' },
    })
    expect(r.ok).toBe(false)
  })

  it('a live identity still refuses, destination or not', async () => {
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    const bundlePath = await lastBundle('Alpha.md')
    await writeFile(join(root, 'Notes', 'Twin.md'), `---\nID: ${PAGE_A}\n---\nbody`)
    await refreshTree(root)
    const r = await settledMutate(root, {
      op: 'restore',
      bundlePath,
      destination: { kind: 'container', id: 'col-notes' },
    })
    expect(r.ok).toBe(false)
  })

  it('a relocation keeps its values whatever schema it lands in', async () => {
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_status'],
        defs: {
          prop_status: {
            id: 'prop_status',
            label: 'Status',
            key: 'Status',
            type: 'select',
            select_options: [{ key: 'live', label: 'live', color: 'green' }],
          },
        },
      }),
    )
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'col-notes', properties: ['prop_status'] }),
    )
    await mkdir(join(root, 'Plain'), { recursive: true })
    await writeFile(
      join(root, 'Plain', '_pagecollection.json'),
      JSON.stringify({ id: 'col-plain' }),
    )
    await writeFile(
      join(root, 'Notes', 'Daily', 'Beta.md'),
      `---\nID: ${PAGE_B}\nStatus: live\n---\nbody`,
    )
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' })
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' })
    const bundlePath = await lastBundle('Beta.md')
    const r = await settledMutate(root, {
      op: 'restore',
      bundlePath,
      destination: { kind: 'container', id: 'col-plain' },
    })
    expect(r.ok).toBe(true)
    const landed = await readFile(join(root, 'Plain', 'Beta.md'), 'utf8')
    // The value traveled as the page's own frontmatter; the destination's schema decides only what it displays.
    expect(landed.includes('Status: live')).toBe(true)
    expect(landed.includes('ID:')).toBe(true)
  })

  it('the same page restored to a Collection that DOES assign it keeps the value', async () => {
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_status'],
        defs: {
          prop_status: {
            id: 'prop_status',
            label: 'Status',
            key: 'Status',
            type: 'select',
            select_options: [{ key: 'live', label: 'live', color: 'green' }],
          },
        },
      }),
    )
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'col-notes', properties: ['prop_status'] }),
    )
    await writeFile(
      join(root, 'Notes', 'Daily', 'Beta.md'),
      `---\nID: ${PAGE_B}\nStatus: live\n---\nbody`,
    )
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' })
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' })
    const bundlePath = await lastBundle('Beta.md')
    const r = await settledMutate(root, {
      op: 'restore',
      bundlePath,
      destination: { kind: 'container', id: 'col-notes' },
    })
    expect(r.ok).toBe(true)
    expect(await readFile(join(root, 'Notes', 'Beta.md'), 'utf8')).toContain('Status: live\n')
  })
})

describe('a Context or Space restore', () => {
  const PROJECTS = '.nexus/contexts/Projects'
  const POMMORA = `${PROJECTS}/Pommora`
  const alpha = (): string => join(root, 'Notes', 'Daily', 'Alpha.md')
  const placed = `---\nID: ${PAGE_A}\nNote: a\n<Projects>:\n  - Pommora\nZed: z\n---\nb\n`

  const deleted = async (path: string, kind: 'context' | 'space'): Promise<string> => {
    const r = await settledMutate(root, { op: 'delete', path, kind })
    if (!bundleOf(r)) throw new Error('the delete did not trash')
    return bundleOf(r)
  }
  const restored = (bundlePath: string) => settledMutate(root, { op: 'restore', bundlePath })

  for (const [entity, path, kind] of [
    ['Context', PROJECTS, 'context'],
    ['Space', POMMORA, 'space'],
  ] as const)
    it(`a ${entity} restore lands its tag in place`, async () => {
      await writeFile(alpha(), placed)
      await refreshTree(root)
      expect((await restored(await deleted(path, kind))).ok).toBe(true)
      expect(await readFile(alpha(), 'utf8')).toBe(placed)
      const bundle = await deleted(path, kind)
      await writeFile(alpha(), `---\nID: ${PAGE_A}\nNote: a\n---\nb\n`)
      await refreshTree(root)
      expect((await restored(bundle)).ok).toBe(true)
      expect(await readFile(alpha(), 'utf8')).toBe(
        `---\nID: ${PAGE_A}\nNote: a\n<Projects>:\n  - Pommora\n---\nb\n`,
      )
    })

  for (const [entity, path, kind, id] of [
    ['Context', PROJECTS, 'context', 'ctx_projects'],
    ['Space', POMMORA, 'space', 'sp-pom'],
  ] as const)
    it.skipIf(noModeBits)(`a ${entity} restore turns its owed strip into renames`, async () => {
      const { chmod } = await import('node:fs/promises')
      await chmod(alpha(), 0o000)
      try {
        const bundle = await deleted(path, kind)
        expect((await readNotes(root))[id]?.strip).toBeDefined()
        expect((await restored(bundle)).ok).toBe(true)
        const entry = (await readNotes(root))[id]
        expect(entry).toMatchObject({ rename: [kind === 'context' ? 'Projects' : 'Pommora'] })
        expect(entry).not.toHaveProperty('strip')
      } finally {
        await chmod(alpha(), 0o644)
      }
      await finishOwed(root)
      expect(splitFrontmatter(await readFile(alpha(), 'utf8'))['<Projects>']).toEqual(['Pommora'])
      expect(await readNotes(root)).toEqual({})
    })

  it("a Context restore under another Context's owed title is refused", async () => {
    const bundle = await deleted(PROJECTS, 'context')
    await writeFile(
      join(root, OWED_REL),
      JSON.stringify({ ctx_other: { kind: 'context', rename: ['Projects'] } }),
    )
    const r = await restored(bundle)
    expect(r.ok ? 'restored' : r.error.code).toBe('owed')
    expect(await pathExists(join(root, bundle))).toBe(true)
  })
})

describe('a partly recorded entry', () => {
  it('a partly recorded Space’s restore says so', async () => {
    const restore = async (partial: boolean): Promise<string | undefined> => {
      await settledMutate(root, {
        op: 'delete',
        path: '.nexus/contexts/Projects/Pommora',
        kind: 'space',
      })
      const [listed] = await listBundles(root, { kind: 'trash' })
      if (partial)
        await patchRecord(join(root, listed.bundlePath), (raw) => ({ ...raw, partial: true }))
      const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
      if (!r.ok) throw new Error('restore refused')
      return r.value.cascade?.warning
    }
    expect(await restore(false)).toBeUndefined()
    expect(await restore(true)).toContain(
      '“Pommora” was recorded partly, so some of what it held may not come back.',
    )
  })
})
