import { rm } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { SIDECAR_FILENAME } from '../Paths/nexusPaths'
import { join } from '../Paths/posix'
import { orderedDefs, readRegistry } from '../Properties/propertiesRegistry'
import { FIXTURE_DEFS, STATUS_DEF } from './definitions'
import { readJsonAt, seedNexus, tempRoot } from './hostFs'

let root: string
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('seedNexus', () => {
  it('seeds a registry that reads back in the order given, and a Collection folder’s assignment under the folder’s name', async () => {
    root = tempRoot('pom-seed-')
    const when = FIXTURE_DEFS.prop_when
    await seedNexus(root, { defs: [when, STATUS_DEF], assigned: { Notes: [STATUS_DEF.id] } })
    expect(orderedDefs(await readRegistry(root))).toEqual([when, STATUS_DEF])
    expect(await readJsonAt(join(root, 'Notes', SIDECAR_FILENAME.collection))).toEqual({
      id: 'Notes',
      properties: ['prop_status'],
    })
  })
})
