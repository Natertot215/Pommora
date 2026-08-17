// The one owner of navigation persistence. The contract is `NavigationState`; where each key
// lives is this module's business alone — deliberate intent (pinned/favorites/banner) in the
// hand-editable `.nexus/navigation.json`, the per-click recents trail in the device-local db
// row. One validation boundary shapes every ref entering or leaving either store.

import { mkdir } from 'node:fs/promises'
import { isPlainObject } from '@shared/propertyValue'
import { toNavRef } from '@shared/types'
import type { NavRef, NavigationState } from '@shared/types'
import { NEXUS_CONFIG_FILES, nexusConfig, nexusDir } from '../paths'
import { readValue, writeValue } from '../db/localState'
import { readJsonObject, readJsonStrict, writeJson } from './atomicWrite'
import { serializeOnFile } from './fileLock'

const NAV_KINDS = new Set([
  'homepage',
  'context',
  'space',
  'collection',
  'set',
  'page',
  'task',
  'event',
])

const navigationPath = (root: string): string => nexusConfig(root, NEXUS_CONFIG_FILES.navigation)

function isNavRef(v: unknown): v is NavRef {
  if (!isPlainObject(v) || typeof v.kind !== 'string' || !NAV_KINDS.has(v.kind)) return false
  // Exhaustive, never short-circuited: the id-less homepage must carry NO id (one it smuggled
  // through would mint a second tab under the same derived id), and every other kind needs a
  // real one.
  return v.kind === 'homepage' ? !('id' in v) : typeof v.id === 'string' && v.id.length > 0
}

/** The banner pointer's own gate: a nexus-relative path INSIDE the shared assets folder, nothing
 *  else — the pointer feeds a real file delete on replace, so a hand-edited or synced-in string
 *  must never be able to name a file outside `.nexus/assets/`. */
export function isAssetPath(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    v.startsWith('.nexus/assets/') &&
    !v.split('/').includes('..') &&
    !v.includes('\\')
  )
}

/** THE gate every ref crosses in either direction — junk drops, survivors are bare identity
 *  (`toNavRef`, the strip both processes share). */
const cleanRefs = (v: unknown[]): NavRef[] => v.filter(isNavRef).map(toNavRef)

const refList = (v: unknown): NavRef[] | undefined => {
  if (!Array.isArray(v)) return undefined
  const refs = cleanRefs(v)
  return refs.length ? refs : undefined
}

const FILE_KEYS = ['pinned', 'favorites'] as const

const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

/** The file's keys, element-filtered — hand-edited junk drops, never crashes. */
export async function readNavigationFile(root: string): Promise<Omit<NavigationState, 'recents'>> {
  const obj = (await readJsonObject(navigationPath(root))) ?? {}
  const file: Omit<NavigationState, 'recents'> = {}
  for (const key of FILE_KEYS) {
    const refs = refList(obj[key])
    if (refs) file[key] = refs
  }
  if (isAssetPath(obj.banner)) file.banner = obj.banner
  return file
}

/** The one contract: the file's deliberate intent merged with the device-local recents row. */
export async function readNavigationState(root: string): Promise<NavigationState> {
  const file = await readNavigationFile(root)
  const recents = refList(readValue<unknown[]>('recents'))
  return recents ? { ...file, recents } : file
}

let inFlight: Promise<unknown> | null = null

/** THE writer — routes each key to its store. Recents upsert the db row synchronously; file
 *  keys apply as a serialized read-modify-write, so the arrays writer and the banner writer can
 *  never drop each other's key. Empties delete; every ref passes the one cleaner both stores
 *  share. */
export async function writeNavigationState(
  root: string,
  patch: Partial<NavigationState>,
): Promise<void> {
  if ('recents' in patch) {
    const recents = cleanRefs(patch.recents ?? [])
    writeValue('recents', recents.length ? recents : null) // an emptied list deletes its row
  }
  const touchesFile = FILE_KEYS.some((k) => k in patch) || 'banner' in patch
  if (!touchesFile) return
  const path = navigationPath(root)
  const write = serializeOnFile(path, async () => {
    // The write's read-half is STRICT — absent is a fact (start empty), unreadable is ignorance,
    // and a write may act on a fact, never on ignorance. The lenient reader serves reads only.
    const read = await readJsonStrict(path)
    if (!read.ok && read.error.code !== 'not-found')
      throw new Error(`navigation.json is unreadable: ${read.error.message}`)
    const base = read.ok ? read.value : {}
    // Foreign keys ride through untouched — the file honors the same looseness every sidecar does.
    const out: Record<string, unknown> = { ...base }
    for (const key of FILE_KEYS) {
      const refs = key in patch ? cleanRefs(patch[key] ?? []) : cleanRefs(asList(base[key]))
      if (refs.length) out[key] = refs
      else delete out[key]
    }
    const banner = 'banner' in patch ? patch.banner : base.banner
    if (isAssetPath(banner)) out.banner = banner
    else delete out.banner
    await mkdir(nexusDir(root), { recursive: true })
    await writeJson(path, out)
  })
  inFlight = write
  try {
    await write
  } finally {
    if (inFlight === write) inFlight = null
  }
}

/** A navigation write still settling — the quit gate checks this before letting the app exit. */
export const hasPendingNavigation = (): boolean => inFlight !== null

/** Settle any owed write; never rejects (a failed write must not block the quit). */
export const flushNavigation = (): Promise<void> =>
  inFlight ? inFlight.then(noop, noop) : Promise.resolve()

const noop = (): void => {}
