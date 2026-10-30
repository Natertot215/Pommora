import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { chmod, rm } from 'node:fs/promises'
import { noModeBits, putJson, readJsonAt, tempRoot } from '../Testing/hostFs'
import { nexusConfig, sidecarPath } from '../Paths/paths'
import { NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'
import { createFolderEntity } from './folderEntity'
import { newId } from './ids'
import { closeSession, openSession } from './session'
import { dropLiveTree, refreshTree } from './liveTree'
import { handleMutate } from './mutate'
import { finishOwed } from './finishOwed'
import { readNotes } from './owed'

let root: string

const entity = async (parent: string, kind: 'collection' | 'set', name: string) => {
  const id = newId()
  const made = await createFolderEntity(parent, kind, name, id)
  if (!made.ok) throw new Error(`${name} failed`)
  return { id, path: made.value.path }
}

beforeEach(async () => {
  root = tempRoot('pom-move-')
  await putJson(nexusConfig(root, NEXUS_CONFIG_FILES.identity), { id: 'nx', createdAt: '2026' })
  await openSession(root)
})

afterEach(async () => {
  dropLiveTree()
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('moveSetOp', () => {
  it.skipIf(noModeBits)('a Set move that misses a view settings file owes it', async () => {
    const notes = await entity(root, 'collection', 'Notes')
    await entity(root, 'collection', 'Other')
    const deep = await entity(notes.path, 'set', 'Deep')
    const keep = await entity(notes.path, 'set', 'Keep')
    const file = sidecarPath(keep.path, 'set')
    const rules = [{ property_id: '_location', op: 'is', values: [deep.id] }]
    await putJson(file, {
      ...(await readJsonAt(file)),
      views: [{ id: 'v', name: 'V', type: 'table', filter: { match: 'all', rules } }],
    })
    await refreshTree(root)
    await chmod(file, 0o000)
    try {
      const r = await handleMutate(root, {
        op: 'moveSet',
        path: 'Notes/Deep',
        newParentPath: 'Other',
        order: [deep.id],
      })
      expect(r.ok && r.value.cascade?.owed).toBe(true)
      expect(await readNotes(root)).toMatchObject({
        [deep.id]: { kind: 'move', at: 'Notes/Deep', within: 'Notes' },
      })
    } finally {
      await chmod(file, 0o644)
    }
    await finishOwed(root)
    expect(JSON.stringify(await readJsonAt(file))).not.toContain(deep.id)
    expect(await readNotes(root)).toEqual({})
  })
})
