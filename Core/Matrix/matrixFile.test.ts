import { mkdir, rm, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { join } from '../Paths/posix'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { tempRoot, readJsonAt } from '../Testing/hostFs'
import { DEFAULT_MATRIX_CONFIG } from './matrixConfig'
import { readMatrixFile, writeMatrixFile } from './matrixFile'

let root: string

beforeEach(() => {
  root = tempRoot('pom-matrix-file-')
  installStores(memoryStores().stores)
})

afterEach(async () => {
  installStores(NO_STORES)
  await rm(root, { recursive: true, force: true })
})

const seed = async (file: Record<string, unknown>): Promise<void> => {
  await mkdir(join(root, '.nexus', 'interface'), { recursive: true })
  await writeFile(join(root, '.nexus', 'interface', 'matrix.json'), JSON.stringify(file))
}

const onDisk = async (): Promise<Record<string, unknown>> =>
  await readJsonAt(join(root, '.nexus', 'interface', 'matrix.json'))

describe('matrix.json', () => {
  it('reads an absent file as the defaults', async () => {
    expect(await readMatrixFile(root)).toEqual(DEFAULT_MATRIX_CONFIG)
  })

  it('seeds the file with only the patched value', async () => {
    const space = { ...DEFAULT_MATRIX_CONFIG.forces.space, spread: 0.9 }
    await writeMatrixFile(root, { forces: { space } })
    expect(await onDisk()).toEqual({ forces: { space: { spread: 0.9 } } })
    expect((await readMatrixFile(root)).forces).toEqual({ ...DEFAULT_MATRIX_CONFIG.forces, space })
  })

  it('keeps the first section when a second one is written', async () => {
    const space = { ...DEFAULT_MATRIX_CONFIG.forces.space, spread: 0.9 }
    await writeMatrixFile(root, { forces: { space } })
    await writeMatrixFile(root, { group: { mode: 'space' } })
    expect(await onDisk()).toEqual({
      forces: { space: { spread: 0.9 } },
      group: { mode: 'space' },
    })
    const config = await readMatrixFile(root)
    expect(config.forces.space.spread).toBe(0.9)
    expect(config.group.mode).toBe('space')
  })

  it('merges a section key by key and lets an unknown top-level key ride', async () => {
    await writeMatrixFile(root, { display: { hideIcon: true, hidePath: true } })
    await seed({ ...(await onDisk()), links: { kinds: ['body'] } })
    await writeMatrixFile(root, { display: { hideIcon: false } })
    expect(await onDisk()).toEqual({
      display: { hideIcon: false, hidePath: true },
      links: { kinds: ['body'] },
    })
  })

  it("keeps a grouping's other forces as stored when one moves", async () => {
    await seed({ forces: { connection: { gravity: 1, spread: 6, strength: 2, damping: 0.4 } } })
    await writeMatrixFile(root, { forces: { connection: { gravity: 1.5 } } })
    expect(await onDisk()).toEqual({
      forces: { connection: { gravity: 1.5, spread: 6, strength: 2, damping: 0.4 } },
    })
  })

  it('moves one force of a file holding one flat set, leaving the set to seed the rest', async () => {
    await seed({ forces: { gravity: 2, spread: 3 } })
    await writeMatrixFile(root, { forces: { connection: { gravity: 1.5 } } })
    expect(await onDisk()).toEqual({
      forces: { gravity: 2, spread: 3, connection: { gravity: 1.5 } },
    })
    const forces = (await readMatrixFile(root)).forces
    expect(forces.connection).toMatchObject({ gravity: 1.5, spread: 3 })
    expect(forces.space).toMatchObject({ gravity: 2, spread: 3 })
  })

  it('leaves the file untouched by a patch that changes nothing', async () => {
    await writeMatrixFile(root, { group: { mode: 'connection' } })
    await expect(onDisk()).rejects.toThrow()
  })

  it("writes a patch's values as this build reads them", async () => {
    await writeMatrixFile(root, {
      group: { mode: 'nope' },
      forces: { connection: { gravity: 'x', spread: 2 } },
    } as never)
    expect(await onDisk()).toEqual({ forces: { connection: { spread: 2 } } })
  })
})
