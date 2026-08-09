// The app's device-level config: a single JSON file in Electron's userData dir,
// owned by the main process. Holds cross-session state that is NOT nexus data —
// which nexus to reopen on launch, the recents list (later: trash mode, window
// bounds). Parametrized by the userData dir (not app.getPath) so the logic stays
// pure Node and unit-testable without booting Electron.

import { join } from 'node:path'
import { readJsonObject, rmwJsonStrict } from './io/atomicWrite'

/** Where a delete sends the entity: the in-nexus `.trash` (portable, index-aware) or the
 *  macOS system Trash (Finder-recoverable). Device-level — system Trash isn't portable
 *  nexus data — so it lives in app config, not the nexus. */
export type TrashMode = 'nexus' | 'system'

/** Default delete target: the portable in-nexus trash. */
export const DEFAULT_TRASH_MODE: TrashMode = 'nexus'

export interface AppConfig {
  /** Absolute path of the last nexus opened; restored on launch if still readable. */
  lastNexusPath?: string
  /** Most-recently-opened nexus paths, newest first (deduped, capped). */
  recents?: string[]
  /** Delete target; defaults to DEFAULT_TRASH_MODE when absent/invalid. */
  trashMode?: TrashMode
}

const FILE = 'pommora.json'

/** The config file's absolute path under the given userData directory. */
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

/** Read-modify-write the config under its own lock — the one writer, so the adopt path and the
 *  menu's recents self-heal cannot each rebuild the file from a snapshot taken before the other
 *  landed. `mutate` receives the RAW object rather than the projection above, so a key this
 *  version doesn't model rides through instead of being dropped on every write.
 *
 *  An unreadable file fails the write rather than replacing it, which is the strict reader's
 *  whole point and a change from the previous overwrite-on-corrupt behaviour. The read side
 *  stays lenient, so a damaged config still degrades to empty defaults for launch. */
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

/** Prepend `path` to recents, removing any prior occurrence (move-to-front) and
 *  capping the list. The one shaper of the recents list. */
export function addRecent(recents: string[], path: string, cap = 10): string[] {
  return [path, ...recents.filter((p) => p !== path)].slice(0, cap)
}
