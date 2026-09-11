// Device-level config, not nexus data. Parametrized by the userData dir (not app.getPath) so the logic stays testable without Electron.

import { join } from 'node:path'
import { stat } from 'node:fs/promises'
import { readJsonObject, rmwJsonStrict } from '@pommora/core/Files/atomicWrite'
import { DEFAULT_TRASH_MODE, type TrashMode } from '@pommora/core/Trash/trashRow'
import { TRASH_DIR } from '@pommora/core/Paths/nexusPaths'
import type { SyncDevice } from '@pommora/core/Sync/contract'

export interface AppConfig {
  lastNexusPath?: string
  recents?: string[]
  trashMode?: TrashMode
  device?: SyncDevice
}

const FILE = 'pommora.json'

export const trashModeOf = (config: AppConfig): TrashMode => config.trashMode ?? DEFAULT_TRASH_MODE

export function appConfigPath(userDataDir: string): string {
  return join(userDataDir, FILE)
}

function readDevice(v: unknown): SyncDevice | undefined {
  if (typeof v !== 'object' || v === null) return undefined
  const { id, publicKey, name } = v as Record<string, unknown>
  if (typeof id !== 'string' || !id) return undefined
  if (typeof publicKey !== 'string' || !publicKey) return undefined
  if (typeof name !== 'string' || !name) return undefined
  return { id, publicKey, name }
}

export async function readAppConfig(userDataDir: string): Promise<AppConfig> {
  const obj = await readJsonObject(appConfigPath(userDataDir))
  if (!obj) return {}
  return {
    lastNexusPath: typeof obj.lastNexusPath === 'string' ? obj.lastNexusPath : undefined,
    recents: Array.isArray(obj.recents)
      ? obj.recents.filter((p): p is string => typeof p === 'string')
      : undefined,
    trashMode: obj.trashMode === 'system' || obj.trashMode === 'nexus' ? obj.trashMode : undefined,
    device: readDevice(obj.device),
  }
}

/** Read-modify-write under its own lock, so concurrent writers can't each rebuild from a stale snapshot. `mutate`'s result is overlaid onto the raw object so a key this version doesn't model survives. An unreadable file fails the write rather than replacing it — the read side stays lenient so launch still degrades to empty defaults. */
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

export function addRecent(recents: string[], path: string, cap = 10): string[] {
  return [path, ...recents.filter((p) => p !== path)].slice(0, cap)
}

async function isExistingDir(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isDirectory()
  } catch {
    return false
  }
}

/** Never prompts — a launch must not block on a modal (headless runs and tests must not hang). */
export async function resolveRestorePath(config: AppConfig): Promise<string | null> {
  if (config.lastNexusPath && (await isExistingDir(config.lastNexusPath))) {
    return config.lastNexusPath
  }
  return null
}

/** A recents entry inside a trash dir is a deleted nexus that shouldn't resurface. */
export function isTrashedPath(p: string): boolean {
  return p.split('/').some((seg) => {
    const s = seg.toLowerCase()
    return s === TRASH_DIR || s === '.trashes'
  })
}

export async function pruneRecents(recents: string[]): Promise<string[]> {
  const keep = await Promise.all(
    recents.map((p) => (isTrashedPath(p) ? Promise.resolve(false) : isExistingDir(p))),
  )
  return recents.filter((_, i) => keep[i])
}
