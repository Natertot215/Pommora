import type { Commands } from '../Actions/commands'
import { HISTORY_DAYS, HISTORY_INTERVAL, type Personalization } from './personalization'
import type { NavViewMode, NavViewModes, SubfieldConfig } from '../Interface/chrome'
import { readJsonObject, setOrDrop, updateNexusConfig } from '../Files/atomicWrite'
import { getLiveTree } from '../Nexus/liveTree'
import { nexusConfig, NEXUS_CONFIG_FILES } from '../Paths/paths'
import {
  nexusFolderRefusal,
  readSettings,
  readSettingsLeaves,
  scopeOf,
  type SettingsLeaves,
} from './codec'
import { foldKey } from '../Paths/caseFold'
import { rootSegs, type WatchScope } from '../Paths/exclusion'
import { fail, ok, type Result, fault } from '../Contract/result'
import { isPlainObject } from '../Properties/propertyValue'

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

/** Served from the tree main already holds; the disk read covers the moments before a walk has installed one — launch-restore and adoption. */
async function liveLeaves(
  root: string,
): Promise<Pick<SettingsLeaves, 'personalization' | 'excluded' | 'assetDirectory' | 'commands'>> {
  const tree = getLiveTree()
  return tree?.nexus.rootPath === root ? tree : readSettings(root)
}

// Only the scope decides what the app may touch, so the rest reads as defaults while a damaged file can't be read.
const leavesOrDefaults = (root: string) => liveLeaves(root).catch(() => readSettingsLeaves({}))

export const readLivePersonalization = async (root: string): Promise<Personalization> =>
  (await leavesOrDefaults(root)).personalization

export const readLiveCommands = async (root: string): Promise<Commands> =>
  (await leavesOrDefaults(root)).commands

export const readWatchScope = async (root: string): Promise<WatchScope> =>
  scopeOf(await liveLeaves(root))

/** Anything not literally `true` reads as off — the destructive direction is never reached by a truthy coercion. */
export async function readPermanentDelete(root: string): Promise<boolean> {
  return (await readLivePersonalization(root)).permanentDelete === true
}

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000

export async function readFileHistoryConfig(
  root: string,
): Promise<{ enabled: boolean; intervalMs: number; keepMs: number }> {
  const p = await readLivePersonalization(root)
  return {
    enabled: p.fileHistory !== false,
    intervalMs: (p.historyInterval ?? HISTORY_INTERVAL.default) * MINUTE_MS,
    keepMs: (p.historyDays ?? HISTORY_DAYS.default) * DAY_MS,
  }
}

export async function readSubfield(root: string): Promise<SubfieldConfig | null> {
  const existing = await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.settings))
  const sub = existing?.subfield
  if (!sub || typeof sub !== 'object') return null
  const expanded = (sub as Record<string, unknown>).expanded
  return { expanded: typeof expanded === 'boolean' ? expanded : true }
}

export function writeSubfield(root: string, config: SubfieldConfig): Promise<void> {
  return updateSettings(root, (cur) => ({ ...cur, subfield: config }))
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

export async function readNavViewModes(root: string): Promise<NavViewModes | null> {
  const existing = await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.settings))
  const nv = existing?.navViewModes
  if (!nv || typeof nv !== 'object') return null
  const s = nv as Record<string, unknown>
  const mode = (v: unknown): NavViewMode => (v === 'gallery' ? 'gallery' : 'list')
  return { window: mode(s.window), view: mode(s.view) }
}

export function writeNavViewModes(root: string, modes: NavViewModes): Promise<void> {
  return updateSettings(root, (cur) => ({ ...cur, navViewModes: modes }))
}

/** An `undefined` value resets the key to its built-in default — JSON omits it. */
export function writePersonalization(root: string, key: string, value: unknown): Promise<void> {
  return updateSettings(root, (cur) => {
    const p = isPlainObject(cur.personalization) ? cur.personalization : {}
    return { ...cur, personalization: { ...p, [key]: value } }
  })
}

/** Deduped on the case-folded path so `archive` and `Archive` are one folder while the typed casing is stored. The first refusal stops the whole write — a partial list is never stored. */
export function sanitizeExclusions(folders: unknown): Result<string[]> {
  if (!Array.isArray(folders)) return fault('A folder list is required.')
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of folders) {
    if (typeof entry !== 'string') return fault('A folder path is required.')
    const raw = entry.trim()
    const refusal = nexusFolderRefusal(raw)
    if (refusal) return fail('invalid-path', refusal)
    const segs = rootSegs(raw)
    const rel = segs.join('/')
    const key = segs.map(foldKey).join('/')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(rel)
  }
  return ok(out)
}
