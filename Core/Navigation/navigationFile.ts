import { isPlainObject } from '../Properties/propertyValue'
import { toNavRef } from './navRef'
import type { NavRef, NavigationState } from './navRef'
import { NEXUS_CONFIG_FILES, nexusConfig, nexusDir } from '../Locations/paths'
import { readValue, writeValue } from '../Platform/localState'
import { readJsonObject, readJsonStrict, writeJson } from '../IO/atomicWrite'
import { machine } from '../Platform/machine'
import { parseConnectionText } from '../Connections/connections'
import { underAssetRoot } from '../Assets/assetRoots'
import { readWatchScope } from '../Settings/settings'

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
  return v.kind === 'homepage' ? !('id' in v) : typeof v.id === 'string' && v.id.length > 0
}

export function isAssetPath(v: unknown, assetDir: string): v is string {
  if (typeof v !== 'string') return false
  return parseConnectionText(v) !== null || underAssetRoot(v, assetDir)
}

const cleanRefs = (v: unknown[]): NavRef[] => v.filter(isNavRef).map(toNavRef)

const refList = (v: unknown): NavRef[] | undefined => {
  if (!Array.isArray(v)) return undefined
  const refs = cleanRefs(v)
  return refs.length ? refs : undefined
}

const FILE_KEYS = ['pinned', 'favorites'] as const

const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

export async function readNavigationFile(root: string): Promise<Omit<NavigationState, 'recents'>> {
  const obj = (await readJsonObject(navigationPath(root))) ?? {}
  const { assetDir } = await readWatchScope(root)
  const file: Omit<NavigationState, 'recents'> = {}
  for (const key of FILE_KEYS) {
    const refs = refList(obj[key])
    if (refs) file[key] = refs
  }
  if (isAssetPath(obj.banner, assetDir)) file.banner = obj.banner
  return file
}

export async function readNavigationState(root: string): Promise<NavigationState> {
  const file = await readNavigationFile(root)
  const recents = refList(readValue<unknown[]>('recents'))
  return recents ? { ...file, recents } : file
}

let inFlight: Promise<unknown> | null = null

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
  const write = machine().lock(path, async () => {
    // The write's read-half is STRICT — absent is a fact (start empty), unreadable is ignorance, and a write may act on a fact, never on ignorance.
    const read = await readJsonStrict(path)
    if (!read.ok && read.error.code !== 'not-found')
      throw new Error(`navigation.json is unreadable: ${read.error.message}`)
    const base = read.ok ? read.value : {}
    const out: Record<string, unknown> = { ...base }
    for (const key of FILE_KEYS) {
      const refs = key in patch ? cleanRefs(patch[key] ?? []) : cleanRefs(asList(base[key]))
      if (refs.length) out[key] = refs
      else delete out[key]
    }
    const banner = 'banner' in patch ? patch.banner : base.banner
    if (isAssetPath(banner, (await readWatchScope(root)).assetDir)) out.banner = banner
    else delete out.banner
    await machine().mkdir(nexusDir(root))
    await writeJson(path, out)
  })
  inFlight = write
  try {
    await write
  } finally {
    if (inFlight === write) inFlight = null
  }
}

export const flushNavigation = (): Promise<void> =>
  inFlight ? inFlight.then(noop, noop) : Promise.resolve()

const noop = (): void => {}
