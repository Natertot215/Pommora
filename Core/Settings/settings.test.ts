import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, mkdir, writeFile, readFile, readdir } from 'node:fs/promises'
import { tempRoot, readJsonAt } from '../Testing/hostFs'
import {
  carrySetAside,
  readWatchScope,
  readLiveSetting,
  updateSettings,
  writeExcludedFolders,
  writePersonalization,
} from './settings'
import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
import { nexusDir, nexusConfig } from '../Paths/paths'
import { NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'
import { dirname } from '../Paths/posix'
import { openSession } from '../Nexus/session'

let root: string
beforeEach(async () => {
  root = tempRoot('pom-settings-')
  await openSession(root)
  // The open path guarantees `.nexus/` exists before any settings write (identity mkdirs it).
  await mkdir(nexusDir(root), { recursive: true })
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const path = () => nexusConfig(root, NEXUS_CONFIG_FILES.settings)
const readSettings = async (): Promise<Record<string, unknown>> => await readJsonAt(path())
const write = async (v: object): Promise<void> => {
  await writeFile(path(), JSON.stringify(v))
}

describe('updateSettings — serialized RMW (G-1)', () => {
  it('a write to a missing settings.json creates it holding only the patch', async () => {
    await updateSettings(root, (cur) => ({ ...cur, time_format: 'twentyFourHour' }))
    expect(await readSettings()).toEqual({ time_format: 'twentyFourHour' })
  })

  it('concurrent writes to different keys never clobber', async () => {
    // Fired together: unserialized read-modify-writes each merge onto the SAME stale snapshot and the last write wins. serializeOnFile forces them to queue, so all land.
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

describe('carrySetAside', () => {
  it('writes each landing entry just ahead of its source, and its drop leaves the landing alone', async () => {
    await write({ excluded_folders: ['Archive', 'Old/Private', 'Old/Deep/Raw'] })
    const carried = await carrySetAside(root, 'Old', 'New')
    if (!carried.ok) throw new Error(carried.error.message)
    expect((await readSettings()).excluded_folders).toEqual([
      'Archive',
      'New/Private',
      'Old/Private',
      'New/Deep/Raw',
      'Old/Deep/Raw',
    ])
    await carried.value.drop()
    expect((await readSettings()).excluded_folders).toEqual([
      'Archive',
      'New/Private',
      'New/Deep/Raw',
    ])
  })

  it('moves the asset directory in the same write, holding its source as an excluded entry until the drop', async () => {
    await write({ asset_directory: 'Old/Media' })
    const carried = await carrySetAside(root, 'Old', 'New')
    if (!carried.ok) throw new Error(carried.error.message)
    expect(await readSettings()).toEqual({
      asset_directory: 'New/Media',
      excluded_folders: ['Old/Media'],
    })
    await carried.value.drop()
    expect(await readSettings()).toEqual({ asset_directory: 'New/Media' })
  })

  it('refuses while settings.json can’t be written, leaving it byte-identical', async () => {
    await write({ excluded_folders: ['Old/Private'] })
    await readWatchScope(root)
    await writeFile(path(), '{ corrupt', 'utf8')
    const carried = await carrySetAside(root, 'Old', 'New')
    expect(carried.ok ? '' : carried.error.message).toContain('settings.json')
    expect(await readFile(path(), 'utf8')).toBe('{ corrupt')
  })

  it('writes nothing when no entry or asset directory sits under the source', async () => {
    await write({ excluded_folders: ['Archive'] })
    const before = await readFile(path(), 'utf8')
    const carried = await carrySetAside(root, 'Old', 'New')
    if (!carried.ok) throw new Error(carried.error.message)
    await carried.value.drop()
    expect(await readFile(path(), 'utf8')).toBe(before)
  })
})

describe('an unreadable settings.json is never replaced', () => {
  it('updateSettings refuses a corrupt file, names it, and leaves it byte-identical', async () => {
    await writeFile(path(), '{ corrupt', 'utf8')
    await expect(
      updateSettings(root, (cur) => ({ ...cur, profile_subtitle: 'x' })),
    ).rejects.toThrow('settings.json')
    expect(await readFile(path(), 'utf8')).toBe('{ corrupt')
    expect((await readdir(dirname(path()))).some((f) => f.includes('.bad-'))).toBe(false)
  })

  it('a corrupt file fails the settings read rather than reading as defaults', async () => {
    await writeFile(path(), '{"excluded_folders":["Private"],}', 'utf8')
    await expect(readWatchScope(root)).rejects.toThrow('settings.json')
  })

  it('a corrupt file never read fails the delete switch rather than reading it as off', async () => {
    await writeFile(path(), '{ corrupt', 'utf8')
    await expect(readLiveSetting(root, 'permanentDelete')).rejects.toThrow('settings.json')
  })
})

describe('the permanent-delete switch — what emptying the trash means', () => {
  it('an absent file, an absent key, and a non-boolean all read as off', async () => {
    expect(await readLiveSetting(root, 'permanentDelete')).toBe(false)
    await write({})
    expect(await readLiveSetting(root, 'permanentDelete')).toBe(false)
    await write({ personalization: {} })
    expect(await readLiveSetting(root, 'permanentDelete')).toBe(false)
    // Never truthy-coerced: the unsafe direction is not reached by accident.
    for (const v of ['true', 1, ['true'], {}]) {
      await write({ personalization: { permanentDelete: v } })
      expect(await readLiveSetting(root, 'permanentDelete')).toBe(false)
    }
  })

  it('reads the switch on, and sees a write without a reopen', async () => {
    await write({ personalization: { permanentDelete: true } })
    expect(await readLiveSetting(root, 'permanentDelete')).toBe(true)
    await writePersonalization(root, 'permanentDelete', undefined)
    expect(await readLiveSetting(root, 'permanentDelete')).toBe(false)
  })
})

describe('the archive timeframe never exceeds History Timeframe', () => {
  const personalization = async (): Promise<unknown> => (await readSettings()).personalization

  it('shortening History Timeframe below a picked archive timeframe lowers it in the same write', async () => {
    await write({ personalization: { historyDays: 60, archiveHistoryDays: 30 } })
    await writePersonalization(root, 'historyDays', 14)
    expect(await personalization()).toEqual({ historyDays: 14, archiveHistoryDays: 14 })
  })

  it('lengthening History Timeframe leaves a pick where it is, and an unpicked one unwritten', async () => {
    await write({ personalization: { historyDays: 14, archiveHistoryDays: 7 } })
    await writePersonalization(root, 'historyDays', 60)
    expect(await personalization()).toEqual({ historyDays: 60, archiveHistoryDays: 7 })
    await write({ personalization: {} })
    await writePersonalization(root, 'historyDays', 7)
    expect(await personalization()).toEqual({ historyDays: 7 })
  })

  it('a pick above History Timeframe lands at it', async () => {
    await write({ personalization: { historyDays: 14 } })
    await writePersonalization(root, 'archiveHistoryDays', 60)
    expect(await personalization()).toEqual({ historyDays: 14, archiveHistoryDays: 14 })
  })
})

describe('the live-tree fast path', () => {
  afterEach(() => dropLiveTree())

  it('serves the tree main already holds, without opening the file', async () => {
    await writeFile(nexusConfig(root, NEXUS_CONFIG_FILES.identity), JSON.stringify({ id: 'nx1' }))
    await write({
      personalization: { permanentDelete: true },
      excluded_folders: ['Archive'],
    })
    await refreshTree(root)
    await rm(path(), { force: true })
    expect(await readLiveSetting(root, 'permanentDelete')).toBe(true)
    expect((await readWatchScope(root)).excluded).toEqual(['Archive'])
  })

  it('falls back to disk for a root no tree is held for', async () => {
    await write({ personalization: { permanentDelete: true }, excluded_folders: ['Archive'] })
    expect(await readLiveSetting(root, 'permanentDelete')).toBe(true)
    expect((await readWatchScope(root)).excluded).toEqual(['Archive'])
  })
})
