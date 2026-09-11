import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ASSETS_DIR_REL } from '../Paths/nexusPaths'
import { writeAssetFile } from './assetWrite'

let root: string
const bytes = new TextEncoder().encode('image-bytes')

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-assetwrite-'))
  await mkdir(join(root, '.nexus', 'assets'), { recursive: true })
  await writeFile(join(root, '.nexus', 'settings.json'), '{}')
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('writeAssetFile — the crops name is reserved at the assets root', () => {
  it('rejects crops.json at the default assets root', async () => {
    const r = await writeAssetFile(root, ASSETS_DIR_REL, 'crops.json', bytes)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('reserved')
  })

  it('rejects a case variant of crops.json, since the filesystem is case-insensitive', async () => {
    const r = await writeAssetFile(root, ASSETS_DIR_REL, 'Crops.JSON', bytes)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('reserved')
  })

  it('allows crops.json under a configured asset directory that is not the reserved root', async () => {
    const r = await writeAssetFile(root, 'file-assets', 'crops.json', bytes)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe('[[crops.json]]')
  })
})
