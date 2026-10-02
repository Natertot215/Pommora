import { isPlainObject } from '../Contract/validators'
import { type Commands, DEFAULT_COMMANDS } from '../Actions/commands'
import {
  type Personalization,
  type SettingKey,
  type SettingValue,
  settingOf,
} from './personalization'
import { setOrDrop, updateNexusConfig } from '../Files/atomicWrite'
import { heldTreeOf } from '../Nexus/liveTree'
import { sessionRoot } from '../Nexus/session'
import { normalizeExclusions, readSettings, scopeOf, type SettingsLeaves } from './codec'
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
): Promise<{ enabled: boolean; intervalMs: number; keepMs: number }> {
  const p = await readLivePersonalization(root)
  return {
    enabled: settingOf(p, 'fileHistory'),
    intervalMs: settingOf(p, 'historyInterval') * MINUTE_MS,
    keepMs: settingOf(p, 'historyDays') * DAY_MS,
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

/** The excluded entries at or under `rel`, each relative to it. */
export const excludedWithin = async (root: string, rel: string): Promise<string[]> =>
  (await readWatchScope(root)).excluded.flatMap((entry) => entryWithin(entry, rel)?.join('/') ?? [])

async function editExcluded(root: string, edit: (excluded: string[]) => string[]): Promise<void> {
  const { excluded } = await readWatchScope(root)
  const next = normalizeExclusions(edit(excluded)).folders
  if (next.length !== excluded.length || next.some((entry, i) => entry !== excluded[i]))
    await writeExcludedFolders(root, next)
}

/** An excluded entry follows the folder it names: a Collection or Set landing at `to` carries every entry at or under `from` with it. */
export async function followExcludedFolders(root: string, from: string, to: string): Promise<void> {
  if (from === to) return
  await editExcluded(root, (excluded) =>
    excluded.map((entry) => {
      const rest = entryWithin(entry, from)
      return rest ? [to, ...rest].join('/') : entry
    }),
  )
}

/** A landing that moves excluded entries rewrites the settings file, so it refuses before anything moves while that file can't be written. */
export async function exclusionWriteRefusal(
  root: string,
  entries: readonly string[],
): Promise<Result<never> | null> {
  if (!entries.length) return null
  const settings = await updateNexusConfig(root, 'settings', () => null)
  return settings.ok ? null : settings
}

/** A trashed Collection or Set takes its excluded entries with it; its record keeps them relative to it. */
export async function releaseExcludedFolders(root: string, rel: string): Promise<void> {
  await editExcluded(root, (excluded) =>
    excluded.filter((entry) => entryWithin(entry, rel) === null),
  )
}

/** A restored Collection or Set lands with the entries its record kept. */
export const reseatExcludedFolders = (root: string, rel: string, within: string[]): Promise<void> =>
  editExcluded(root, (excluded) => [...excluded, ...within.map((rest) => `${rel}/${rest}`)])

/** An `undefined` value resets the key to its built-in default — JSON omits it. */
export function writePersonalization(root: string, key: string, value: unknown): Promise<void> {
  return updateSettings(root, (cur) => {
    const p = isPlainObject(cur.personalization) ? cur.personalization : {}
    return { ...cur, personalization: { ...p, [key]: value } }
  })
}

export function sanitizeExclusions(folders: unknown): Result<string[]> {
  if (!Array.isArray(folders)) return fault('A folder list is required.')
  const { folders: kept, refusal } = normalizeExclusions(folders)
  return refusal ? fail('invalid-path', refusal) : ok(kept)
}
