import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathExists } from '../Files/atomicWrite'
import { CONTEXTS_REGISTRY_REL } from '../Paths/nexusPaths'
import { NEXUS_CONFIG_FILES, contextsRegistryFile, nexusConfig } from '../Paths/paths'
import { ensureConfigLayout } from './migrateConfig'

let root: string
const read = (rel: string): Promise<string> => readFile(join(root, rel), 'utf8')
const has = (rel: string): Promise<boolean> => pathExists(join(root, rel))

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-config-'))
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
