import { isNavRef, toNavRef } from './navRef'
import type { NavRef, NavigationState } from './navRef'
import { NEXUS_CONFIG_FILES, nexusConfig } from '../Paths/paths'
import { readValue, writeValue } from '../Platform/localState'
import { readJsonObject, setOrDrop, updateNexusConfig } from '../Files/atomicWrite'
import { parseConnectionText } from '../Connections/connections'
import { underAssetRoot } from '../Assets/assetRoots'
import { readWatchScope } from '../Settings/settings'
import { isPlainObject } from '../Properties/propertyValue'

const statePath = (root: string): string => nexusConfig(root, NEXUS_CONFIG_FILES.state)

const navigationOf = (state: Record<string, unknown> | null): Record<string, unknown> =>
  isPlainObject(state?.navigation) ? state.navigation : {}

export function isAssetPath(v: unknown, assetDir: string): v is string {
  if (typeof v !== 'string') return false
  return parseConnectionText(v) !== null || underAssetRoot(v, assetDir)
}

const cleanRefs = (v: unknown[]): NavRef[] => v.filter((r) => isNavRef(r)).map(toNavRef)

const refList = (v: unknown): NavRef[] | undefined => {
  if (!Array.isArray(v)) return undefined
  const refs = cleanRefs(v)
  return refs.length ? refs : undefined
}

const FILE_KEYS = ['pinned', 'favorites'] as const

const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

export async function readNavigationFile(root: string): Promise<Omit<NavigationState, 'recents'>> {
  const obj = navigationOf(await readJsonObject(statePath(root)))
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

export async function writeNavigationState(
  root: string,
  patch: Partial<NavigationState>,
): Promise<void> {
  if ('recents' in patch) {
    const recents = cleanRefs(patch.recents ?? [])
    writeValue('recents', recents.length ? recents : null)
  }
  const touchesFile = FILE_KEYS.some((k) => k in patch) || 'banner' in patch
  if (!touchesFile) return
  const written = await updateNexusConfig(root, 'state', (state) => {
    const base = navigationOf(state)
    const navigation: Record<string, unknown> = { ...base }
    for (const key of FILE_KEYS) {
      const refs = key in patch ? cleanRefs(patch[key] ?? []) : cleanRefs(asList(base[key]))
      if (refs.length) navigation[key] = refs
      else delete navigation[key]
    }
    // The reader drops a banner outside the asset folder, so the write keeps any path it's given.
    const banner = 'banner' in patch ? patch.banner : base.banner
    return {
      ...state,
      navigation: setOrDrop(navigation, 'banner', typeof banner === 'string' && banner),
    }
  })
  if (!written.ok) throw new Error(written.error.message)
}
