import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import {
  setCollectionOrder,
  setSpaceOrder,
  setContainerOrder,
  setChildOrder,
  setPanelContextOrder,
} from './reorder'
import { createFolderEntity } from './folderEntity'
import { readSidecar } from '../Files/sidecar'
import { pageCollectionSidecar, pageSetSidecar } from './schemas'
import { nexusDir, nexusConfig, NEXUS_CONFIG_FILES } from '../Paths/paths'

let root: string
beforeEach(async () => {
  root = tempRoot('pom-reorder-')
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

async function readState(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(nexusConfig(root, NEXUS_CONFIG_FILES.state), 'utf8'))
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

  it('never persists adopted- placeholder ids', async () => {
    await setCollectionOrder(root, ['01ABC', 'adopted-deadbeef', '01XYZ'])
    expect((await readState()).order).toEqual({ collections: ['01ABC', '01XYZ'] })
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

  it('fails against an unreadable state.json and leaves it byte-identical', async () => {
    const statePath = nexusConfig(root, NEXUS_CONFIG_FILES.state)
    await mkdir(nexusDir(root), { recursive: true })
    await writeFile(statePath, '{ corrupt', 'utf8')
    const r = await setCollectionOrder(root, ['a'])
    expect(r.ok).toBe(false)
    expect(await readFile(statePath, 'utf8')).toBe('{ corrupt')
  })
})

describe('setContainerOrder', () => {
  it('persists page_order to a container sidecar, preserving other keys', async () => {
    const c = await createFolderEntity(root, 'collection', 'Notes', { icon: 'box' })
    if (!c.ok) throw new Error('setup failed')
    const r = await setContainerOrder(
      c.value.path,
      'collection',
      pageCollectionSidecar,
      'page_order',
      ['p2', 'p1'],
    )
    expect(r.ok).toBe(true)
    expect(await readSidecar(c.value.path, 'collection', pageCollectionSidecar)).toMatchObject({
      id: c.value.id,
      icon: 'box',
      page_order: ['p2', 'p1'],
    })
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

  it('strips adopted- placeholder ids before writing', async () => {
    const c = await createFolderEntity(root, 'collection', 'Notes')
    if (!c.ok) throw new Error('setup failed')
    await setChildOrder(c.value.path, 'set_order', ['s1', 'adopted-cafe', 's2'])
    expect(await readSidecar(c.value.path, 'collection', pageCollectionSidecar)).toMatchObject({
      set_order: ['s1', 's2'],
    })
  })
})
