import {
  coerceInterfaceScale,
  HISTORY_DAYS,
  HISTORY_INTERVAL,
  type Personalization,
} from './personalization'
import type { NavViewMode, NavViewModes, SubfieldConfig } from '../Interface/chrome'
import type { WatchScope } from '../Paths/exclusion'
import { readJsonObject, rmwJsonStrict } from '../Files/atomicWrite'
import { getLiveTree } from '../Nexus/liveTree'
import { nexusConfig, NEXUS_CONFIG_FILES } from '../Paths/paths'
import { nexusFolderRefusal, readSettingsLeaves, scopeOf, type SettingsLeaves } from './codec'
import { normalizeSeg, rootSegs } from '../Paths/exclusion'
import { fail, ok, type Result } from '../Contract/result'
import { isPlainObject } from '../Properties/propertyValue'

/** The one primitive every `.nexus` config writer funnels through: a missing file starts empty; an unreadable one fails the write rather than replacing what's already on disk. */
export function updateNexusConfig(
  root: string,
  file: keyof typeof NEXUS_CONFIG_FILES,
  mutate: (current: Record<string, unknown>) => Record<string, unknown>,
): Promise<Result<Record<string, unknown>>> {
  return rmwJsonStrict(nexusConfig(root, NEXUS_CONFIG_FILES[file]), mutate, () => ({}))
}

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
): Promise<Pick<SettingsLeaves, 'personalization' | 'excluded' | 'assetDirectory'>> {
  const tree = getLiveTree()
  if (tree?.nexus.rootPath === root) return tree
  const settings = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.settings))) ?? {}
  return readSettingsLeaves(settings)
}

export const readLivePersonalization = async (root: string): Promise<Personalization> =>
  (await liveLeaves(root)).personalization

export const readWatchScope = async (root: string): Promise<WatchScope> =>
  scopeOf(await liveLeaves(root))

export async function readInterfaceScale(root: string): Promise<number> {
  return coerceInterfaceScale((await readLivePersonalization(root)).interfaceScale)
}

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
  return updateSettings(root, ({ asset_directory: _drop, ...rest }) =>
    dir ? { ...rest, asset_directory: dir } : rest,
  )
}

export function writeExcludedFolders(root: string, folders: string[]): Promise<void> {
  return updateSettings(root, ({ excluded_folders: _drop, ...rest }) =>
    folders.length ? { ...rest, excluded_folders: folders } : rest,
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
  if (!Array.isArray(folders)) return fail('operation-failed', 'A folder list is required.')
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of folders) {
    if (typeof entry !== 'string') return fail('operation-failed', 'A folder path is required.')
    const raw = entry.trim()
    const refusal = nexusFolderRefusal(raw)
    if (refusal) return fail('invalid-path', refusal)
    const segs = rootSegs(raw)
    const rel = segs.join('/')
    const key = segs.map(normalizeSeg).join('/')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(rel)
  }
  return ok(out)
}
