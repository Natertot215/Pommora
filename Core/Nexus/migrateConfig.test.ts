import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, mkdir, writeFile, readFile, stat } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { pathExists } from '../Files/atomicWrite'
import { CONTEXTS_REGISTRY_REL, NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'
import { contextsRegistryFile, nexusConfig } from '../Paths/paths'
import { ensureConfigLayout, normalizePropertyTypes } from './migrateConfig'

let root: string
const read = (rel: string): Promise<string> => readFile(join(root, rel), 'utf8')
const has = (rel: string): Promise<boolean> => pathExists(join(root, rel))

beforeEach(async () => {
  root = tempRoot('pom-config-')
  await mkdir(join(root, '.nexus'), { recursive: true })
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('path constants', () => {
  it('resolve each moved file into its domain folder under a single .nexus', () => {
    expect(nexusConfig(root, NEXUS_CONFIG_FILES.crops)).toBe(
      join(root, '.nexus', 'assets', 'crops.json'),
    )
    expect(nexusConfig(root, NEXUS_CONFIG_FILES.homepage)).toBe(
      join(root, '.nexus', 'homepage', 'homepage.json'),
    )
    expect(CONTEXTS_REGISTRY_REL).toBe('.nexus/contexts/contexts.json')
  })
})

describe('ensureConfigLayout', () => {
  it('moves each flat config file into its new folder and reads back there', async () => {
    await writeFile(join(root, '.nexus', 'crops.json'), '{"byImage":{"a":1}}')
    await writeFile(join(root, '.nexus', 'homepage.json'), '{"banner":"b"}')
    await writeFile(join(root, '.nexus', 'contexts.json'), '{"contexts":[]}')

    await ensureConfigLayout(root)

    expect(await read('.nexus/assets/crops.json')).toBe('{"byImage":{"a":1}}')
    expect(await read('.nexus/homepage/homepage.json')).toBe('{"banner":"b"}')
    expect(await read('.nexus/contexts/contexts.json')).toBe('{"contexts":[]}')
    expect(await has('.nexus/crops.json')).toBe(false)
    expect(await has('.nexus/homepage.json')).toBe(false)
    expect(await has('.nexus/contexts.json')).toBe(false)
  })

  it('is a no-op on a second run, leaving the migrated content untouched', async () => {
    await writeFile(join(root, '.nexus', 'crops.json'), '{"byImage":{"a":1}}')
    await ensureConfigLayout(root)
    await ensureConfigLayout(root)
    expect(await read('.nexus/assets/crops.json')).toBe('{"byImage":{"a":1}}')
    expect(await has('.nexus/crops.json')).toBe(false)
  })

  it('keeps the new file and drops the old when both are present', async () => {
    await mkdir(join(root, '.nexus', 'assets'), { recursive: true })
    await writeFile(join(root, '.nexus', 'crops.json'), '{"old":true}')
    await writeFile(join(root, '.nexus', 'assets', 'crops.json'), '{"new":true}')

    await ensureConfigLayout(root)

    expect(await read('.nexus/assets/crops.json')).toBe('{"new":true}')
    expect(await has('.nexus/crops.json')).toBe(false)
  })

  it('creates the three domain folders on a fresh nexus with no config files', async () => {
    await ensureConfigLayout(root)
    expect(await has('.nexus/assets')).toBe(true)
    expect(await has('.nexus/homepage')).toBe(true)
    expect(await has('.nexus/contexts')).toBe(true)
    expect(await has('.nexus/assets/crops.json')).toBe(false)
    expect(await pathExists(contextsRegistryFile(root))).toBe(false)
  })
})

describe('normalizePropertyTypes', () => {
  const registry = (): string => nexusConfig(root, NEXUS_CONFIG_FILES.properties)
  const seedRegistry = (file: unknown): Promise<void> =>
    writeFile(registry(), JSON.stringify(file, null, 2))
  const readRegistry = async (): Promise<Record<string, unknown>> =>
    JSON.parse(await readFile(registry(), 'utf8'))

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
