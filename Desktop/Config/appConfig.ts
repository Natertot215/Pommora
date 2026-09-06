// The app's device-level config, not nexus data — which nexus to reopen, recents, trash mode.
// Parametrized by the userData dir (not app.getPath) so the logic stays testable without Electron.

import { join } from 'node:path'
import { stat } from 'node:fs/promises'
import { readJsonObject, rmwJsonStrict } from '@pommora/core/IO/atomicWrite'
import { DEFAULT_TRASH_MODE, type TrashMode } from '@pommora/core/Trash/trashRow'
import { TRASH_DIR } from '@pommora/core/Locations/nexusPaths'

interface AppConfig {
  lastNexusPath?: string
  recents?: string[]
  trashMode?: TrashMode
}

const FILE = 'pommora.json'

/** The one place the unset field resolves to its default. */
export const trashModeOf = (config: AppConfig): TrashMode => config.trashMode ?? DEFAULT_TRASH_MODE

export function appConfigPath(userDataDir: string): string {
  return join(userDataDir, FILE)
}

/** Read the config, tolerating a missing or malformed file (→ empty defaults). */
export async function readAppConfig(userDataDir: string): Promise<AppConfig> {
  const obj = await readJsonObject(appConfigPath(userDataDir))
  if (!obj) return {}
  return {
    lastNexusPath: typeof obj.lastNexusPath === 'string' ? obj.lastNexusPath : undefined,
    recents: Array.isArray(obj.recents)
      ? obj.recents.filter((p): p is string => typeof p === 'string')
      : undefined,
    trashMode: obj.trashMode === 'system' || obj.trashMode === 'nexus' ? obj.trashMode : undefined,
  }
}

/** Read-modify-write under its own lock, so concurrent writers (adopt, recents self-heal) can't
 *  each rebuild from a stale snapshot. `mutate`'s result is overlaid onto the raw object so a key
 *  this version doesn't model survives; `current` is that raw object, not `readAppConfig`'s
 *  validated projection. An unreadable file fails the write rather than replacing it — the read
 *  side stays lenient so launch still degrades to empty defaults. */
export async function updateAppConfig(
  userDataDir: string,
  mutate: (current: AppConfig) => AppConfig,
): Promise<void> {
  const written = await rmwJsonStrict(
    appConfigPath(userDataDir),
    (cur) => ({ ...cur, ...mutate(cur as AppConfig) }),
    () => ({}),
  )
  if (!written.ok) throw new Error(written.error.message)
}

/** Prepend `path` to recents, removing any prior occurrence, and cap the list. */
export function addRecent(recents: string[], path: string, cap = 10): string[] {
  return [path, ...recents.filter((p) => p !== path)].slice(0, cap)
}

/** True when `p` exists and is a directory. An unreadable dir surfaces later as a read error. */
async function isExistingDir(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isDirectory()
  } catch {
    return false
  }
}

/** The persisted lastNexusPath if it still exists, else null. Never prompts — a launch
 *  must not block on a modal (headless runs and tests must not hang). */
export async function resolveRestorePath(config: AppConfig): Promise<string | null> {
  if (config.lastNexusPath && (await isExistingDir(config.lastNexusPath))) {
    return config.lastNexusPath
  }
  return null
}

/** True when any path segment is a trash dir — a recents entry inside one is a deleted
 *  nexus that shouldn't resurface. */
export function isTrashedPath(p: string): boolean {
  return p.split('/').some((seg) => {
    const s = seg.toLowerCase()
    return s === TRASH_DIR || s === '.trashes'
  })
}

/** Filter recents to live, non-trashed directories, order preserved. */
export async function pruneRecents(recents: string[]): Promise<string[]> {
  const keep = await Promise.all(
    recents.map((p) => (isTrashedPath(p) ? Promise.resolve(false) : isExistingDir(p))),
  )
  return recents.filter((_, i) => keep[i])
}
