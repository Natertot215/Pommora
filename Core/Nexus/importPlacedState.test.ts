import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { withSidecarLock } from '../Files/sidecar'
import { installMachine, machine } from '../Platform/machine'
import { readKey, writeKey } from '../Platform/localState'
import { DEFAULT_VIEW_ID } from '../Views/views'
import { importPlacedState } from './importPlacedState'
import { dropLiveTree, refreshTree } from './liveTree'

const COL = '01KVGMT8BFP350FZZXAMG1QDS1'
const SET = '01KVGMT8BFP350FZZXAMG1QDS2'

const views = (a: string, b: string): unknown[] => [
  { id: a, name: 'Table', type: 'table', property_order: [], hidden_properties: [] },
  { id: b, name: 'Board', type: 'table', property_order: [], hidden_properties: [] },
]

describe('importPlacedState', () => {
  let real: string
  let root: string

  const sidecar = (rel: string, file: string): Promise<Record<string, unknown>> =>
    readFile(join(real, rel, file), 'utf8').then((t) => JSON.parse(t))

  const collectionJson = () => sidecar('Library', '_pagecollection.json')
  const setJson = () => sidecar(join('Library', 'Fiction'), '_pageset.json')

  beforeEach(async () => {
    real = await mkdtemp(join(tmpdir(), 'pom-import-'))
    // The root reaches the import through a symlink on purpose: an unresolved lock key would differ from the one every mutate op takes, and the refusal cases below would then prove nothing.
    root = `${real}-link`
    await symlink(real, root, 'dir')
    await mkdir(join(real, '.nexus'), { recursive: true })
    await writeFile(
      join(real, '.nexus', 'nexus.json'),
      JSON.stringify({ id: 'nx-import', createdAt: '2026' }),
    )
    await writeFile(join(real, '.nexus', 'contexts.json'), JSON.stringify({ contexts: [] }))
    await mkdir(join(real, 'Library', 'Fiction'), { recursive: true })
    await writeFile(
      join(real, 'Library', '_pagecollection.json'),
      JSON.stringify({ id: COL, views: views('view-c1', 'view-c2') }),
    )
    await writeFile(
      join(real, 'Library', 'Fiction', '_pageset.json'),
      JSON.stringify({ id: SET, views: views('view-s1', 'view-s2') }),
    )
    installStores(memoryStores().stores)
    await refreshTree(root)
  })

  afterEach(async () => {
    dropLiveTree()
    installStores(NO_STORES)
    await rm(root, { force: true })
    await rm(real, { recursive: true, force: true })
  })

  const heldFolder = (rel: string): Promise<string> => machine().realpath(join(root, rel))

  it('every chosen view lands on its own sidecar, and its row goes', async () => {
    writeKey('activeView', COL, 'view-c2')
    writeKey('activeView', SET, 'view-s2')

    expect(await importPlacedState(root)).toBe(true)

    expect((await collectionJson()).active_view).toBe('view-c2')
    expect((await setJson()).active_view).toBe('view-s2')
    expect(readKey('activeView', COL)).toBeNull()
    expect(readKey('activeView', SET)).toBeNull()

    // The second run is the idempotency proof: `false` is what keeps the caller from re-walking.
    expect(await importPlacedState(root)).toBe(false)
  })

  it('a container whose write refuses keeps its row, and the others still land', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    writeKey('activeView', COL, 'view-c2')
    writeKey('activeView', SET, 'view-s2')

    const landed = await withSidecarLock(await heldFolder(join('Library', 'Fiction')), 'set', () =>
      importPlacedState(root),
    )

    expect(landed).toBe(true)
    expect((await collectionJson()).active_view).toBe('view-c2')
    expect((await setJson()).active_view).toBeUndefined()
    expect(readKey('activeView', COL)).toBeNull()
    expect(readKey('activeView', SET)).toBe('view-s2')
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })

  it('resolves rather than throwing when every container refuses', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    writeKey('activeView', COL, 'view-c2')
    writeKey('activeView', SET, 'view-s2')

    const held = await withSidecarLock(await heldFolder('Library'), 'collection', async () =>
      withSidecarLock(await heldFolder(join('Library', 'Fiction')), 'set', () =>
        importPlacedState(root),
      ),
    )

    expect(held).toBe(false)
    expect((await collectionJson()).active_view).toBeUndefined()
    expect((await setJson()).active_view).toBeUndefined()
    expect(readKey('activeView', COL)).toBe('view-c2')
    expect(readKey('activeView', SET)).toBe('view-s2')
    logged.mockRestore()
  })

  it('a nexus with no rows at all is a no-op', async () => {
    expect(await importPlacedState(root)).toBe(false)
    expect((await collectionJson()).active_view).toBeUndefined()
    expect((await setJson()).active_view).toBeUndefined()
  })

  it('an id no container claims keeps its row — the container may be excluded, not gone', async () => {
    writeKey('activeView', '01KVGMT8BFP350FZZXAMG1QDS9', 'view-c2')

    expect(await importPlacedState(root)).toBe(false)
    expect(readKey('activeView', '01KVGMT8BFP350FZZXAMG1QDS9')).toBe('view-c2')
  })

  it('the sentinel never reaches a sidecar, and its row is spent rather than kept', async () => {
    writeKey('activeView', COL, DEFAULT_VIEW_ID)

    expect(await importPlacedState(root)).toBe(false)
    expect((await collectionJson()).active_view).toBeUndefined()
    expect(readKey('activeView', COL)).toBeNull()
  })

  const orderOf = async (
    read: () => Promise<Record<string, unknown>>,
    index: number,
  ): Promise<unknown> => ((await read()).views as { manual_order?: unknown }[])[index].manual_order

  it('every manual order lands on its own view record, and its row goes', async () => {
    writeKey('viewOrder', 'view-c1', ['page-b', 'page-a'])
    writeKey('viewOrder', 'view-s2', ['page-c'])

    expect(await importPlacedState(root)).toBe(true)

    expect(await orderOf(collectionJson, 0)).toEqual(['page-b', 'page-a'])
    expect(await orderOf(collectionJson, 1)).toBeUndefined()
    expect(await orderOf(setJson, 1)).toEqual(['page-c'])
    expect(readKey('viewOrder', 'view-c1')).toBeNull()
    expect(readKey('viewOrder', 'view-s2')).toBeNull()

    expect(await importPlacedState(root)).toBe(false)
  })

  it('a container holding both a chosen view and a manual order is written once, not twice', async () => {
    writeKey('activeView', COL, 'view-c2')
    writeKey('viewOrder', 'view-c1', ['page-b', 'page-a'])
    const base = machine()
    let writes = 0
    installMachine({
      ...base,
      writeText: (p, text) => {
        if (p.endsWith('_pagecollection.json')) writes++
        return base.writeText(p, text)
      },
    })

    try {
      expect(await importPlacedState(root)).toBe(true)
    } finally {
      installMachine(base)
    }

    expect(writes).toBe(1)
    expect((await collectionJson()).active_view).toBe('view-c2')
    expect(await orderOf(collectionJson, 0)).toEqual(['page-b', 'page-a'])
  })

  it('a view id no container claims keeps its row', async () => {
    writeKey('viewOrder', 'view-nowhere', ['page-a'])

    expect(await importPlacedState(root)).toBe(false)
    expect(readKey('viewOrder', 'view-nowhere')).toEqual(['page-a'])
  })

  it('a view record that already carries an order keeps it, and the row is consumed', async () => {
    await writeFile(
      join(real, 'Library', '_pagecollection.json'),
      JSON.stringify({
        id: COL,
        views: [
          { ...(views('view-c1', 'view-c2')[0] as object), manual_order: ['page-a'] },
          views('view-c1', 'view-c2')[1],
        ],
      }),
    )
    writeKey('viewOrder', 'view-c1', ['page-b'])

    expect(await importPlacedState(root)).toBe(true)
    expect(await orderOf(collectionJson, 0)).toEqual(['page-a'])
    expect(readKey('viewOrder', 'view-c1')).toBeNull()
  })

  it('a container whose write refuses keeps both of its rows', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    writeKey('activeView', SET, 'view-s2')
    writeKey('viewOrder', 'view-s1', ['page-a'])

    const landed = await withSidecarLock(await heldFolder(join('Library', 'Fiction')), 'set', () =>
      importPlacedState(root),
    )

    expect(landed).toBe(false)
    expect(readKey('activeView', SET)).toBe('view-s2')
    expect(readKey('viewOrder', 'view-s1')).toEqual(['page-a'])
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })

  it('a sidecar that already names a view keeps it, and the row is consumed', async () => {
    await writeFile(
      join(real, 'Library', '_pagecollection.json'),
      JSON.stringify({ id: COL, views: views('view-c1', 'view-c2'), active_view: 'view-c1' }),
    )
    writeKey('activeView', COL, 'view-c2')

    expect(await importPlacedState(root)).toBe(true)
    expect((await collectionJson()).active_view).toBe('view-c1')
    expect(readKey('activeView', COL)).toBeNull()
  })
})
