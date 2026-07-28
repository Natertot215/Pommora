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

/** A nav target that also carries a well-formed `pinned` flag, if any. */
function isRecentEntry(v: unknown): v is RecentEntry {
  if (!isNavTarget(v)) return false
  const { pinned } = v as { pinned?: unknown }
  return pinned === undefined || typeof pinned === 'boolean'
}

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

/** Recents from the database, favorites from their file — both element-filtered. A lifted
 *  pre-database sidecar reaches the row unvalidated, and `loadOrMigratePins` reads `.pinned` off
 *  every entry, so a single junk element there would take out the whole pin set. */
export async function readNavState(root: string): Promise<NavState> {
  const favoritesRaw = await readJsonArray(favoritesPath(root))
  const recentsRaw = readValue<unknown[]>('recents')
  return {
    recents: Array.isArray(recentsRaw) ? recentsRaw.filter(isRecentEntry) : [],
    favorites: favoritesRaw.filter(isNavTarget),
  }
}

export function writeRecents(entries: RecentEntry[]): boolean {
  return writeValue('recents', entries)
}

// Favorites are the one operational write still going to disk, so they are the one write that can
// still be owed at quit — the gate the database-backed surfaces no longer need.
let inFlight: Promise<unknown> | null = null

/** Favorites — a whole-file write, serialized so two toggles can't lose each other. */
export async function writeFavorites(root: string, entries: NavFavorite[]): Promise<void> {
  const path = favoritesPath(root)
  const write = serializeOnFile(path, async () => {
    await mkdir(nexusDir(root), { recursive: true })
    await writeJson(path, entries)
  })
  inFlight = write
  try {
    await write
  } finally {
    if (inFlight === write) inFlight = null
  }
}

/** A favorites write still settling — the quit gate checks this before letting the app exit. */
export const hasPendingFavorites = (): boolean => inFlight !== null

/** Settle any owed favorites write; never rejects (a failed write must not block the quit). */
export const flushFavorites = (): Promise<void> =>
  inFlight ? inFlight.then(noop, noop) : Promise.resolve()

const noop = (): void => {}
