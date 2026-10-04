import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, mkdir, writeFile, stat } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot, readJsonAt } from '../Testing/hostFs'
import { NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'
import { nexusConfig } from '../Paths/paths'
import { normalizePropertyTypes } from './migrateConfig'

let root: string

beforeEach(async () => {
  root = tempRoot('pom-config-')
  await mkdir(join(root, '.nexus'), { recursive: true })
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('normalizePropertyTypes', () => {
  const registry = (): string => nexusConfig(root, NEXUS_CONFIG_FILES.properties)
  const seedRegistry = (file: unknown): Promise<void> =>
    writeFile(registry(), JSON.stringify(file, null, 2))
  const readRegistry = async (): Promise<Record<string, unknown>> => await readJsonAt(registry())

  it('respells every legacy type id and leaves everything else as written', async () => {
    await seedRegistry({
      order: ['a', 'b', 'c', 'd', 'e'],
      plugin: { keep: true },
      defs: {
        a: { id: 'a', name: 'Tags', type: 'multi_select', select_options: [], foreign: 1 },
        b: { id: 'b', name: 'Site', type: 'url' },
        c: { id: 'c', name: 'Due', type: 'datetime' },
        d: { id: 'd', name: 'Size', type: 'number' },
        e: { id: 'e', name: 'Odd', type: 'rich_text' },
      },
    })
    await normalizePropertyTypes(root)
    expect(await readRegistry()).toEqual({
      order: ['a', 'b', 'c', 'd', 'e'],
      plugin: { keep: true },
      defs: {
        a: { id: 'a', name: 'Tags', type: 'multiSelect', select_options: [], foreign: 1 },
        b: { id: 'b', name: 'Site', type: 'link' },
        c: { id: 'c', name: 'Due', type: 'dateTime' },
        d: { id: 'd', name: 'Size', type: 'number' },
        e: { id: 'e', name: 'Odd', type: 'rich_text' },
      },
    })
  })

  it('leaves a registry with only current ids untouched', async () => {
    await seedRegistry({ order: ['a'], defs: { a: { id: 'a', name: 'Site', type: 'link' } } })
    const before = (await stat(registry())).mtimeMs
    await normalizePropertyTypes(root)
    expect((await stat(registry())).mtimeMs).toBe(before)
  })
})
