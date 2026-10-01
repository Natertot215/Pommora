import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, readFile, readdir, writeFile, mkdir } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot, readJsonAt } from '../Testing/hostFs'
import {
  dropFromChildOrder,
  dropSpaceOrder,
  setCollectionOrder,
  setSpaceOrder,
  setChildOrder,
  setPanelContextOrder,
} from './reorder'
import { pathExists } from '../Files/atomicWrite'
import { createFolderEntity } from './folderEntity'
import { readSidecar } from '../Files/sidecar'
import { pageCollectionSidecar, pageSetSidecar } from './schemas'
import { nexusDir, nexusConfig, sidecarPath } from '../Paths/paths'
import { NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'

let root: string
beforeEach(async () => {
  root = tempRoot('pom-reorder-')
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

async function readState(): Promise<Record<string, unknown>> {
  return await readJsonAt(nexusConfig(root, NEXUS_CONFIG_FILES.state))
}

describe('setCollectionOrder', () => {
  it('persists the Collection order to .nexus/state.json (creating .nexus)', async () => {
    await setCollectionOrder(root, ['b', 'a', 'c'])
    expect((await readState()).order).toEqual({ collections: ['b', 'a', 'c'] })
  })

  it('does not clobber the space orders or the navigation section (read-modify-write)', async () => {
    await mkdir(nexusDir(root), { recursive: true })
    await writeFile(
      nexusConfig(root, NEXUS_CONFIG_FILES.state),
      JSON.stringify({ navigation: { pinned: [{ kind: 'homepage' }] } }),
    )
    await setSpaceOrder(root, 'ctx_areas', ['x', 'y'])
    await setCollectionOrder(root, ['a'])
    expect(await readState()).toEqual({
      navigation: { pinned: [{ kind: 'homepage' }] },
      order: { collections: ['a'], spaces: { ctx_areas: ['x', 'y'] } },
    })
  })

  it('setSpaceOrder writes per-context entries in the spaces map', async () => {
    await setSpaceOrder(root, 'ctx_projects', ['s2', 's1'])
    await setSpaceOrder(root, 'ctxC', ['x'])
    expect((await readState()).order).toEqual({
      spaces: { ctx_projects: ['s2', 's1'], ctxC: ['x'] },
    })
  })

  it('setPanelContextOrder writes its own key beside the other two', async () => {
    await mkdir(nexusDir(root), { recursive: true })
    await writeFile(
      nexusConfig(root, NEXUS_CONFIG_FILES.state),
      JSON.stringify({ navigation: { pinned: [{ kind: 'homepage' }] } }),
    )
    await setSpaceOrder(root, 'ctx_areas', ['x', 'y'])
    await setCollectionOrder(root, ['a'])
    await setPanelContextOrder(root, ['ctxC', 'ctx_projects'])
    expect(await readState()).toEqual({
      navigation: { pinned: [{ kind: 'homepage' }] },
      order: {
        collections: ['a'],
        spaces: { ctx_areas: ['x', 'y'] },
        contexts: ['ctxC', 'ctx_projects'],
      },
    })
  })

  it('dropSpaceOrder removes the Context’s Space order and leaves the rest', async () => {
    await setSpaceOrder(root, 'ctx_areas', ['x'])
    await setSpaceOrder(root, 'ctx_projects', ['y'])
    await setPanelContextOrder(root, ['ctx_projects', 'ctx_areas'])
    await dropSpaceOrder(root, 'ctx_projects')
    expect((await readState()).order).toEqual({
      spaces: { ctx_areas: ['x'] },
      contexts: ['ctx_projects', 'ctx_areas'],
    })
  })

  it('dropSpaceOrder writes nothing when the Context has no order', async () => {
    await dropSpaceOrder(root, 'ctx_projects')
    expect(await pathExists(nexusConfig(root, NEXUS_CONFIG_FILES.state))).toBe(false)
  })

  it('moves a corrupt state.json aside and lands the order, as a navigation write does', async () => {
    const statePath = nexusConfig(root, NEXUS_CONFIG_FILES.state)
    await mkdir(nexusDir(root), { recursive: true })
    await writeFile(statePath, '{ corrupt', 'utf8')
    const r = await setCollectionOrder(root, ['a'])
    expect(r.ok).toBe(true)
    expect((await readJsonAt(statePath)).order).toEqual({ collections: ['a'] })
    const aside = (await readdir(nexusDir(root))).find((f) => f.includes('.bad-'))
    expect(await readFile(join(nexusDir(root), aside ?? ''), 'utf8')).toBe('{ corrupt')
  })
})

describe('setChildOrder', () => {
  it('detects the folder kind from its sidecar and writes page_order (a set)', async () => {
    const s = await createFolderEntity(root, 'set', 'Reading')
    if (!s.ok) throw new Error('setup failed')
    const r = await setChildOrder(s.value.path, 'page_order', ['p3', 'p1', 'p2'])
    expect(r.ok).toBe(true)
    expect(await readSidecar(s.value.path, 'set', pageSetSidecar)).toMatchObject({
      page_order: ['p3', 'p1', 'p2'],
    })
  })

  it('writes set_order to a collection sidecar', async () => {
    const c = await createFolderEntity(root, 'collection', 'Notes', { icon: 'box' })
    if (!c.ok) throw new Error('setup failed')
    const r = await setChildOrder(c.value.path, 'set_order', ['s2', 's1'])
    expect(r.ok).toBe(true)
    expect(await readSidecar(c.value.path, 'collection', pageCollectionSidecar)).toMatchObject({
      set_order: ['s2', 's1'],
    })
  })

  it('is a tolerated no-op for a folder with no recognized sidecar', async () => {
    const raw = join(root, 'Raw')
    await mkdir(raw, { recursive: true })
    expect((await setChildOrder(raw, 'page_order', ['p1'])).ok).toBe(true)
  })
})

describe('dropFromChildOrder', () => {
  it('drops the key once its last id leaves, for page and Set order alike', async () => {
    const c = await createFolderEntity(root, 'collection', 'Notes')
    if (!c.ok) throw new Error('setup failed')
    await setChildOrder(c.value.path, 'page_order', ['p1', 'p2'])
    await setChildOrder(c.value.path, 'set_order', ['s1'])
    await dropFromChildOrder(c.value.path, 'page_order', 'p1')
    await dropFromChildOrder(c.value.path, 'set_order', 's1')
    const raw = await readJsonAt(sidecarPath(c.value.path, 'collection'))
    expect(raw.page_order).toEqual(['p2'])
    expect('set_order' in raw).toBe(false)
    await dropFromChildOrder(c.value.path, 'page_order', 'p2')
    expect('page_order' in (await readJsonAt(sidecarPath(c.value.path, 'collection')))).toBe(false)
  })
})
