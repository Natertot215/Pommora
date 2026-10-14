import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readFile, rm } from 'node:fs/promises'
import { tempRoot } from '../Testing/hostFs'
import type { HostContext } from '../Contract/handlers'
import { NEEDS_CONFIG_PATCH } from '../Contract/validators'
import { createFolderEntity } from '../Nexus/folderEntity'
import { newId } from '../Nexus/ids'
import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
import { closeSession, openSession } from '../Nexus/session'
import { sidecarPath } from '../Paths/paths'
import { viewsHandlers } from './handlers'

const ctx = { push: () => {} } as unknown as HostContext

let root: string
let sidecar: string

beforeEach(async () => {
  root = tempRoot('pom-views-handlers-')
  const c = await createFolderEntity(root, 'collection', 'Notes', newId())
  if (!c.ok) throw new Error('setup failed')
  sidecar = sidecarPath(c.value.path, 'collection')
  await openSession(root)
  await refreshTree(root)
})

afterEach(async () => {
  closeSession()
  dropLiveTree()
  await rm(root, { recursive: true, force: true })
})

describe('container:configure', () => {
  const configure = (patch: unknown) =>
    viewsHandlers['container:configure'](ctx, 'Notes', 'collection', patch)

  it('writes a valid view_button', async () => {
    expect((await configure({ view_button: 'labeled' })).ok).toBe(true)
    expect(JSON.parse(await readFile(sidecar, 'utf8')).view_button).toBe('labeled')
  })

  it.each([
    [{ view_button: 'huge' }],
    [{}],
  ])('refuses %j and leaves the sidecar as it was', async (patch) => {
    const before = await readFile(sidecar, 'utf8')
    expect(await configure(patch)).toEqual(NEEDS_CONFIG_PATCH)
    expect(await readFile(sidecar, 'utf8')).toBe(before)
  })
})
