// The one owner of navigation persistence. The contract is `NavigationState`; where each key
// lives is this module's business alone — deliberate intent (pinned/favorites/banner) in the
// hand-editable `.nexus/navigation.json`, the per-click recents trail in the device-local db
// row. One validation boundary shapes every ref entering or leaving either store.

import { mkdir } from 'node:fs/promises'
import { isPlainObject } from '@shared/propertyValue'
import type { NavRef, NavigationState } from '@shared/types'
import { NEXUS_CONFIG_FILES, nexusConfig, nexusDir } from '../paths'
import { readValue, writeValue } from '../db/localState'
import { readJsonObject, writeJson } from './atomicWrite'
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

const navigationPath = (root: string): string =>
  nexusConfig(root, NEXUS_CONFIG_FILES.navigation)

function isNavRef(v: unknown): v is NavRef {
  if (!isPlainObject(v) || typeof v.kind !== 'string' || !NAV_KINDS.has(v.kind)) return false
  return v.kind === 'homepage' || typeof v.id === 'string'
}

/** Identity only — a ref arriving with extra fields (a live target's `path`, a hand-edited
 *  stray) stores as bare `{kind, id}`; nothing at rest can re-grow display or path fields. */
const cleanRef = (r: NavRef): NavRef => ('id' in r ? { kind: r.kind, id: r.id } : { kind: r.kind })

const refList = (v: unknown): NavRef[] | undefined => {
  if (!Array.isArray(v)) return undefined
  const refs = v.filter(isNavRef).map(cleanRef)
  return refs.length ? refs : undefined
}

const FILE_KEYS = ['pinned', 'favorites'] as const

/** The file's keys, element-filtered — hand-edited junk drops, never crashes. */
export async function readNavigationFile(root: string): Promise<Omit<NavigationState, 'recents'>> {
  const obj = (await readJsonObject(navigationPath(root))) ?? {}
  const file: Omit<NavigationState, 'recents'> = {}
  for (const key of FILE_KEYS) {
    const refs = refList(obj[key])
    if (refs) file[key] = refs
  }
  if (typeof obj.banner === 'string') file.banner = obj.banner
  return file
}

/** The one contract: the file's deliberate intent merged with the device-local recents row. */
export function readNavigationState(root: string): Promise<NavigationState> {
  return readNavigationFile(root).then((file) => {
    const recents = refList(readValue<unknown[]>('recents'))
    return recents ? { ...file, recents } : file
  })
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
    const recents = (patch.recents ?? []).filter(isNavRef).map(cleanRef)
    writeValue('recents', recents.length ? recents : null) // an emptied list deletes its row
  }
  const touchesFile = FILE_KEYS.some((k) => k in patch) || 'banner' in patch
  if (!touchesFile) return
  const path = navigationPath(root)
  const write = serializeOnFile(path, async () => {
    const current = await readNavigationFile(root)
    const out: Record<string, unknown> = {}
    for (const key of FILE_KEYS) {
      const refs = key in patch ? patch[key]?.filter(isNavRef) : current[key]
      if (refs?.length) out[key] = refs.map(cleanRef)
    }
    const banner = 'banner' in patch ? patch.banner : current.banner
    if (banner) out.banner = banner
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
