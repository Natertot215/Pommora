import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { splitFrontmatter } from '../Files/pageFile'
import { rm, mkdir, writeFile, readFile, readdir } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { readJsonAt, tempRoot } from '../Testing/hostFs'
import {
  createContextGroup,
  createSpace,
  setPageContext,
  setSpaceColor,
  setSpaceRowOrder,
} from './contextWrite'
import { newId } from '../Nexus/ids'
import { rawLayoutSchema } from '../Tiles/tiles'
import { readTileDocAt } from '../Tiles/tileDoc'
import { contextsRegistryFile, contextsDir, nexusDir } from '../Paths/paths'
import type { ContextsRegistry } from './contexts'
import { handleMutate } from '../Nexus/mutate'
import { closeSession, openSession } from '../Nexus/session'
import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
import { createFolderEntity } from '../Nexus/folderEntity'
import { createTestPage } from '../Testing/createTestPage'
import { unsweptLine } from '../Properties/governedSweep'
import type { TrashDeps } from '../Trash/bundle'
import { createProperty } from '../Properties/registryProperty'
import { readRegistry } from '../Properties/propertiesRegistry'

let root: string
beforeEach(async () => {
  root = tempRoot('pom-ctxwrite-')
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
  await writeFile(
    join(contextsDir(root), 'Classes', 'CS 161', '_space.json'),
    JSON.stringify({ id: 'sp-cs' }),
  )
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('createContextGroup', () => {
  it('appends a ULID entry and mkdirs the context folder', async () => {
    const id = newId()
    const r = await createContextGroup(root, 'Clients', id)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const reg = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
    const entry = reg.contexts.find((c) => c.title === 'Clients')
    expect(entry!.id).toBe(id)
    expect(entry!.singular).toBeUndefined()
    const entries = await readdir(join(contextsDir(root), 'Clients'))
    expect(entries).toEqual([])
  })

  it('disambiguates a taken title, and accepts one carrying a sigil glyph', async () => {
    const dup = await createContextGroup(root, 'Projects', newId())
    expect(dup.ok).toBe(true)
    if (dup.ok) expect(dup.value.path).toBe('.nexus/contexts/Projects (2)')
    // The key is stripped positionally, so a glyph in the title round-trips — no ban needed.
    const glyph = await createContextGroup(root, 'No[pe]', newId())
    expect(glyph.ok).toBe(true)
  })

  it('uniqueness folds case — a case-variant twin would share one folder', async () => {
    const dup = await createContextGroup(root, 'projects', newId())
    expect(dup.ok).toBe(true)
    if (dup.ok) expect(dup.value.path).toBe('.nexus/contexts/projects (2)')
  })

  it('refuses any title carrying a period — a dotted folder reads as a file and can shadow a config leaf', async () => {
    for (const name of ['contexts.json', 'Contexts.JSON', 'Q3.2025']) {
      const r = await createContextGroup(root, name, newId())
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('invalid-name')
    }
  })
})

describe('createSpace', () => {
  it('creates folder + sidecar (no icon, no color) seeded with the 2×2 tile doc', async () => {
    const r = await createSpace(root, 'ctx_projects', 'Sapphire', newId())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.path).toBe('.nexus/contexts/Projects/Sapphire')
    const sc = await readJsonAt(join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'))
    expect(typeof sc.id).toBe('string')
    expect(sc.icon).toBeUndefined()
    expect(sc.$color).toBeUndefined()
    expect(sc.tiles).toBeUndefined()
    const read = await readTileDocAt(join(contextsDir(root), 'Projects', 'Sapphire'))
    if (!read.ok) throw new Error(read.error.message)
    const doc = read.value
    expect(doc.tiles).toHaveLength(4)
    expect((doc.tiles as { type: string }[]).map((b) => b.type)).toEqual(Array(4).fill('markdown'))
    const layout = rawLayoutSchema.parse(doc.layout)
    expect(layout.bands).toHaveLength(2)
    const files = await readdir(join(contextsDir(root), 'Projects', 'Sapphire'))
    expect(files.filter((f) => f.endsWith('.md'))).toHaveLength(4)
  })

  it('fails on an unknown context id', async () => {
    const r = await createSpace(root, 'nope', 'X', newId())
    expect(r.ok).toBe(false)
  })
})

describe('setPageContext', () => {
  const page = () => join(root, 'Notes', 'A.md')
  beforeEach(async () => {
    await mkdir(join(root, 'Notes'), { recursive: true })
  })

  it('writes the wrapped key with titles resolved from ids (H-1)', async () => {
    await writeFile(page(), '---\nid: p1\n---\nbody')
    const r = await setPageContext(page(), root, 'ctx_projects', ['sp-pom'])
    expect(r.ok).toBe(true)
    const content = await readFile(page(), 'utf8')
    expect(content).toContain('<Projects>:')
    expect(splitFrontmatter(content)['<Projects>']).toEqual(['Pommora'])
    expect(content).toContain('body')
  })

  it('clears the key entirely on an empty list (A-5)', async () => {
    await writeFile(page(), '---\nid: p1\n<Projects>:\n  - Pommora\n---\nbody')
    await setPageContext(page(), root, 'ctx_projects', [])
    const fm = splitFrontmatter(await readFile(page(), 'utf8'))
    expect('<Projects>' in fm).toBe(false)
  })

  it('reconciles sibling keys in place (D-9a/H-5)', async () => {
    await writeFile(
      page(),
      '---\nid: p1\n<Projects>:\n  - pommora\n<Classes>:\n  - cs 161\n  - Bogus\n---\nbody',
    )
    const r = await setPageContext(page(), root, 'ctxC', ['sp-cs'])
    expect(r.ok).toBe(true)
    const fm = splitFrontmatter(await readFile(page(), 'utf8'))
    expect(fm['<Classes>']).toEqual(['CS 161'])
    expect(fm['<Projects>']).toEqual(['Pommora'])
  })

  it('fails on an unknown space id without writing', async () => {
    await writeFile(page(), '---\nid: p1\n---\nbody')
    const before = await readFile(page(), 'utf8')
    const r = await setPageContext(page(), root, 'ctx_projects', ['nope'])
    expect(r.ok).toBe(false)
    expect(await readFile(page(), 'utf8')).toBe(before)
  })
})

describe('setContext reads the held tree', () => {
  const deps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }
  const sidecarOf = (context: string, space: string): string =>
    join(contextsDir(root), context, space, '_space.json')
  const rel = (abs: string): string => abs.slice(root.length + 1)
  const setContext = (path: string, contextId: string, spaceIds: string[]) =>
    handleMutate(root, { op: 'setContext', path, contextId, spaceIds }, deps)
  const link = (contextId: string, spaceIds: string[]) =>
    setContext('.nexus/contexts/Projects/Pommora', contextId, spaceIds)

  beforeEach(async () => {
    await writeFile(
      join(nexusDir(root), 'nexus.json'),
      JSON.stringify({ id: 'nx', createdAt: 'x' }),
    )
    await openSession(root)
  })
  afterEach(() => {
    dropLiveTree()
    closeSession()
  })

  it('refuses a tag edit on a Context holding an unreadable Space and lands one on another', async () => {
    await mkdir(join(contextsDir(root), 'Classes', 'Broken'), { recursive: true })
    await writeFile(sidecarOf('Classes', 'Broken'), '{corrupt')
    const col = await createFolderEntity(root, 'collection', 'Notes', newId())
    if (!col.ok) throw new Error('setup')
    const made = await createTestPage(col.value.path, 'A', { body: 'b' })
    if (!made.ok) throw new Error('setup')
    const file = made.value.path
    const id = splitFrontmatter(await readFile(file, 'utf8')).ID
    await writeFile(
      file,
      `---\nID: ${id}\n<Classes>:\n  - CS 161\n<Projects>:\n  - Pommora\n---\nb\n`,
    )
    await refreshTree(root)
    const before = await readFile(file, 'utf8')
    expect((await setContext(rel(file), 'ctxC', [])).ok).toBe(false)
    expect(await readFile(file, 'utf8')).toBe(before)
    expect((await setContext(rel(file), 'ctx_projects', [])).ok).toBe(true)
    const fm = splitFrontmatter(await readFile(file, 'utf8'))
    expect('<Projects>' in fm).toBe(false)
    expect(fm['<Classes>']).toEqual(['CS 161'])
  })

  it('a Space link edit with one far Space unwritable links the rest and answers the line for one file', async () => {
    for (const [name, id] of [
      ['Athena', 'sp-ath'],
      ['Sapphire', 'sp-sap'],
    ]) {
      await mkdir(join(contextsDir(root), 'Projects', name), { recursive: true })
      await writeFile(sidecarOf('Projects', name), JSON.stringify({ id }))
    }
    await refreshTree(root)
    await writeFile(sidecarOf('Projects', 'Sapphire'), '{corrupt')
    const r = await setContext('.nexus/contexts/Projects/Pommora', 'ctx_projects', [
      'sp-ath',
      'sp-sap',
    ])
    expect(r).toEqual({
      ok: true,
      value: { cascade: { pages: [], hosts: [], warning: unsweptLine(1) } },
    })
    expect((await readJsonAt(sidecarOf('Projects', 'Pommora')))['<Projects>']).toEqual([
      'Athena',
      'Sapphire',
    ])
    expect((await readJsonAt(sidecarOf('Projects', 'Athena')))['<Projects>']).toEqual(['Pommora'])
    expect(await readFile(sidecarOf('Projects', 'Sapphire'), 'utf8')).toBe('{corrupt')
  })

  it('a Space link edit whose own sidecar is unwritable still adopts the option a far Space’s write found', async () => {
    const tags = await createProperty(root, {
      id: '',
      name: 'Tags',
      type: 'multiSelect',
      select_options: [{ value: 'alpha' }],
    })
    if (!tags.ok) throw new Error('setup')
    await mkdir(join(contextsDir(root), 'Projects', 'Athena'), { recursive: true })
    await writeFile(
      sidecarOf('Projects', 'Athena'),
      JSON.stringify({ id: 'sp-ath', Tags: ['zeta'] }),
    )
    await refreshTree(root)
    await writeFile(sidecarOf('Projects', 'Pommora'), '{corrupt')
    expect((await link('ctx_projects', ['sp-ath'])).ok).toBe(false)
    expect((await readJsonAt(sidecarOf('Projects', 'Athena')))['<Projects>']).toEqual(['Pommora'])
    const options = (await readRegistry(root)).defs[tags.value.id].select_options
    expect(options?.map((o) => o.value)).toEqual(['alpha', 'zeta'])
  })

  describe('a Space’s links (G-1, cross-context)', () => {
    it('tags a Space into a different Context through its own sidecar', async () => {
      const r = await link('ctxC', ['sp-cs'])
      expect(r.ok).toBe(true)
      const sc = await readJsonAt(join(contextsDir(root), 'Projects', 'Pommora', '_space.json'))
      expect(sc['<Classes>']).toEqual(['CS 161'])
      expect(sc.id).toBe('sp-pom')
      expect('modified_at' in sc).toBe(false)
    })

    it('repairs a near-miss sibling key on the sidecar in the same write', async () => {
      const path = join(contextsDir(root), 'Projects', 'Pommora', '_space.json')
      await writeFile(path, JSON.stringify({ id: 'sp-pom', '<Classes>': ['cs 161'] }))
      const r = await link('ctx_projects', [])
      expect(r.ok).toBe(true)
      expect((await readJsonAt(path))['<Classes>']).toEqual(['CS 161'])
    })

    const pomFile = (): string => join(contextsDir(root), 'Projects', 'Pommora', '_space.json')
    const csFile = (): string => join(contextsDir(root), 'Classes', 'CS 161', '_space.json')

    it('writes the pair onto both files', async () => {
      const r = await link('ctxC', ['sp-cs'])
      expect(r.ok).toBe(true)
      expect((await readJsonAt(pomFile()))['<Classes>']).toEqual(['CS 161'])
      expect((await readJsonAt(csFile()))['<Projects>']).toEqual(['Pommora'])
    })

    it('writes the pair under one key when both Spaces share a Context', async () => {
      const athena = join(contextsDir(root), 'Projects', 'Athena')
      await mkdir(athena, { recursive: true })
      await writeFile(join(athena, '_space.json'), JSON.stringify({ id: 'sp-ath' }))
      await refreshTree(root)
      const r = await link('ctx_projects', ['sp-ath'])
      expect(r.ok).toBe(true)
      expect((await readJsonAt(pomFile()))['<Projects>']).toEqual(['Athena'])
      expect((await readJsonAt(join(athena, '_space.json')))['<Projects>']).toEqual(['Pommora'])
    })

    it('strips the pair from both files, leaving no emptied array', async () => {
      expect((await link('ctxC', ['sp-cs'])).ok).toBe(true)
      expect((await link('ctxC', [])).ok).toBe(true)
      expect('<Classes>' in (await readJsonAt(pomFile()))).toBe(false)
      expect('<Projects>' in (await readJsonAt(csFile()))).toBe(false)
    })

    it('strips a link whose only half is far (C-6)', async () => {
      await writeFile(csFile(), JSON.stringify({ id: 'sp-cs', '<Projects>': ['Pommora'] }))
      const r = await link('ctxC', [])
      expect(r.ok).toBe(true)
      expect('<Projects>' in (await readJsonAt(csFile()))).toBe(false)
    })

    it('completes a kept link’s missing half and leaves the far file untouched (C-5)', async () => {
      await writeFile(csFile(), JSON.stringify({ id: 'sp-cs', '<Projects>': ['Pommora'] }))
      const before = await readFile(csFile(), 'utf8')
      const r = await link('ctxC', ['sp-cs'])
      expect(r.ok).toBe(true)
      expect((await readJsonAt(pomFile()))['<Classes>']).toEqual(['CS 161'])
      expect(await readFile(csFile(), 'utf8')).toBe(before)
    })

    it('keeps an element it can’t read on the far half, linking and unlinking around it', async () => {
      await writeFile(csFile(), JSON.stringify({ id: 'sp-cs', '<Projects>': [7] }))
      expect((await link('ctxC', ['sp-cs'])).ok).toBe(true)
      expect((await readJsonAt(csFile()))['<Projects>']).toEqual([7, 'Pommora'])
      expect((await link('ctxC', [])).ok).toBe(true)
      expect((await readJsonAt(csFile()))['<Projects>']).toEqual([7])
    })

    it('refuses a self-link and writes nothing', async () => {
      const before = await readFile(pomFile(), 'utf8')
      const r = await link('ctx_projects', ['sp-pom'])
      expect(r.ok).toBe(false)
      expect(await readFile(pomFile(), 'utf8')).toBe(before)
    })

    it('leaves an unresolvable sibling key verbatim (B-8)', async () => {
      await writeFile(pomFile(), JSON.stringify({ id: 'sp-pom', '<Classes>': ['Vanished'] }))
      const r = await link('ctx_projects', [])
      expect(r.ok).toBe(true)
      expect((await readJsonAt(pomFile()))['<Classes>']).toEqual(['Vanished'])
    })
  })
})

describe('setSpaceRowOrder', () => {
  const dir = (): string => join(contextsDir(root), 'Projects', 'Pommora')
  const sidecar = (): Promise<Record<string, unknown>> => readJsonAt(join(dir(), '_space.json'))

  it('writes both lists under $order, replaces them wholesale, and removes the key when both empty', async () => {
    expect((await setSpaceRowOrder(dir(), ['ctxC'], ['prop_a'])).ok).toBe(true)
    expect((await sidecar()).$order).toEqual({ contexts: ['ctxC'], properties: ['prop_a'] })
    expect((await setSpaceRowOrder(dir(), ['ctx_projects'], [])).ok).toBe(true)
    expect((await sidecar()).$order).toEqual({ contexts: ['ctx_projects'], properties: [] })
    expect((await setSpaceRowOrder(dir(), [], [])).ok).toBe(true)
    expect('$order' in (await sidecar())).toBe(false)
  })
})

describe('setSpaceColor', () => {
  const sidecar = (): Promise<Record<string, unknown>> =>
    readJsonAt(join(contextsDir(root), 'Projects', 'Pommora', '_space.json'))

  it('accepts a legacy anchor name, clears on undefined, rejects a non-color', async () => {
    expect((await setSpaceColor(root, 'sp-pom', 'cyan')).ok).toBe(true)
    expect((await sidecar()).$color).toBe('cyan')
    expect((await setSpaceColor(root, 'sp-pom', undefined)).ok).toBe(true)
    expect('$color' in (await sidecar())).toBe(false)
    expect((await setSpaceColor(root, 'sp-pom', 'magenta')).ok).toBe(false)
  })

  it('writes a ramp cell through verbatim', async () => {
    expect((await setSpaceColor(root, 'sp-pom', 'blue-6')).ok).toBe(true)
    expect((await sidecar()).$color).toBe('blue-6')
    expect('modified_at' in (await sidecar())).toBe(false)
  })

  it('refuses keys outside the grammar', async () => {
    for (const bad of ['blue-8', 'chartreuse', '']) {
      expect((await setSpaceColor(root, 'sp-pom', bad)).ok).toBe(false)
    }
  })
})
