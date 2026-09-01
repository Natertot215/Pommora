import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  readInterfaceScale,
  readWatchScope,
  readPermanentDelete,
  updateSettings,
  writeExcludedFolders,
  writePersonalization,
} from './settings'
import { dropLiveTree, refreshTree } from './liveTree'
import { nexusDir, nexusConfig, NEXUS_CONFIG_FILES } from './paths'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-settings-'))
  // The open path guarantees `.nexus/` exists before any settings write (identity mkdirs it).
  await mkdir(nexusDir(root), { recursive: true })
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const path = () => nexusConfig(root, NEXUS_CONFIG_FILES.settings)
const readSettings = async (): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(path(), 'utf8'))
const write = async (v: object): Promise<void> => {
  await writeFile(path(), JSON.stringify(v))
}

describe('updateSettings — serialized RMW (G-1)', () => {
  it('a write to a missing settings.json creates it holding only the patch', async () => {
    await updateSettings(root, (cur) => ({ ...cur, time_format: 'twentyFourHour' }))
    expect(await readSettings()).toEqual({ time_format: 'twentyFourHour' })
  })

  it('concurrent writes to different keys never clobber', async () => {
    // Fired together: unserialized read-modify-writes each merge onto the SAME stale snapshot and
    // the last write wins, dropping the others. serializeOnFile forces them to queue, so all land.
    await Promise.all([
      updateSettings(root, (c) => ({ ...c, a: 1 })),
      updateSettings(root, (c) => ({ ...c, b: 2 })),
      updateSettings(root, (c) => ({ ...c, c: 3 })),
      updateSettings(root, (c) => ({ ...c, d: 4 })),
    ])
    const s = await readSettings()
    expect([s.a, s.b, s.c, s.d]).toEqual([1, 2, 3, 4])
  })
})

describe('writeExcludedFolders', () => {
  it('writes the list and reads it back through the scope', async () => {
    await writeExcludedFolders(root, ['Archive', 'Vault A'])
    expect((await readSettings()).excluded_folders).toEqual(['Archive', 'Vault A'])
    expect((await readWatchScope(root)).excluded).toEqual(['Archive', 'Vault A'])
  })
  it('an empty list deletes the key rather than storing []', async () => {
    await write({ excluded_folders: ['Archive'] })
    await writeExcludedFolders(root, [])
    expect('excluded_folders' in (await readSettings())).toBe(false)
  })
  it('preserves a foreign top-level key and a sibling personalization block', async () => {
    await write({ time_format: 'twentyFourHour', personalization: { permanentDelete: true } })
    await writeExcludedFolders(root, ['Archive'])
    const s = await readSettings()
    expect(s.time_format).toBe('twentyFourHour')
    expect(s.personalization).toEqual({ permanentDelete: true })
    expect(s.excluded_folders).toEqual(['Archive'])
  })
})

describe('readInterfaceScale', () => {
  it('defaults to 1.0 when the file or the key is absent', async () => {
    expect(await readInterfaceScale(root)).toBe(1)
    await write({ personalization: {} })
    expect(await readInterfaceScale(root)).toBe(1)
  })

  it('returns a valid in-range scale', async () => {
    await write({ personalization: { interfaceScale: 1.25 } })
    expect(await readInterfaceScale(root)).toBe(1.25)
  })

  it('clamps out-of-range values so a typo cannot brick the window', async () => {
    await write({ personalization: { interfaceScale: 125 } })
    expect(await readInterfaceScale(root)).toBe(1.5)
    await write({ personalization: { interfaceScale: 0.1 } })
    expect(await readInterfaceScale(root)).toBe(0.5)
  })

  it('falls back to 1.0 on a non-numeric or malformed value', async () => {
    await write({ personalization: { interfaceScale: 'big' } })
    expect(await readInterfaceScale(root)).toBe(1)
    await write({ personalization: 'nope' })
    expect(await readInterfaceScale(root)).toBe(1)
  })
})

describe('an unreadable settings.json is never replaced', () => {
  it('updateSettings fails the write and leaves the file byte-identical', async () => {
    await writeFile(path(), '{ corrupt', 'utf8')
    await expect(
      updateSettings(root, (cur) => ({ ...cur, profile_subtitle: 'x' })),
    ).rejects.toThrow()
    expect(await readFile(path(), 'utf8')).toBe('{ corrupt')
  })
})

describe('readPermanentDelete — what emptying the trash means', () => {
  it('an absent file, an absent key, and a non-boolean all read as off', async () => {
    expect(await readPermanentDelete(root)).toBe(false)
    await write({})
    expect(await readPermanentDelete(root)).toBe(false)
    await write({ personalization: {} })
    expect(await readPermanentDelete(root)).toBe(false)
    // Never truthy-coerced: the unsafe direction is not reached by accident.
    for (const v of ['true', 1, ['true'], {}])
      await write({ personalization: { permanentDelete: v } })
    expect(await readPermanentDelete(root)).toBe(false)
  })

  it('reads the switch on, and sees a write without a reopen', async () => {
    await write({ personalization: { permanentDelete: true } })
    expect(await readPermanentDelete(root)).toBe(true)
    await writePersonalization(root, 'permanentDelete', undefined)
    expect(await readPermanentDelete(root)).toBe(false)
  })
})

describe('the live-tree fast path', () => {
  afterEach(() => dropLiveTree())

  it('serves the tree main already holds, without opening the file', async () => {
    await writeFile(nexusConfig(root, NEXUS_CONFIG_FILES.identity), JSON.stringify({ id: 'nx1' }))
    await write({
      personalization: { permanentDelete: true, interfaceScale: 1.5 },
      excluded_folders: ['Archive'],
    })
    await refreshTree(root)
    // The file is gone; every answer below can only come from the tree.
    await rm(path(), { force: true })
    expect(await readPermanentDelete(root)).toBe(true)
    expect(await readInterfaceScale(root)).toBe(1.5)
    expect((await readWatchScope(root)).excluded).toEqual(['Archive'])
  })

  it('falls back to disk for a root no tree is held for', async () => {
    await write({ personalization: { permanentDelete: true }, excluded_folders: ['Archive'] })
    expect(await readPermanentDelete(root)).toBe(true)
    expect((await readWatchScope(root)).excluded).toEqual(['Archive'])
  })
})
