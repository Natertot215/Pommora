import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, readFile, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { patchSidecar, readSidecar } from './sidecar'
import { SIDECAR_FILENAME } from '../Paths/paths'
import { fail } from '../Contract/result'
import { pageCollectionSidecar } from '../Nexus/schemas'

let dir: string
beforeEach(async () => {
  dir = tempRoot('pom-sidecar-')
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const seed = (obj: Record<string, unknown>): Promise<void> =>
  writeFile(join(dir, SIDECAR_FILENAME.collection), JSON.stringify(obj))
const raw = async (): Promise<string> => readFile(join(dir, SIDECAR_FILENAME.collection), 'utf8')

describe('readSidecar', () => {
  it('reads a sidecar through its schema, foreign keys included', async () => {
    await seed({ id: 'T1', icon: 'box', plugin: 'keep', meta: { v: 2 } })
    expect(await readSidecar(dir, 'collection', pageCollectionSidecar)).toMatchObject({
      id: 'T1',
      icon: 'box',
      plugin: 'keep',
      meta: { v: 2 },
    })
  })

  it('returns null for a missing sidecar', async () => {
    expect(await readSidecar(dir, 'collection', pageCollectionSidecar)).toBeNull()
  })

  it('returns null for an invalid sidecar (missing id)', async () => {
    await seed({ icon: 'no-id' })
    expect(await readSidecar(dir, 'collection', pageCollectionSidecar)).toBeNull()
  })
})

describe('patchSidecar', () => {
  it('edits one key and writes sorted, stable JSON with every other key as it was', async () => {
    await seed({ id: 'T1', plugin: 'keep', open_in: 'side-peek' })
    expect((await patchSidecar(dir, 'collection', (cur) => ({ ...cur, icon: 'box' }))).ok).toBe(
      true,
    )
    expect(await raw()).toBe(
      '{\n  "icon": "box",\n  "id": "T1",\n  "open_in": "side-peek",\n  "plugin": "keep"\n}\n',
    )
  })

  it('refuses a missing sidecar and one without an id, writing nothing', async () => {
    expect((await patchSidecar(dir, 'collection', (cur) => cur)).ok).toBe(false)
    await seed({ icon: 'no-id' })
    expect((await patchSidecar(dir, 'collection', (cur) => ({ ...cur, x: 1 }))).ok).toBe(false)
    expect(JSON.parse(await raw())).toEqual({ icon: 'no-id' })
  })

  it('returns the refusal its edit raises, writing nothing', async () => {
    await seed({ id: 'T1' })
    const r = await patchSidecar(dir, 'collection', (_, refuse) =>
      refuse(fail('not-found', 'View not found.')),
    )
    expect(r).toEqual(fail('not-found', 'View not found.'))
    expect(JSON.parse(await raw())).toEqual({ id: 'T1' })
  })
})
