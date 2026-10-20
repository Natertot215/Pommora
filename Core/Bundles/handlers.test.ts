import { mkdir, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HostContext } from '../Contract/handlers'
import { fault, ok } from '../Contract/result'
import { dropLiveTree } from '../Nexus/liveTree'
import { tempRoot } from '../Testing/hostFs'
import { writePropertyBundle } from '../Properties/deleteProperty'

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

  it('answers an empty list for an archive id that isn’t ULID-shaped', async () => {
    expect(await bundlesHandlers['bundles:list'](ctx, { kind: 'archive', id: '../x' })).toEqual(
      ok([]),
    )
  })

  it('refuses a store it can’t read', async () => {
    for (const store of [null, { kind: 'shelf' }, { kind: 'archive' }])
      expect(await bundlesHandlers['bundles:list'](ctx, store)).toEqual(
        fault('A store is required.'),
      )
  })
})
