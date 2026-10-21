import { isPlainObject } from '../Contract/validators'
import { type Commands, DEFAULT_COMMANDS } from '../Actions/commands'
import {
  type Personalization,
  SETTING_BOUNDS,
  type SettingKey,
  type SettingValue,
  type SteppedKey,
  settingOf,
  settingWithin,
} from './personalization'
import { setOrDrop, updateNexusConfig } from '../Files/atomicWrite'
import { heldTreeOf } from '../Nexus/liveTree'
import { sessionRoot } from '../Nexus/session'
import {
  normalizeExclusions,
  readPersonalization,
  readSettings,
  scopeOf,
  type SettingsLeaves,
} from './codec'
import { entryWithin, type WatchScope } from '../Paths/exclusion'
import { fail, ok, type Result, fault } from '../Contract/result'

export async function updateSettings(
  root: string,
  mutate: (current: Record<string, unknown>) => Record<string, unknown>,
): Promise<void> {
  const written = await updateNexusConfig(root, 'settings', mutate)
  if (!written.ok) throw new Error(written.error.message)
}

export async function updateCrops(
  root: string,
  edit: (byImage: Record<string, unknown>) => Record<string, unknown>,
): Promise<void> {
  const written = await updateNexusConfig(root, 'crops', (cur) => ({
    ...cur,
    byImage: edit(isPlainObject(cur.byImage) ? cur.byImage : {}),
  }))
  if (!written.ok) throw new Error(written.error.message)
}

/** Best-effort: a corrupt crops.json must not block the change once what it keys has moved. */
export async function rekeyCrops(
  root: string,
  remap: (key: string) => string | undefined,
): Promise<void> {
  await updateCrops(root, (byImage) =>
    Object.fromEntries(Object.entries(byImage).map(([key, crop]) => [remap(key) ?? key, crop])),
  ).catch(() => {})
}

/** Served from the tree main already holds; the disk read answers before a walk installs one, where a damaged file reads as the copy the open's gate read. */
async function liveLeaves(
  root: string,
): Promise<Pick<SettingsLeaves, 'personalization' | 'excluded' | 'assetDirectory' | 'commands'>> {
  return heldTreeOf(root)?.config ?? readSettings(root)
}

export const readLivePersonalization = async (root: string): Promise<Personalization> =>
  (await liveLeaves(root)).personalization

export const readLiveCommands = async (root: string): Promise<Commands> =>
  (await liveLeaves(root)).commands

export function heldCommands(): Commands {
  const root = sessionRoot()
  return (root && heldTreeOf(root)?.config.commands) || DEFAULT_COMMANDS
}

export const readWatchScope = async (root: string): Promise<WatchScope> =>
  scopeOf(await liveLeaves(root))

export const readLiveSetting = async <K extends SettingKey>(
  root: string,
  key: K,
): Promise<SettingValue<K>> => settingOf(await readLivePersonalization(root), key)

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000

export async function readFileHistoryConfig(
  root: string,
): Promise<{ enabled: boolean; intervalMs: number; keepMs: number; archiveKeepMs: number }> {
  const p = await readLivePersonalization(root)
  return {
    enabled: settingOf(p, 'fileHistory'),
    intervalMs: settingOf(p, 'historyInterval') * MINUTE_MS,
    keepMs: settingOf(p, 'historyDays') * DAY_MS,
    archiveKeepMs: settingWithin(p, 'archiveHistoryDays') * DAY_MS,
  }
}

/** An emptied value deletes the key rather than storing a blank — absent is what the default means, and the reader answers it either way. */
export function writeAssetDirectory(root: string, dir: string): Promise<void> {
  return updateSettings(root, (cur) => setOrDrop(cur, 'asset_directory', dir))
}

export function writeExcludedFolders(root: string, folders: string[]): Promise<void> {
  return updateSettings(root, (cur) =>
    setOrDrop(cur, 'excluded_folders', folders.length ? folders : null),
  )
}

/** A Collection or Set moving from `from` to `to` carries every excluded entry and the asset directory at or under it. Each landing entry is written just ahead of its source, and the asset directory's source held as an entry, before the folder moves, so the list keeps its order, a case-only rename keeps the landed spelling, a source stays out of the tree until the folder has left it, and the write's refusal is the move's. `drop` settles the landing and re-keys the asset directory's crops once the folder has landed; `undo` writes back what was read when the move fails. */
export async function carrySetAside(
  root: string,
  from: string,
  to: string,
): Promise<Result<{ drop: () => Promise<void>; undo: () => Promise<void> }>> {
  const { excluded, assetDir } = await readWatchScope(root)
  const landing = (entry: string): string[] => {
    const rest = entryWithin(entry, from)
    return rest ? [[to, ...rest].join('/')] : []
  }
  const ahead = excluded.flatMap((entry) => [...landing(entry), entry])
  const [asset] = landing(assetDir)
  if (ahead.length === excluded.length && !asset)
    return ok({ drop: async () => {}, undo: async () => {} })
  const write = (folders: string[], dir: string) =>
    updateNexusConfig(root, 'settings', (cur) => ({
      ...setOrDrop(cur, 'excluded_folders', folders.length > 0 && folders),
      ...(asset ? { asset_directory: dir } : {}),
    }))
  const folders = normalizeExclusions(asset ? [...ahead, assetDir] : ahead).folders
  const written = await write(folders, asset)
  if (!written.ok) return written
  const kept = normalizeExclusions(excluded.map((entry) => landing(entry)[0] ?? entry)).folders
  return ok({
    drop: async () => {
      if (kept.length < folders.length) await writeExcludedFolders(root, kept)
      if (asset) await rekeyCrops(root, (key) => landing(key)[0])
    },
    undo: async () => {
      await write(excluded, assetDir)
    },
  })
}

/** An `undefined` value resets the key to its built-in default — JSON omits it. A picked value above its bound lowers to it in the same write. */
export function writePersonalization(root: string, key: string, value: unknown): Promise<void> {
  return updateSettings(root, (cur) => {
    const p = { ...(isPlainObject(cur.personalization) ? cur.personalization : {}), [key]: value }
    const read = readPersonalization(p)
    for (const [bounded, bound] of Object.entries(SETTING_BOUNDS) as [SteppedKey, SteppedKey][]) {
      const cap = settingOf(read, bound) as number
      if ((read[bounded] ?? 0) > cap) p[bounded] = cap
    }
    return { ...cur, personalization: p }
  })
}

export function sanitizeExclusions(folders: unknown): Result<string[]> {
  if (!Array.isArray(folders)) return fault('A folder list is required.')
  const { folders: kept, refusal } = normalizeExclusions(folders)
  return refusal ? fail('invalid-path', refusal) : ok(kept)
}
