import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { newContentId } from '../Nexus/ids'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { memoryStores } from '../Testing/memoryStores'
import { installStores, NO_STORES } from '../Platform/stores'
import { atomicWriteFile } from '../Files/atomicWrite'
import { bodyHash } from '../Files/pageFile'
import { assetsHandlers } from '../Assets/handlers'
import { nexusHandlers } from '../Nexus/handlers'
import { dropLiveTree, heldTreeOf, refreshTree } from '../Nexus/liveTree'
import { updatePageMetadata } from '../Nexus/pageMetadata'
import { readNexus } from '../Nexus/readNexus'
import { closeSession, openSession } from '../Nexus/session'
import { stabilize } from '../Nexus/treeStabilize'
import { pagesHandlers } from '../Pages/handlers'
import { propertiesHandlers } from '../Properties/handlers'
import { settingsHandlers } from '../Settings/handlers'
import { viewsHandlers } from '../Views/handlers'
import type { Pushes } from './bridge'
import { type HostContext, withWriteRoot } from './handlers'

const PAGE = '01KVGMT8BFP350FZZXAMG1QDRA'
const OLD = '01KVGMT8BFP350FZZXAMG1QDRO'

let root: string
let outside: string
let pushes: [keyof Pushes, unknown][]
const watch = vi.fn(async () => {})
const ctx = {
  push: (channel: keyof Pushes, value: unknown) => void pushes.push([channel, value]),
  watch,
  applyZoom: async () => {},
  trashMode: async () => 'nexus',
} as unknown as HostContext

const abs = (...segs: string[]): string => join(root, ...segs)
const channels = (): (keyof Pushes)[] => pushes.map(([c]) => c)
const agrees = async (): Promise<void> => {
  const held = heldTreeOf(root)
  expect(held).not.toBeNull()
  expect(stabilize(await readNexus(root), held)).toBe(held)
}

beforeEach(async () => {
  root = tempRoot('pom-gate-')
  outside = tempRoot('pom-gate-source-')
  pushes = []
  watch.mockClear()
  installStores(memoryStores().stores)
  await mkdir(abs('.nexus'), { recursive: true })
  await writeFile(abs('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: '2026' }))
  await writeFile(
    abs('.nexus', 'settings.json'),
    JSON.stringify({ asset_directory: 'file-assets', excluded_folders: ['Archive'] }),
  )
  await writeFile(
    abs('.nexus', 'properties.json'),
    JSON.stringify({
      order: ['prop_s'],
      defs: {
        prop_s: { id: 'prop_s', name: 'Stage', type: 'select', select_options: [{ value: 'A' }] },
      },
    }),
  )
  await mkdir(abs('Notes'))
  await writeFile(
    abs('Notes', '_pagecollection.json'),
    JSON.stringify({ id: 'col-notes', properties: ['prop_s'] }),
  )
  await writeFile(abs('Notes', 'A.md'), `---\nID: ${PAGE}\nStage: A\n---\n\nalpha\n`)
  await mkdir(abs('Drafts'))
  await writeFile(abs('Drafts', '_pagecollection.json'), JSON.stringify({ id: 'col-drafts' }))
  await mkdir(abs('Archive'))
  await writeFile(abs('Archive', 'Old.md'), `---\nID: ${OLD}\n<Areas>:\n  - Work\n---\n\nold\n`)
  await updatePageMetadata(root, OLD, { icon: 'star' })
  await mkdir(abs('file-assets'))
  await openSession(root)
  await refreshTree(root)
})

afterEach(async () => {
  dropLiveTree()
  closeSession()
  installStores(NO_STORES)
  await rm(root, { recursive: true, force: true })
  await rm(outside, { recursive: true, force: true })
})

describe('the write gate settles what its handler wrote before the reply leaves', () => {
  it('a mutate create has pushed the tree by the time its reply resolves', async () => {
    const r = await nexusHandlers.mutate(ctx, {
      op: 'createPage',
      id: newContentId('page'),
      parentPath: 'Notes',
      name: 'New',
    })
    expect(r.ok).toBe(true)
    expect(channels()).toContain('nexus:changed')
    expect(
      heldTreeOf(root)
        ?.collections.find((c) => c.path === 'Notes')
        ?.pages.map((p) => p.path),
    ).toContain('Notes/New.md')
  })

  it('a handler that throws still settles what it wrote', async () => {
    const throwing = withWriteRoot(async (at: string) => {
      await atomicWriteFile(
        join(at, 'Notes', 'A.md'),
        `---\nID: ${PAGE}\nStage: A\n---\n\nedited\n`,
      )
      throw new Error('partway')
    })
    await expect(throwing(ctx)).rejects.toThrow('partway')
    expect(channels()).toContain('values:changed')
    await agrees()
  })
})

describe('one write through each channel leaves the held tree as the disk reads, and pushes what it changed', () => {
  const view = { id: 'view_new', name: 'New', type: 'table', property_order: ['_title'] }

  it.each<[string, () => unknown, (keyof Pushes)[]]>([
    [
      'views:save',
      () => viewsHandlers['views:save'](ctx, 'Notes', 'collection', view, {}),
      ['nexus:changed'],
    ],
    [
      'schema:add',
      () =>
        propertiesHandlers['schema:add'](ctx, 'Notes', {
          id: '',
          name: 'Due',
          type: 'number',
        }),
      ['nexus:changed'],
    ],
    [
      'property:rename',
      () => propertiesHandlers['property:rename'](ctx, 'prop_s', 'Phase'),
      ['nexus:changed', 'values:changed'],
    ],
    [
      'property:editOption',
      () =>
        propertiesHandlers['property:editOption'](ctx, 'prop_s', {
          op: 'recolor',
          value: 'A',
          color: 'red',
        }),
      ['nexus:changed'],
    ],
    [
      'personalization:set',
      () => settingsHandlers['personalization:set'](ctx, 'openLinksInApp', true),
      ['nexus:changed'],
    ],
    [
      'exclusions:set',
      () => settingsHandlers['exclusions:set'](ctx, ['Archive', 'Drafts']),
      ['nexus:changed'],
    ],
    ['exclusions:clear', () => settingsHandlers['exclusions:clear'](ctx), ['nexus:changed']],
    [
      'assets:adopt',
      async () => {
        const source = join(outside, 'Cover.png')
        await writeFile(source, 'bytes')
        return assetsHandlers['assets:adopt'](ctx, source, undefined)
      },
      ['assets:changed'],
    ],
    [
      'page:updateBody',
      async () => {
        const text = await readFile(abs('Notes', 'A.md'), 'utf8')
        return pagesHandlers['page:updateBody'](ctx, 'Notes/A.md', 'edited\n', bodyHash(text))
      },
      ['values:changed'],
    ],
  ])('%s', async (_channel, write, pushed) => {
    expect(await write()).toMatchObject({ ok: true })
    await agrees()
    expect(channels()).toEqual(expect.arrayContaining(pushed))
  })

  it('exclusions:set re-arms the watcher under the new scope', async () => {
    await settingsHandlers['exclusions:set'](ctx, ['Archive', 'Drafts'])
    expect(watch).toHaveBeenCalledWith(root)
    expect(heldTreeOf(root)?.collections.map((c) => c.path)).toEqual(['Notes'])
  })

  it('page:updateBody names the page body-only', async () => {
    const text = await readFile(abs('Notes', 'A.md'), 'utf8')
    await pagesHandlers['page:updateBody'](ctx, 'Notes/A.md', 'edited\n', bodyHash(text))
    expect(pushes.find(([c]) => c === 'values:changed')?.[1]).toEqual([
      { rel: 'Notes', pageIds: [PAGE], bodyOnly: [PAGE] },
    ])
  })
})
