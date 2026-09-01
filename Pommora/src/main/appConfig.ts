// The app's device-level config, not nexus data — which nexus to reopen, recents, trash mode.
// Parametrized by the userData dir (not app.getPath) so the logic stays testable without Electron.

import { join } from 'node:path'
import { readJsonObject, rmwJsonStrict } from './IO/atomicWrite'

/** Where a delete sends the entity: the in-nexus `.trash` (portable, index-aware) or the
 *  macOS system Trash. Device-level since system Trash isn't portable nexus data. */
export type TrashMode = 'nexus' | 'system'

export const DEFAULT_TRASH_MODE: TrashMode = 'nexus'

export interface AppConfig {
  lastNexusPath?: string
  recents?: string[]
  trashMode?: TrashMode
}

const FILE = 'pommora.json'

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
