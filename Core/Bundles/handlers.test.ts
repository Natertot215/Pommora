import { mkdir, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HostContext } from '../Contract/handlers'
import { fault } from '../Contract/result'
import { dropLiveTree } from '../Nexus/liveTree'
import { tempRoot } from '../Testing/hostFs'
import { writePropertyBundle } from '../Properties/deleteProperty'
import { mintBundle } from './bundle'
import { writeRecord } from './record'

const { sessionRoot } = vi.hoisted(() => ({ sessionRoot: vi.fn() }))
vi.mock('../Nexus/session', () => ({ sessionRoot, adopting: () => false }))

const { bundlesHandlers } = await import('./handlers')

const ctx = {} as HostContext
let root = ''

beforeEach(async () => {
  root = tempRoot('bundle-handlers-')
  await mkdir(join(root, '.nexus'), { recursive: true })
  await writeFile(
    join(root, '.nexus', 'nexus.json'),
    JSON.stringify({ id: 'nx', createdAt: '2026' }),
  )
  sessionRoot.mockReturnValue(root)
})

afterEach(() => {
  sessionRoot.mockReset()
  dropLiveTree()
})

describe('bundles:list', () => {
  it('lists the Trash’s rows for the trash store', async () => {
    await writePropertyBundle(root, {
      entity: 'property',
      id: 'prop_x',
      def: { id: 'prop_x', label: 'Stage', key: 'Stage' },
      values: {},
    })
    const listed = await bundlesHandlers['bundles:list'](ctx, { kind: 'trash' })
    expect(listed.ok && listed.value.map((r) => [r.kind, r.title])).toEqual([['property', 'Stage']])
  })

  it('lists an Archive whose Collection id isn’t ULID-shaped', async () => {
    const store = { kind: 'archive', id: 'col-foreign' } as const
    const bundle = await mintBundle(root, store, join(root, 'Notes', 'Alpha.md'))
    await writeFile(join(bundle, 'Alpha.md'), '# Alpha\n')
    await writeRecord(bundle, { entity: 'page', parent: { kind: 'unaddressable' } })
    const listed = await bundlesHandlers['bundles:list'](ctx, store)
    expect(listed.ok && listed.value.map((r) => [r.kind, r.title])).toEqual([['page', 'Alpha']])
  })

  it('refuses an archive id that isn’t one safe path segment', async () => {
    for (const id of ['../x', 'a/b', '..', ''])
      expect(await bundlesHandlers['bundles:list'](ctx, { kind: 'archive', id })).toEqual(
        fault('A store is required.'),
      )
  })

  it('refuses a store it can’t read', async () => {
    for (const store of [null, { kind: 'shelf' }, { kind: 'archive' }])
      expect(await bundlesHandlers['bundles:list'](ctx, store)).toEqual(
        fault('A store is required.'),
      )
  })
})
