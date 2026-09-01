// Every writer of a container's sidecar rewrites that file WHOLE, so they all have to serialize
// on one key: the sidecar's own path. A read-merge-write that takes any other key races its
// siblings and silently drops whatever they just set.
//
// The page half is the same law across a path change: a relocate takes the SOURCE page's lock,
// so a body write already in flight lands first, and one queued behind the move finds its path
// gone and fails — rather than re-creating the vacated file around its stale content.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { SavedView } from '@shared/views'
import type { PropertyDefinition } from '@shared/properties'
import { serializeOnFile } from '../IO/fileLock'
import { createFolderEntity } from './folderEntity'
import { createPage, updatePageBody, renamePage, updatePageProperty } from './page'
import { setChildOrder } from './reorder'
import { saveView } from './views'
import { setContainerConfig } from './containerConfig'
import { readSidecar } from '../sidecarIO'
import { pageCollectionSidecar } from '@shared/schemas'

const view = (id: string): SavedView => ({
  id,
  name: 'V',
  type: 'table',
  property_order: [],
  hidden_properties: [],
})

let root: string
let folder: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-sidecar-race-'))
  const c = await createFolderEntity(root, 'collection', 'Notes')
  if (!c.ok) throw new Error('setup failed')
  folder = c.value.path
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('concurrent sidecar writers', () => {
  it('an order write and a view save both survive each other', async () => {
    await Promise.all([
      setChildOrder(folder, 'page_order', ['p1', 'p2']),
      saveView(folder, 'collection', view('view_1')),
    ])
    const sidecar = await readSidecar(folder, 'collection', pageCollectionSidecar)
    expect(sidecar?.page_order).toEqual(['p1', 'p2'])
    expect((sidecar?.views as SavedView[] | undefined)?.map((v) => v.id)).toEqual(['view_1'])
  })

  it('three different writers land together without dropping a key', async () => {
    await Promise.all([
      setChildOrder(folder, 'set_order', ['s1']),
      saveView(folder, 'collection', view('view_1')),
      setContainerConfig(folder, 'collection', { view_button: 'labeled' }),
    ])
    const sidecar = await readSidecar(folder, 'collection', pageCollectionSidecar)
    expect(sidecar?.set_order).toEqual(['s1'])
    expect((sidecar?.views as SavedView[] | undefined)?.map((v) => v.id)).toEqual(['view_1'])
    expect(sidecar?.view_button).toBe('labeled')
    // The sidecar's own identity is never a casualty of a merge that lost its base.
    expect(typeof sidecar?.id).toBe('string')
  })

  it('a later view save still sees the order an earlier one persisted', async () => {
    await setChildOrder(folder, 'page_order', ['p1'])
    await saveView(folder, 'collection', view('view_1'))
    await setChildOrder(folder, 'page_order', ['p1', 'p2'])
    const sidecar = await readSidecar(folder, 'collection', pageCollectionSidecar)
    expect(sidecar?.page_order).toEqual(['p1', 'p2'])
    expect((sidecar?.views as SavedView[] | undefined)?.length).toBe(1)
  })
})

describe('a value write racing a body write on one page', () => {
  // `updatePageProperty` deliberately takes no lock of its own — its callers need a wider span —
  // so this pins the law at the shape both of them use.
  it('keeps both, since each caller writes under the page key', async () => {
    const p = await createPage(folder, 'Note', { body: 'first' })
    if (!p.ok) throw new Error('setup failed')
    const def: PropertyDefinition = { id: 'p1', name: 'Priority', type: 'select' }

    await Promise.all([
      updatePageBody(p.value.path, 'second'),
      serializeOnFile(p.value.path, () =>
        updatePageProperty(p.value.path, def, { kind: 'select', value: 'hi' }),
      ),
    ])

    const content = await readFile(p.value.path, 'utf8')
    expect(content).toContain('Priority')
    expect(content).toContain('second')
  })
})

describe('a rename racing the body write it interrupted', () => {
  it('leaves exactly one page — no ghost at the vacated path', async () => {
    const p = await createPage(folder, 'Old', { body: 'first' })
    if (!p.ok) throw new Error('setup failed')

    // Both dispatched before either resolves — the shape of typing, then renaming inside the
    // editor's autosave debounce.
    await Promise.all([updatePageBody(p.value.path, 'second'), renamePage(p.value.path, 'New')])

    const md = (await readdir(folder)).filter((f) => f.endsWith('.md'))
    expect(md).toEqual(['New.md'])
  })

  it('reports not-found for a body write that arrives after the rename', async () => {
    const p = await createPage(folder, 'Old', { body: 'first' })
    if (!p.ok) throw new Error('setup failed')
    const renamed = await renamePage(p.value.path, 'New')
    expect(renamed.ok).toBe(true)

    const late = await updatePageBody(p.value.path, 'second')
    expect(late.ok).toBe(false)
    expect((await readdir(folder)).filter((f) => f.endsWith('.md'))).toEqual(['New.md'])
  })
})
