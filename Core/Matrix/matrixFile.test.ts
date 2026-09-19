import { readFile, rm } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { join } from '../Paths/posix'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { tempRoot } from '../Testing/hostFs'
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

const onDisk = async (): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(join(root, '.nexus', 'matrix.json'), 'utf8'))

describe('matrix.json', () => {
  it('reads an absent file as the defaults', async () => {
    expect(await readMatrixFile(root)).toEqual(DEFAULT_MATRIX_CONFIG)
  })

  it('seeds the file with only the patched section', async () => {
    await writeMatrixFile(root, { forces: { spread: 0.9 } })
    expect(await onDisk()).toEqual({ forces: { spread: 0.9 } })
    expect((await readMatrixFile(root)).forces).toEqual({
      ...DEFAULT_MATRIX_CONFIG.forces,
      spread: 0.9,
    })
  })

  it('keeps the first section when a second one is written', async () => {
    await writeMatrixFile(root, { forces: { spread: 0.9 } })
    await writeMatrixFile(root, { group: { mode: 'space' } })
    expect(await onDisk()).toEqual({ forces: { spread: 0.9 }, group: { mode: 'space' } })
    const config = await readMatrixFile(root)
    expect(config.forces.spread).toBe(0.9)
    expect(config.group.mode).toBe('space')
  })

  it('merges a section key by key and lets an unknown top-level key ride', async () => {
    await writeMatrixFile(root, { display: { hideIcon: true, hideLocation: true } })
    await writeMatrixFile(root, { links: { kinds: ['body'] } } as never)
    await writeMatrixFile(root, { display: { hideIcon: false } })
    expect(await onDisk()).toEqual({
      display: { hideIcon: false, hideLocation: true },
      links: { kinds: ['body'] },
    })
  })
})
