import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { splitFrontmatter } from '../Files/pageFile'
import { rm, mkdir, readdir, rename, symlink, writeFile, readFile } from 'node:fs/promises'
import { join, relative } from '../Paths/posix'
import { tempRoot, windows, readJsonAt } from '../Testing/hostFs'
import {
  renameContextOp,
  renameSpaceOp,
  replayPendingRename,
  unlinkContextKey,
  unlinkSpaceValue,
} from './contextCascade'
import { sweepGovernedRoots } from '../Nexus/governedSweep'
import { unsweptLine } from '../Nexus/entities'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { seedContentIndex } from '../Index/indexSeed'
import { clearJournal, readJournal, writeJournal } from './contextJournal'
import { contextsRegistryFile, contextsDir, nexusDir } from '../Paths/paths'
import type { ContextsRegistry } from './contexts'
import { pathExists } from '../Files/atomicWrite'
import { captureWriteTap } from '../Testing/writeTap'
import { fault, ok } from '../Contract/result'
import { mutateRegistryFile } from './contextsRegistry'
import { closeSession, openSession } from '../Nexus/session'
import { heldTreeOf, refreshTree } from '../Nexus/liveTree'
import { readNexus } from '../Nexus/readNexus'
import '../Nexus/settle'
import { spaceAt } from '../Nexus/treePatch'
import { contextWorldOf } from './contextResolve'
import { settledMutate } from '../Testing/settledMutate'
import type { TrashDeps } from '../Trash/discard'
import { newId } from '../Nexus/ids'

vi.mock('../Nexus/governedSweep', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../Nexus/governedSweep')>()
  return { ...mod, sweepGovernedRoots: vi.fn(mod.sweepGovernedRoots) }
})

vi.mock('./contextsRegistry', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./contextsRegistry')>()
  return { ...mod, mutateRegistryFile: vi.fn(mod.mutateRegistryFile) }
})

const sweepSpy = vi.mocked(sweepGovernedRoots)
const deps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

let root: string
const page = () => join(root, 'Notes', 'A.md')
const other = () => join(root, 'Notes', 'B.md')
const csSidecar = () => join(contextsDir(root), 'Classes', 'CS 161', '_space.json')

beforeEach(async () => {
  root = tempRoot('pom-cascade-')
  await openSession(root)
  await mkdir(nexusDir(root), { recursive: true })
  await mkdir(contextsDir(root), { recursive: true })
  await writeFile(
    contextsRegistryFile(root),
    JSON.stringify({
      contexts: [
        { id: 'ctx_projects', title: 'Projects', singular: 'Project' },
        { id: 'ctxC', title: 'Classes', singular: 'Class' },
      ],
    }),
  )
  await mkdir(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
  await writeFile(
    join(contextsDir(root), 'Projects', 'Pommora', '_space.json'),
    JSON.stringify({ id: 'sp-pom' }),
  )
  await mkdir(join(contextsDir(root), 'Classes', 'CS 161'), { recursive: true })
  await writeFile(csSidecar(), JSON.stringify({ id: 'sp-cs', '<Projects>': ['Pommora'] }))
  await mkdir(join(root, 'Notes'), { recursive: true })
  await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'c-notes' }))
  await writeFile(page(), '---\nid: p1\n<Projects>:\n  - Pommora\n---\nbody')
})
afterEach(async () => {
  installStores(NO_STORES)
  await rm(root, { recursive: true, force: true })
  closeSession()
})

describe('the cascades open only the members the index names', () => {
  const classes = () => join(root, 'Notes', 'C.md')
  beforeEach(async () => {
    await writeFile(other(), '---\nid: p2\n---\nuntagged')
    await writeFile(classes(), '---\nid: p3\n<Classes>:\n  - CS 161\n---\nbody')
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    sweepSpy.mockClear()
  })

  it('a Space rename opens the one holder and still reaches every sidecar', async () => {
    expect((await renameSpaceOp(root, 'sp-pom', 'Pom')).ok).toBe(true)
    expect(sweepSpy.mock.calls[0]?.[1]).toEqual([page()])
    expect((await fmOf(page()))['<Projects>']).toEqual(['Pom'])
    expect((await readJsonAt(csSidecar()))['<Projects>']).toEqual(['Pom'])
  })

  it('a Space rename leaves a member written in another casing as written', async () => {
    await writeFile(page(), '---\nid: p1\n<Projects>:\n  - Pommora\n  - pommora\n---\nbody')
    await seedContentIndex(root)
    expect((await renameSpaceOp(root, 'sp-pom', 'Pom')).ok).toBe(true)
    expect((await fmOf(page()))['<Projects>']).toEqual(['Pom', 'pommora'])
  })

  it('a Context rename opens the holders of the key alone', async () => {
    expect((await renameContextOp(root, 'ctx_projects', 'Ventures')).ok).toBe(true)
    expect(sweepSpy.mock.calls[0]?.[1]).toEqual([page()])
    expect((await fmOf(classes()))['<Classes>']).toEqual(['CS 161'])
  })

  it('the unlinks open the holders and capture them', async () => {
    const space = await unlinkSpaceValue(root, 'Projects', 'Pommora')
    expect(space.ok && space.value.captured.map((c) => c.kind).sort()).toEqual(['page', 'space'])
    expect(sweepSpy.mock.calls[0]?.[1]).toEqual([page()])
    const key = await unlinkContextKey(root, 'Classes', 'ctxC')
    expect(key.ok && [...key.value.touched.keys()]).toEqual([classes()])
    expect(sweepSpy.mock.calls[1]?.[1]).toEqual([classes()])
  })

  it('without an index every page is a candidate', async () => {
    installStores(NO_STORES)
    expect((await renameSpaceOp(root, 'sp-pom', 'Pom')).ok).toBe(true)
    expect(sweepSpy.mock.calls[0]?.[1]).toHaveLength(3)
  })
})

const regTitle = async (id: string): Promise<string | undefined> => {
  const reg = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
  return reg.contexts.find((c) => c.id === id)?.title
}

const retitle = async (title: string): Promise<void> => {
  await mutateRegistryFile(root, (cur) => ({
    ...cur,
    contexts: cur.contexts.map((c) => (c.id === 'ctx_projects' ? { ...c, title } : c)),
  }))
}

const fmOf = async (file: string): Promise<Record<string, unknown>> =>
  splitFrontmatter(await readFile(file, 'utf8')) as Record<string, unknown>

describe('renames and casing', () => {
  it('a case-only Context rename of itself passes; a case-variant of ANOTHER fails', async () => {
    expect((await renameContextOp(root, 'ctx_projects', 'classes')).ok).toBe(false)
    const self = await renameContextOp(root, 'ctx_projects', 'PROJECTS')
    expect(self.ok).toBe(true)
    const reg = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
    expect(reg.contexts.find((c) => c.id === 'ctx_projects')!.title).toBe('PROJECTS')
  })

  it('a case-only Context rename relocates the folder, commits the registry, and moves the key on every holder', async () => {
    await writeFile(other(), '---\nid: p2\n<projects>:\n  - Pommora\n---\nbody')
    const otherBefore = await readFile(other(), 'utf8')
    expect((await renameContextOp(root, 'ctx_projects', 'projects')).ok).toBe(true)
    expect(await readdir(contextsDir(root))).toContain('projects')
    expect(await regTitle('ctx_projects')).toBe('projects')
    expect(await fmOf(page())).toEqual({ id: 'p1', '<projects>': ['Pommora'] })
    expect(await readJsonAt(csSidecar())).toEqual({ id: 'sp-cs', '<projects>': ['Pommora'] })
    expect(await readFile(other(), 'utf8')).toBe(otherBefore)
    expect(await readJournal(root)).toBeNull()
  })

  it('a case-only Context rename merges the key into the one it already shares a page with, the page then reading both keys’ Spaces', async () => {
    await mkdir(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'),
      JSON.stringify({ id: 'sp-sap' }),
    )
    await writeFile(
      other(),
      '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAV\n<projects>: [Sapphire]\n<Projects>: [Pommora]\n---\nbody',
    )
    await refreshTree(root)
    const tagged = () =>
      heldTreeOf(root)?.collections[0].pages.find((p) => p.title === 'B')?.contextValues
    expect(tagged()).toEqual({ ctx_projects: ['sp-pom'] })
    const r = await settledMutate(
      root,
      { op: 'renameContext', contextId: 'ctx_projects', newName: 'projects' },
      deps,
    )
    expect(r.ok).toBe(true)
    expect(await fmOf(other())).toEqual({
      ID: '01ARZ3NDEKPSV4RRFFQ69G5FAV',
      '<projects>': ['Sapphire', 'Pommora'],
    })
    expect(tagged()).toEqual({ ctx_projects: ['sp-sap', 'sp-pom'] })
  })

  it('a case-only Space rename relocates the folder and retitles the Space on every holder', async () => {
    expect((await renameSpaceOp(root, 'sp-pom', 'pommora')).ok).toBe(true)
    expect(await readdir(join(contextsDir(root), 'Projects'))).toContain('pommora')
    expect((await fmOf(page()))['<Projects>']).toEqual(['pommora'])
    expect((await readJsonAt(csSidecar()))['<Projects>']).toEqual(['pommora'])
    expect(await readJournal(root)).toBeNull()
  })

  describe('an owed case-only rename replays on a disk that folds case', () => {
    const spaceJournal = () => ({
      contextId: 'ctx_projects',
      spaceId: 'sp-pom',
      oldTitle: 'Pommora',
      newTitle: 'pommora',
    })
    const projects = (title: string) => join(contextsDir(root), 'Projects', title)

    it('a Space already moved has its holders retitled, and the journal clears', async () => {
      await writeFile(page(), '---\nid: p1\n<Projects>:\n  - Pommora\n---\nbody')
      await rename(projects('Pommora'), projects('pommora'))
      await writeJournal(root, spaceJournal())
      await replayPendingRename(root)
      expect((await fmOf(page()))['<Projects>']).toEqual(['pommora'])
      expect(await readJournal(root)).toBeNull()
    })

    it('a Space that crashed before its move is moved, its holders retitled, and the journal clears', async () => {
      await writeFile(page(), '---\nid: p1\n<Projects>:\n  - Pommora\n---\nbody')
      await writeJournal(root, spaceJournal())
      await replayPendingRename(root)
      expect(await readdir(join(contextsDir(root), 'Projects'))).toContain('pommora')
      expect((await fmOf(page()))['<Projects>']).toEqual(['pommora'])
      expect(await readJournal(root)).toBeNull()
    })

    it('a Context committed and moved has its key rewritten, and the journal clears', async () => {
      await retitle('projects')
      await rename(join(contextsDir(root), 'Projects'), join(contextsDir(root), 'projects'))
      await writeJournal(root, {
        contextId: 'ctx_projects',
        oldTitle: 'Projects',
        newTitle: 'projects',
      })
      await replayPendingRename(root)
      expect(await readdir(contextsDir(root))).toContain('projects')
      expect(Object.keys(await fmOf(page()))).toEqual(['id', '<projects>'])
      expect(await regTitle('ctx_projects')).toBe('projects')
      expect(await readJournal(root)).toBeNull()
    })

    it('a Context that crashed before its move is moved, its key rewritten, its title committed, and the journal clears', async () => {
      await writeJournal(root, {
        contextId: 'ctx_projects',
        oldTitle: 'Projects',
        newTitle: 'projects',
      })
      await replayPendingRename(root)
      expect(await readdir(contextsDir(root))).toContain('projects')
      expect(Object.keys(await fmOf(page()))).toEqual(['id', '<projects>'])
      expect(await regTitle('ctx_projects')).toBe('projects')
      expect(await readJournal(root)).toBeNull()
    })
  })

  it('a Context rename leaves a page and a Space holding the key in another casing byte-identical', async () => {
    await writeFile(other(), '---\nid: p2\n<projects>:\n  - Pommora\n---\nbody')
    await writeFile(csSidecar(), JSON.stringify({ id: 'sp-cs', '<projects>': ['Pommora'] }))
    const before = [await readFile(other(), 'utf8'), await readFile(csSidecar(), 'utf8')]
    expect((await renameContextOp(root, 'ctx_projects', 'Ventures')).ok).toBe(true)
    expect([await readFile(other(), 'utf8'), await readFile(csSidecar(), 'utf8')]).toEqual(before)
  })

  it('a Space rename leaves the title under another casing of the key as written', async () => {
    await writeFile(other(), '---\nid: p2\n<projects>:\n  - Pommora\n---\nbody')
    await writeFile(csSidecar(), JSON.stringify({ id: 'sp-cs', '<projects>': ['Pommora'] }))
    expect((await renameSpaceOp(root, 'sp-pom', 'Pom')).ok).toBe(true)
    expect((await fmOf(other()))['<projects>']).toEqual(['Pommora'])
    expect((await readJsonAt(csSidecar()))['<projects>']).toEqual(['Pommora'])
  })

  it('unlinking a Context strips and captures its exact key, leaving another casing in place', async () => {
    await writeFile(
      other(),
      '---\nid: p2\n<projects>:\n  - Pommora\n<Projects>: Sapphire\n---\nbody',
    )
    const r = await unlinkContextKey(root, 'Projects', 'ctx_projects')
    expect(r.ok && r.value.captured).toContainEqual({ kind: 'page', values: ['Sapphire'] })
    expect(await fmOf(other())).toEqual({ id: 'p2', '<projects>': ['Pommora'] })
  })

  it('a retry whose old title another Context holds in another case answers null and sweeps nothing', async () => {
    await writeFile(other(), '---\nid: p2\n<Classes>:\n  - CS 161\n---\nbody')
    const before = await readFile(other(), 'utf8')
    sweepSpy.mockClear()
    expect(await renameContextOp(root, 'ctx_projects', 'Projects', 'classes')).toEqual(ok(null))
    expect(sweepSpy).not.toHaveBeenCalled()
    expect(await readFile(other(), 'utf8')).toBe(before)
  })
})

describe('renameContextOp', () => {
  it('a single value renamed onto a held list joins it as a list of one, on a page and a Space', async () => {
    await writeFile(other(), '---\nid: p2\n<Projects>: Pommora\n<Ventures>:\n  - X\n---\nbody')
    await writeFile(
      csSidecar(),
      JSON.stringify({ id: 'sp-cs', '<Projects>': 'Pommora', '<Ventures>': ['X'] }),
    )
    expect((await renameContextOp(root, 'ctx_projects', 'Ventures')).ok).toBe(true)
    expect(await fmOf(other())).toEqual({ id: 'p2', '<Ventures>': ['X', 'Pommora'] })
    expect(await readJsonAt(csSidecar())).toEqual({ id: 'sp-cs', '<Ventures>': ['X', 'Pommora'] })
  })

  it('a retry whose old title the Context holds again leaves every holder byte-identical', async () => {
    const before = [await readFile(page(), 'utf8'), await readFile(csSidecar(), 'utf8')]
    expect((await renameContextOp(root, 'ctx_projects', 'Projects', 'Projects')).ok).toBe(true)
    expect([await readFile(page(), 'utf8'), await readFile(csSidecar(), 'utf8')]).toEqual(before)
  })

  it('rewrites the KEY in both scopes, commits the registry, clears the journal', async () => {
    const r = await renameContextOp(root, 'ctx_projects', 'Ventures')
    expect(r.ok).toBe(true)
    const fm = await fmOf(page())
    expect(fm['<Ventures>']).toEqual(['Pommora'])
    expect('<Projects>' in fm).toBe(false)
    const sc = await readJsonAt(csSidecar())
    expect(sc['<Ventures>']).toEqual(['Pommora'])
    expect(sc.id).toBe('sp-cs')
    expect(await regTitle('ctx_projects')).toBe('Ventures')
    expect(await pathExists(join(contextsDir(root), 'Ventures', 'Pommora'))).toBe(true)
    expect(await readJournal(root)).toBeNull()
  })

  it('merges + dedupes into a pre-existing inert key wearing the new title', async () => {
    await writeFile(
      other(),
      '---\nid: p2\n<Projects>:\n  - Pommora\n<Ventures>:\n  - Other\n  - Pommora\nforeign: 1\n---\nbody',
    )
    const r = await renameContextOp(root, 'ctx_projects', 'Ventures')
    expect(r.ok).toBe(true)
    const fm = await fmOf(other())
    expect(fm['<Ventures>']).toEqual(['Other', 'Pommora'])
    expect('<Projects>' in fm).toBe(false)
    expect(fm.foreign).toBe(1)
  })

  it('a refused title commit renames nothing: no sweep, no folder moved, no note left', async () => {
    const registryBefore = await readFile(contextsRegistryFile(root), 'utf8')
    sweepSpy.mockClear()
    vi.mocked(mutateRegistryFile).mockResolvedValueOnce(fault('refused'))
    const r = await renameContextOp(root, 'ctx_projects', 'Ventures')
    expect(r.ok).toBe(false)
    expect(sweepSpy).not.toHaveBeenCalled()
    expect((await fmOf(page()))['<Projects>']).toEqual(['Pommora'])
    expect((await fmOf(page()))['<Ventures>']).toBeUndefined()
    expect((await readJsonAt(csSidecar()))['<Projects>']).toEqual(['Pommora'])
    expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora'))).toBe(true)
    expect(await pathExists(join(contextsDir(root), 'Ventures'))).toBe(false)
    expect(await readJournal(root)).toBeNull()
    expect(await readFile(contextsRegistryFile(root), 'utf8')).toBe(registryBefore)
  })

  const strayAtVentures = (): Promise<string | undefined> =>
    mkdir(join(contextsDir(root), 'Ventures', 'Stray'), { recursive: true })

  it('a folder that can’t move puts the title back and leaves no note and every holder as it was', async () => {
    await strayAtVentures()
    vi.mocked(mutateRegistryFile).mockClear()
    sweepSpy.mockClear()
    expect((await renameContextOp(root, 'ctx_projects', 'Ventures')).ok).toBe(false)
    expect(vi.mocked(mutateRegistryFile)).toHaveBeenCalledTimes(2)
    expect(await regTitle('ctx_projects')).toBe('Projects')
    expect((await fmOf(page()))['<Projects>']).toEqual(['Pommora'])
    expect((await readJsonAt(csSidecar()))['<Projects>']).toEqual(['Pommora'])
    expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora'))).toBe(true)
    expect(await readJournal(root)).toBeNull()
    expect(sweepSpy).not.toHaveBeenCalled()
  })

  it('a folder that can’t move under a title that can’t go back leaves the note, and the replay moves the folder and the keys', async () => {
    await strayAtVentures()
    const real = vi.mocked(mutateRegistryFile).getMockImplementation()
    if (!real) throw new Error('no implementation')
    vi.mocked(mutateRegistryFile)
      .mockImplementationOnce(real)
      .mockResolvedValueOnce(fault('refused'))
    expect((await renameContextOp(root, 'ctx_projects', 'Ventures')).ok).toBe(false)
    expect(await regTitle('ctx_projects')).toBe('Ventures')
    expect(await readJournal(root)).toEqual({
      contextId: 'ctx_projects',
      oldTitle: 'Projects',
      newTitle: 'Ventures',
    })
    await rm(join(contextsDir(root), 'Ventures'), { recursive: true })
    await replayPendingRename(root)
    expect(await pathExists(join(contextsDir(root), 'Ventures', 'Pommora'))).toBe(true)
    expect((await fmOf(page()))['<Ventures>']).toEqual(['Pommora'])
    expect(await readJournal(root)).toBeNull()
  })

  it('rejects a taken title without journaling; a sigil glyph is legal', async () => {
    expect((await renameContextOp(root, 'ctx_projects', 'Classes')).ok).toBe(false)
    expect(await readJournal(root)).toBeNull()
    expect(await regTitle('ctx_projects')).toBe('Projects')
    expect((await renameContextOp(root, 'ctx_projects', 'No[pe')).ok).toBe(true)
    expect(await regTitle('ctx_projects')).toBe('No[pe')
  })
})

describe('a renamed Context key keeps its place on every page carrying it', () => {
  it('rewrites the key where it sits, with the comment attached to it', async () => {
    const before =
      '---\ntitle: Alpha\n# which clients this is for\n<Projects>:\n  - Pommora\nstatus: draft\nauthor: Username\n---\nbody'
    await writeFile(other(), before)
    expect((await renameContextOp(root, 'ctx_projects', 'Ventures')).ok).toBe(true)
    expect(await readFile(other(), 'utf8')).toBe(
      '---\ntitle: Alpha\n# which clients this is for\n<Ventures>:\n  - Pommora\nstatus: draft\nauthor: Username\n---\nbody',
    )
  })

  it('a merge into a pre-existing key lands at the renamed key’s place', async () => {
    await writeFile(
      other(),
      '---\nid: p2\n# tags\n<Projects>:\n  - Pommora\n<Ventures>:\n  - Other\nforeign: 1\n---\nbody',
    )
    expect((await renameContextOp(root, 'ctx_projects', 'Ventures')).ok).toBe(true)
    expect(await readFile(other(), 'utf8')).toBe(
      '---\nid: p2\n# tags\n<Ventures>:\n  - Other\n  - Pommora\nforeign: 1\n---\nbody',
    )
  })

  it('a page whose frontmatter cannot round-trip is left byte-identical, and the rename completes around it', async () => {
    // A tab-indented sequence: admitted by identity, refused by the round-trip gate.
    const unwritable = '---\nID: 01KVGMT8BFP350FZZXAMG1QDVA\n<Projects>:\n\t- Pommora\n---\nbody'
    await writeFile(other(), unwritable)
    expect((await renameContextOp(root, 'ctx_projects', 'Ventures')).ok).toBe(true)
    expect(await readFile(other(), 'utf8')).toBe(unwritable)
    expect((await fmOf(page()))['<Ventures>']).toEqual(['Pommora'])
    expect(await regTitle('ctx_projects')).toBe('Ventures')
    expect(await readJournal(root)).toBeNull()
  })
})

describe('the renames report their folder to sync', () => {
  const tap = captureWriteTap()

  it('a Context rename', async () => {
    expect((await renameContextOp(root, 'ctx_projects', 'Ventures')).ok).toBe(true)
    expect(tap.renames).toEqual([
      [join(contextsDir(root), 'Projects'), join(contextsDir(root), 'Ventures')],
    ])
  })

  it('a Space rename', async () => {
    expect((await renameSpaceOp(root, 'sp-pom', 'Pom')).ok).toBe(true)
    expect(tap.renames).toEqual([
      [join(contextsDir(root), 'Projects', 'Pommora'), join(contextsDir(root), 'Projects', 'Pom')],
    ])
  })
})

describe('renameSpaceOp', () => {
  it('rewrites the title on every holder', async () => {
    const r = await renameSpaceOp(root, 'sp-pom', 'Pommora 2')
    expect(r.ok).toBe(true)
    expect((await fmOf(page()))['<Projects>']).toEqual(['Pommora 2'])
    const sc = await readJsonAt(csSidecar())
    expect(sc['<Projects>']).toEqual(['Pommora 2'])
    expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora 2'))).toBe(true)
    expect(await readJournal(root)).toBeNull()
  })

  it('rewrites a tag written as a single value', async () => {
    await writeFile(other(), '---\nid: p2\n<Projects>: Pommora\n---\nbody')
    expect((await renameSpaceOp(root, 'sp-pom', 'Pommora 2')).ok).toBe(true)
    expect((await fmOf(other()))['<Projects>']).toEqual(['Pommora 2'])
  })

  it('dedupes when the new title already rides alongside the old', async () => {
    await writeFile(other(), '---\nid: p2\n<Projects>:\n  - Pommora\n  - Sapphire\n---\nbody')
    await mkdir(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'),
      JSON.stringify({ id: 'sp-sap' }),
    )
    expect((await renameSpaceOp(root, 'sp-pom', 'Sapphire')).ok).toBe(false)
    await rm(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true })
    const r = await renameSpaceOp(root, 'sp-pom', 'Sapphire')
    expect(r.ok).toBe(true)
    expect((await fmOf(other()))['<Projects>']).toEqual(['Sapphire'])
  })

  it('one groups array answers one world, and a settled Space rename answers a new one', async () => {
    const before = contextWorldOf((await refreshTree(root)).contexts)
    expect(contextWorldOf(heldTreeOf(root)?.contexts ?? [])).toBe(before)
    const req = { op: 'renameSpace', spaceId: 'sp-pom', newName: 'Pom' } as const
    expect((await settledMutate(root, req, deps)).ok).toBe(true)
    const after = contextWorldOf(heldTreeOf(root)?.contexts ?? [])
    expect(after).not.toBe(before)
    expect(after.spaceById.get('sp-pom')?.title).toBe('Pom')
  })
})

describe('a rename the journal refused reports what it skipped, with a retry', () => {
  const broken = (): string => join(root, 'Notes', 'Broken.md')
  const rename = { op: 'renameSpace', spaceId: 'sp-pom', newName: 'Pom' } as const
  const retry = { ...rename, from: 'Pommora' }
  const readable = async (): Promise<void> => {
    await rm(broken())
    await writeFile(broken(), '---\nid: pb\n<Projects>:\n  - Pommora\n---\nbody')
    await refreshTree(root)
  }
  beforeEach(async () => {
    await writeJournal(root, {
      contextId: 'ctxC',
      spaceId: 'sp-cs',
      oldTitle: 'CS 161',
      newTitle: 'CS 162',
    })
    await refreshTree(root)
  })

  it('answers neither when every member reads', async () => {
    expect(await settledMutate(root, rename, deps)).toEqual(ok({}))
    expect((await fmOf(page()))['<Projects>']).toEqual(['Pom'])
  })

  it.skipIf(windows)(
    'answers the line and a retry, which updates the member once it reads',
    async () => {
      await symlink(join(root, 'Notes', 'Nowhere.md'), broken())
      expect(await settledMutate(root, rename, deps)).toEqual(
        ok({ cascade: { pages: [], hosts: [], warning: unsweptLine(1) }, retry }),
      )
      expect((await readJournal(root))?.spaceId).toBe('sp-cs')
      await readable()
      expect(await settledMutate(root, retry, deps)).toEqual(ok({}))
      expect((await fmOf(broken()))['<Projects>']).toEqual(['Pom'])
    },
  )

  it.skipIf(windows)(
    'a retry once the Space is renamed again sweeps the member to the title held now',
    async () => {
      await symlink(join(root, 'Notes', 'Nowhere.md'), broken())
      expect((await settledMutate(root, rename, deps)).ok).toBe(true)
      await readable()
      const again = { op: 'renameSpace', spaceId: 'sp-pom', newName: 'Atlas' } as const
      expect((await settledMutate(root, again, deps)).ok).toBe(true)
      expect(await settledMutate(root, retry, deps)).toEqual(ok({}))
      expect((await fmOf(broken()))['<Projects>']).toEqual(['Atlas'])
    },
  )

  it.skipIf(windows)('a retry changes nothing once another Space takes the old name', async () => {
    await symlink(join(root, 'Notes', 'Nowhere.md'), broken())
    expect((await settledMutate(root, rename, deps)).ok).toBe(true)
    const create = { op: 'createSpace', id: newId(), contextId: 'ctx_projects', name: 'Pommora' }
    expect((await settledMutate(root, create as never, deps)).ok).toBe(true)
    await readable()
    expect(await settledMutate(root, retry, deps)).toEqual(ok({}))
    expect((await fmOf(broken()))['<Projects>']).toEqual(['Pommora'])
  })

  it.skipIf(windows)(
    'a retry changes nothing once another Space takes the old name in another case',
    async () => {
      await symlink(join(root, 'Notes', 'Nowhere.md'), broken())
      expect((await settledMutate(root, rename, deps)).ok).toBe(true)
      const create = { op: 'createSpace', id: newId(), contextId: 'ctx_projects', name: 'pommora' }
      expect((await settledMutate(root, create as never, deps)).ok).toBe(true)
      await writeFile(page(), '---\nid: p1\n<Projects>:\n  - pommora\n---\nbody')
      await readable()
      expect(await settledMutate(root, retry, deps)).toEqual(ok({}))
      expect((await fmOf(page()))['<Projects>']).toEqual(['pommora'])
      expect((await fmOf(broken()))['<Projects>']).toEqual(['Pommora'])
    },
  )
})

describe('a rename the journal took reports what it skipped, with a retry', () => {
  const broken = (): string => join(root, 'Notes', 'Broken.md')
  const rename = { op: 'renameSpace', spaceId: 'sp-pom', newName: 'Pom' } as const
  const retry = { ...rename, from: 'Pommora' }
  const skippedLine = ok({ cascade: { pages: [], hosts: [], warning: unsweptLine(1) }, retry })
  beforeEach(async () => {
    await symlink(join(root, 'Notes', 'Nowhere.md'), broken())
    await refreshTree(root)
  })

  it.skipIf(windows)(
    'answers the line and a retry, and a retry that reaches everything clears the journal',
    async () => {
      expect(await settledMutate(root, rename, deps)).toEqual(skippedLine)
      expect(await readJournal(root)).toMatchObject({
        spaceId: 'sp-pom',
        oldTitle: 'Pommora',
        newTitle: 'Pom',
      })
      await rm(broken())
      await writeFile(broken(), '---\nid: pb\n<Projects>:\n  - Pommora\n---\nbody')
      await refreshTree(root)
      expect(await settledMutate(root, retry, deps)).toEqual(ok({}))
      expect((await fmOf(broken()))['<Projects>']).toEqual(['Pom'])
      expect(await readJournal(root)).toBeNull()
    },
  )

  it.skipIf(windows)(
    'a retry that skips again answers the line again and keeps the journal',
    async () => {
      expect(await settledMutate(root, rename, deps)).toEqual(skippedLine)
      expect(await settledMutate(root, retry, deps)).toEqual(skippedLine)
      expect(await readJournal(root)).toMatchObject({
        spaceId: 'sp-pom',
        oldTitle: 'Pommora',
        newTitle: 'Pom',
      })
    },
  )

  it.skipIf(windows).each([
    [
      'Space',
      rename,
      { ...rename, newName: 'Pomelo' },
      (fm: Record<string, unknown>) => fm['<Projects>'],
      ['Pomelo'],
    ],
    [
      'Context',
      { op: 'renameContext', contextId: 'ctx_projects', newName: 'Ventures' } as const,
      { op: 'renameContext', contextId: 'ctx_projects', newName: 'Quests' } as const,
      (fm: Record<string, unknown>) => fm['<Quests>'],
      ['Pommora'],
    ],
  ] as const)(
    'a %s rename’s retry after a second rename sweeps what the first left to the title held now',
    async (_, first, second, held, expected) => {
      const answered = await settledMutate(root, first, deps)
      const retry = answered.ok && 'retry' in answered.value ? answered.value.retry : null
      if (!retry) throw new Error('no retry answered')
      await rm(broken())
      await writeFile(broken(), '---\nid: pb\n<Projects>:\n  - Pommora\n---\nbody')
      await refreshTree(root)
      expect((await settledMutate(root, second, deps)).ok).toBe(true)
      expect(await settledMutate(root, retry, deps)).toEqual(ok({}))
      expect(held(await fmOf(broken()))).toEqual(expected)
      expect(await readJournal(root)).toBeNull()
    },
  )
})

describe('skip-aware journal', () => {
  it.skipIf(windows)(
    'an unreadable file is skipped, the registry still commits, the journal survives; the next replay heals it',
    async () => {
      // A dangling symlink wearing the `.md` suffix: the sweep enumerates it by name, then fails to read it — the skip path, without needing a permission trick.
      const broken = join(root, 'Notes', 'Broken.md')
      await symlink(join(root, 'Notes', 'Nowhere.md'), broken)
      const r = await renameContextOp(root, 'ctx_projects', 'Ventures')
      expect(r.ok).toBe(true)
      expect(await regTitle('ctx_projects')).toBe('Ventures')
      expect(await readJournal(root)).toMatchObject({ oldTitle: 'Projects', newTitle: 'Ventures' })

      await rm(broken)
      await writeFile(broken, '---\nid: pb\n<Projects>:\n  - Pommora\n---\nbody')
      await replayPendingRename(root)
      expect((await fmOf(broken))['<Ventures>']).toEqual(['Pommora'])
      expect(await readJournal(root)).toBeNull()
    },
  )
})

describe('unlink cascades', () => {
  it('unlinkContextKey strips the wrapped key from both scopes', async () => {
    const { unlinkContextKey } = await import('./contextCascade')
    const r = await unlinkContextKey(root, 'Projects', 'ctx_projects')
    expect(r.ok).toBe(true)
    expect('<Projects>' in (await fmOf(page()))).toBe(false)
    expect('<Projects>' in (await readJsonAt(csSidecar()))).toBe(false)
  })

  it('unlinkSpaceValue strips and captures the title, dropping an emptied key', async () => {
    await writeFile(other(), '---\nid: p2\n<Projects>:\n  - Pommora\n  - Sapphire\n---\nbody')
    const { unlinkSpaceValue } = await import('./contextCascade')
    const r = await unlinkSpaceValue(root, 'Projects', 'Pommora')
    expect(r.ok).toBe(true)
    expect(r.ok && r.value.captured).toContainEqual({
      kind: 'page',
      values: ['Pommora'],
    })
    expect('<Projects>' in (await fmOf(page()))).toBe(false)
    expect((await fmOf(other()))['<Projects>']).toEqual(['Sapphire'])
  })

  it('unlinkSpaceValue strips and captures a member written as a number', async () => {
    await writeFile(other(), '---\nid: p2\n<Classes>:\n  - 2024\n  - CS 161\n---\nbody')
    const r = await unlinkSpaceValue(root, 'Classes', '2024')
    expect(r.ok && r.value.captured).toContainEqual({ kind: 'page', values: ['2024'] })
    expect((await fmOf(other()))['<Classes>']).toEqual(['CS 161'])
  })

  it('unlinkContextKey captures a member written as a number', async () => {
    await writeFile(other(), '---\nid: p2\n<Classes>:\n  - 2024\n  - CS 161\n---\nbody')
    const r = await unlinkContextKey(root, 'Classes', 'ctxC')
    expect(r.ok && r.value.captured).toContainEqual({ kind: 'page', values: ['2024', 'CS 161'] })
  })

  it('unlinkSpaceValue strips and captures a tag written as a single value', async () => {
    await writeFile(other(), '---\nid: p2\n<Projects>: Pommora\n---\nbody')
    const r = await unlinkSpaceValue(root, 'Projects', 'Pommora')
    expect(r.ok && r.value.captured).toContainEqual({ kind: 'page', values: ['Pommora'] })
    expect('<Projects>' in (await fmOf(other()))).toBe(false)
  })
})

describe('the sweep tells the truth about what it did', () => {
  const PAGE_C = '01KVGMT8BFP350FZZXAMG1QDTA'

  it('unlinkContextKey returns each swept root’s identity and stripped values; an Unknown root is refused, never touched', async () => {
    await writeFile(
      join(root, 'Notes', 'C.md'),
      `---\nID: ${PAGE_C}\n<Projects>:\n  - Pommora\n---\nbody`,
    )
    await writeFile(
      join(root, 'Notes', 'Alien.md'),
      `---\nID: 01KVGMT8BFT350FZZXAMG1QDTB\n<Projects>:\n  - Pommora\n---\nbody`,
    )
    const { unlinkContextKey } = await import('./contextCascade')
    const r = await unlinkContextKey(root, 'Projects', 'ctx_projects')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const { captured, refused } = r.value
    expect(refused).toEqual([join(root, 'Notes', 'Alien.md')])
    expect((await fmOf(join(root, 'Notes', 'Alien.md')))['<Projects>']).toEqual(['Pommora'])
    // Captures discriminate by id key: the ID page, the id-less legacy page (honest, unrestorable), and the Space sidecar.
    expect(captured).toContainEqual({ id: PAGE_C, kind: 'page', values: ['Pommora'] })
    expect(captured).toContainEqual({ kind: 'page', values: ['Pommora'] })
    expect(captured).toContainEqual({ id: 'sp-cs', kind: 'space', values: ['Pommora'] })
    expect(captured).toHaveLength(3)
  })

  it('a sweep that misses a member puts each Space back, and the held tree follows the rollback', async () => {
    await refreshTree(root)
    const original = sweepSpy.getMockImplementation()
    sweepSpy.mockImplementationOnce(async (...args) => {
      const swept = await original!(...args)
      return { ...swept, skipped: [join(root, 'Notes', 'Gone.md')] }
    })
    const { unlinkSpaceValue } = await import('./contextCascade')
    await expect(unlinkSpaceValue(root, 'Projects', 'Pommora')).rejects.toThrow()
    expect((await readJsonAt(csSidecar()))['<Projects>']).toEqual(['Pommora'])
    const rel = `${relative(root, contextsDir(root))}/Classes/CS 161`
    const held = heldTreeOf(root)
    expect(held && spaceAt(held, rel)).toEqual(spaceAt(await readNexus(root), rel))
  })

  it('unlinkSpaceValue captures the removed title per root; zero matches is an empty list', async () => {
    const { unlinkSpaceValue } = await import('./contextCascade')
    const r = await unlinkSpaceValue(root, 'Projects', 'Pommora')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.captured).toContainEqual({ kind: 'page', values: ['Pommora'] })
    expect(r.value.captured).toContainEqual({ id: 'sp-cs', kind: 'space', values: ['Pommora'] })
    expect(r.value.captured).toHaveLength(2)

    const again = await unlinkSpaceValue(root, 'Projects', 'Pommora')
    expect(again.ok && again.value.captured).toEqual([])
  })
})

describe('the Context cascades and $order', () => {
  const pomSidecar = () => join(contextsDir(root), 'Projects', 'Pommora', '_space.json')

  it('a rename leaves the order of a Space that lists the Context untouched', async () => {
    const seeded = JSON.stringify({ id: 'sp-pom', $order: ['ctxC', 'ctx_projects'] })
    await writeFile(pomSidecar(), seeded)
    expect((await renameContextOp(root, 'ctx_projects', 'Ventures')).ok).toBe(true)
    const pom = join(contextsDir(root), 'Ventures', 'Pommora', '_space.json')
    expect(await readFile(pom, 'utf8')).toBe(seeded)
  })

  it('a delete drops the id and captures nothing for a Space that only listed it', async () => {
    await writeFile(pomSidecar(), JSON.stringify({ id: 'sp-pom', $order: ['ctx_projects'] }))
    const r = await unlinkContextKey(root, 'Projects', 'ctx_projects')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const pom = await readJsonAt(pomSidecar())
    expect('$order' in pom).toBe(false)
    expect(r.value.captured.some((c) => c.id === 'sp-pom')).toBe(false)
  })
})

describe('a delete sweep never strips a passenger', () => {
  const pomSidecar = () => join(contextsDir(root), 'Projects', 'Pommora', '_space.json')

  it('roots under the deleted Context keep their keys; outside roots still lose them', async () => {
    await writeFile(pomSidecar(), JSON.stringify({ id: 'sp-pom', '<Projects>': ['Sapphire'] }))
    const { unlinkContextKey } = await import('./contextCascade')
    const r = await unlinkContextKey(
      root,
      'Projects',
      'ctx_projects',
      join(contextsDir(root), 'Projects'),
    )
    expect(r.ok).toBe(true)
    const pom = await readJsonAt(pomSidecar())
    expect(pom['<Projects>']).toEqual(['Sapphire'])
    expect('<Projects>' in (await fmOf(page()))).toBe(false)
    expect('<Projects>' in (await readJsonAt(csSidecar()))).toBe(false)
  })

  it('the rename cascade still reaches inside its own Context — the skip is the delete’s alone', async () => {
    await writeFile(pomSidecar(), JSON.stringify({ id: 'sp-pom', '<Projects>': ['Sapphire'] }))
    const r = await renameContextOp(root, 'ctx_projects', 'Ventures')
    expect(r.ok).toBe(true)
    const pom = await readJsonAt(join(contextsDir(root), 'Ventures', 'Pommora', '_space.json'))
    expect(pom['<Ventures>']).toEqual(['Sapphire'])
    expect('<Projects>' in pom).toBe(false)
  })
})

describe('replayPendingRename across crash windows', () => {
  it('finishes a rename crashed after its title commit: the folder moves and every holder takes the new key', async () => {
    // Crash simulation: note written and the title committed, then death — the folder and every file still on the old title.
    await writeJournal(root, {
      contextId: 'ctx_projects',
      oldTitle: 'Projects',
      newTitle: 'Ventures',
    })
    await retitle('Ventures')
    await replayPendingRename(root)
    expect(await pathExists(join(contextsDir(root), 'Ventures', 'Pommora'))).toBe(true)
    expect((await fmOf(page()))['<Ventures>']).toEqual(['Pommora'])
    expect(await regTitle('ctx_projects')).toBe('Ventures')
    expect(await readJournal(root)).toBeNull()
  })

  it('is idempotent — replaying twice equals once', async () => {
    await writeJournal(root, {
      contextId: 'ctx_projects',
      oldTitle: 'Projects',
      newTitle: 'Ventures',
    })
    await replayPendingRename(root)
    await replayPendingRename(root)
    expect((await fmOf(page()))['<Ventures>']).toEqual(['Pommora'])
    expect(await regTitle('ctx_projects')).toBe('Ventures')
    expect(await readJournal(root)).toBeNull()
  })

  it('discards a journal whose registry mapping no longer holds', async () => {
    await writeJournal(root, {
      contextId: 'ctx_projects',
      oldTitle: 'SomethingElse',
      newTitle: 'Ventures',
    })
    await replayPendingRename(root)
    expect((await fmOf(page()))['<Projects>']).toEqual(['Pommora'])
    expect(await regTitle('ctx_projects')).toBe('Projects')
    expect(await readJournal(root)).toBeNull()
  })

  it('discards a space journal whose freed old title was re-minted (never hijacks)', async () => {
    // sp-pom already renamed to "Pommora 2"; a NEW space claimed "Pommora" since.
    await rm(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
    await mkdir(join(contextsDir(root), 'Projects', 'Pommora 2'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Pommora 2', '_space.json'),
      JSON.stringify({ id: 'sp-pom' }),
    )
    await mkdir(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Pommora', '_space.json'),
      JSON.stringify({ id: 'sp-new' }),
    )
    await writeJournal(root, {
      contextId: 'ctx_projects',
      spaceId: 'sp-pom',
      oldTitle: 'Pommora',
      newTitle: 'Pommora 2',
    })
    await replayPendingRename(root)
    expect((await fmOf(page()))['<Projects>']).toEqual(['Pommora'])
    expect(await readJournal(root)).toBeNull()
  })

  it('completes a space rename crashed before the cascade', async () => {
    await rm(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
    await mkdir(join(contextsDir(root), 'Projects', 'Pommora 2'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Pommora 2', '_space.json'),
      JSON.stringify({ id: 'sp-pom' }),
    )
    await writeJournal(root, {
      contextId: 'ctx_projects',
      spaceId: 'sp-pom',
      oldTitle: 'Pommora',
      newTitle: 'Pommora 2',
    })
    await replayPendingRename(root)
    expect((await fmOf(page()))['<Projects>']).toEqual(['Pommora 2'])
    expect(await readJournal(root)).toBeNull()
  })

  const ventures = {
    contextId: 'ctx_projects',
    oldTitle: 'Projects',
    newTitle: 'Ventures',
  }

  it('an unreadable registry holds the journal and leaves every page as it was', async () => {
    await writeJournal(root, ventures)
    const before = await readFile(page(), 'utf8')
    await rm(contextsRegistryFile(root))
    await mkdir(contextsRegistryFile(root))
    await replayPendingRename(root)
    expect(await readFile(page(), 'utf8')).toBe(before)
    expect(await readJournal(root)).toEqual(ventures)
  })

  it('an absent registry clears the journal', async () => {
    await writeJournal(root, ventures)
    await rm(contextsRegistryFile(root))
    await replayPendingRename(root)
    expect(await readJournal(root)).toBeNull()
  })

  it('a space journal holds while one of its titles cannot be read', async () => {
    const renamed = join(contextsDir(root), 'Projects', 'Pommora 2', '_space.json')
    await mkdir(renamed, { recursive: true })
    const j = {
      contextId: 'ctx_projects',
      spaceId: 'sp-pom',
      oldTitle: 'Pommora',
      newTitle: 'Pommora 2',
    }
    await writeJournal(root, j)
    await replayPendingRename(root)
    expect((await fmOf(page()))['<Projects>']).toEqual(['Pommora'])
    expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora', '_space.json'))).toBe(
      true,
    )
    expect(await readJournal(root)).toEqual(j)
  })
})

afterEach(async () => {
  const held = await readJournal(root)
  if (held) await clearJournal(root, held).catch(() => {})
})

describe('the journal slot law', () => {
  it('a stranded record survives a later write and a stranger clear; its own clear lands', async () => {
    const owed = {
      contextId: 'ctx_projects',
      oldTitle: 'Projects',
      newTitle: 'Projects 2',
    }
    await writeJournal(root, owed)
    const stranger = { contextId: 'ctxC', oldTitle: 'Classes', newTitle: 'Classes 2' }
    await writeJournal(root, stranger)
    expect((await readJournal(root))?.contextId).toBe('ctx_projects')
    await clearJournal(root, stranger)
    expect(await readJournal(root)).not.toBeNull()
    await clearJournal(root, owed)
    expect(await readJournal(root)).toBeNull()
  })

  it('a newer rename of the same entity supersedes the stranded record', async () => {
    await writeJournal(root, {
      contextId: 'ctx_projects',
      oldTitle: 'Projects',
      newTitle: 'Work',
    })
    // The newer intent must displace the abandoned one, or the next open's replay re-applies "Projects → Work" over the user's choice.
    await writeJournal(root, {
      contextId: 'ctx_projects',
      oldTitle: 'Work',
      newTitle: 'Projects',
    })
    expect((await readJournal(root))?.newTitle).toBe('Projects')
  })

  it('a rename-back after a skip leaves nothing for the replay to revert', async () => {
    // Strand a record by hand (the shape a skipped sweep leaves), then run the counter-rename end to end.
    await renameContextOp(root, 'ctx_projects', 'Work')
    await writeJournal(root, {
      contextId: 'ctx_projects',
      oldTitle: 'Projects',
      newTitle: 'Work',
    })
    expect((await renameContextOp(root, 'ctx_projects', 'Projects')).ok).toBe(true)
    expect(await readJournal(root)).toBeNull()
    await replayPendingRename(root)
    expect(await regTitle('ctx_projects')).toBe('Projects')
    expect((await fmOf(page()))['<Projects>']).toBeDefined()
  })
})

describe('neither clearing a value nor renaming a key writes a modified_at', () => {
  it('unlinkSpaceValue strips the value and nothing else', async () => {
    const { unlinkSpaceValue } = await import('./contextCascade')
    expect((await unlinkSpaceValue(root, 'Projects', 'Pommora')).ok).toBe(true)
    const fm = await fmOf(page())
    expect(fm['<Projects>']).toBeUndefined()
    expect(fm.id).toBe('p1')
    expect('modified_at' in fm).toBe(false)
  })

  it('a key-only rename moves the key and nothing else', async () => {
    const { renameContextOp } = await import('./contextCascade')
    const r = await renameContextOp(root, 'ctx_projects', 'Ventures')
    expect(r.ok).toBe(true)
    const fm = await fmOf(page())
    expect(fm['<Ventures>']).toBeDefined()
    expect('modified_at' in fm).toBe(false)
  })
})
