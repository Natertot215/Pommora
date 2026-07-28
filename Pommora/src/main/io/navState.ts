// The two halves of Navigation state, stored differently on purpose.
//
// Recents are a device-local stream: written on every selection, and two machines interleaving
// their histories has no correct answer. They live as one row in nexus.db.
//
// Favorites are a deliberate, rarely-written user act and the one part of Navigation worth
// following a user across machines, so they stay a file — hand-editable, and validated on read
// for exactly that reason.
//
// The renderer owns the in-memory arrays and all MRU/dedupe/cap/prune logic; main persists.

import { mkdir } from 'node:fs/promises'
import { isPlainObject } from '@shared/propertyValue'
import type { NavFavorite, NavState, NavTarget, RecentEntry } from '@shared/types'
import { nexusConfig, nexusDir, NEXUS_CONFIG_FILES } from '../paths'
import { readJsonArray, writeJson } from './atomicWrite'
import { serializeOnFile } from './fileLock'
import { readValue, writeValue } from '../db/localState'

const favoritesPath = (root: string): string => nexusConfig(root, NEXUS_CONFIG_FILES.navFavorites)

const NAV_KINDS = new Set(['homepage', 'context', 'collection', 'set', 'page', 'task', 'event'])

/** A well-formed nav target: known kind, an `id` on every kind but homepage, and a `path` on the
 *  path-carrying kinds (set/page). Hand-edited or cross-version junk is dropped, never crashes. */
function isNavTarget(v: unknown): v is NavTarget {
  if (!isPlainObject(v)) return false
  const kind = v.kind
  if (typeof kind !== 'string' || !NAV_KINDS.has(kind)) return false
  if (kind === 'homepage') return true
  if (typeof v.id !== 'string') return false
  if (kind === 'set' || kind === 'page') return typeof v.path === 'string'
  return true
}

/** Recents from the database, favorites read leniently from their file. */
export async function readNavState(root: string): Promise<NavState> {
  const favoritesRaw = await readJsonArray(favoritesPath(root))
  return {
    recents: readValue<RecentEntry[]>('recents') ?? [],
    favorites: favoritesRaw.filter(isNavTarget),
  }
}

export function writeRecents(entries: RecentEntry[]): void {
  writeValue('recents', entries)
}

/** Favorites — a whole-file write, serialized so two toggles can't lose each other. */
export async function writeFavorites(root: string, entries: NavFavorite[]): Promise<void> {
  const path = favoritesPath(root)
  await serializeOnFile(path, async () => {
    await mkdir(nexusDir(root), { recursive: true })
    await writeJson(path, entries)
  })
}
