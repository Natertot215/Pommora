import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, readFile, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { readJsonAt, tempRoot } from '../Testing/hostFs'
import { patchSidecar, sidecarId } from './sidecar'
import { SIDECAR_FILENAME } from '../Paths/nexusPaths'
import { fail } from '../Contract/result'

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
const rawJson = (): Promise<Record<string, unknown>> =>
  readJsonAt(join(dir, SIDECAR_FILENAME.collection))

describe('sidecarId', () => {
  it('reads the id whatever else the sidecar holds', async () => {
    await seed({ id: 'T1', icon: 7, plugin: 'keep' })
    expect(await sidecarId(dir, 'collection')).toBe('T1')
  })

  it('answers nothing for a missing sidecar, or one with no id', async () => {
    expect(await sidecarId(dir, 'collection')).toBeUndefined()
    await seed({ icon: 'no-id' })
    expect(await sidecarId(dir, 'collection')).toBeUndefined()
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
    expect(await rawJson()).toEqual({ icon: 'no-id' })
  })

  it('returns the refusal its edit raises, writing nothing', async () => {
    await seed({ id: 'T1' })
    const r = await patchSidecar(dir, 'collection', (_, refuse) =>
      refuse(fail('not-found', 'View not found.')),
    )
    expect(r).toEqual(fail('not-found', 'View not found.'))
    expect(await rawJson()).toEqual({ id: 'T1' })
  })
})
