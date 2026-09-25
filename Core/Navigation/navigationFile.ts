import { isPlainObject } from '../Contract/validators'
import { isNavRef, toNavRef } from './navRef'
import type { NavRef, NavigationState } from './navRef'
import { nexusConfig } from '../Paths/paths'
import { NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'
import { readValue, writeValue } from '../Platform/localState'
import { readJsonObject, setOrDrop, updateNexusConfig } from '../Files/atomicWrite'
import { parseConnectionText } from '../Connections/connections'
import { underAssetRoot } from '../Assets/assetRoots'
import { readWatchScope } from '../Settings/settings'

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

export async function readNavigationFile(root: string): Promise<Omit<NavigationState, 'recents'>> {
  const obj = navigationOf(await readJsonObject(statePath(root)))
  const { assetDir } = await readWatchScope(root)
  const file: Omit<NavigationState, 'recents'> = {}
  const pinned = refList(obj.pinned)
  if (pinned) file.pinned = pinned
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
  patch: Record<string, unknown>,
): Promise<void> {
  if ('recents' in patch) {
    const recents = refList(patch.recents) ?? []
    writeValue('recents', recents.length ? recents : null)
  }
  if (!('pinned' in patch) && !('banner' in patch)) return
  const written = await updateNexusConfig(root, 'state', (state) => {
    const base = navigationOf(state)
    const pinned = refList('pinned' in patch ? patch.pinned : base.pinned)
    // The reader drops a banner outside the asset folder, so the write keeps any path it's given.
    const banner = 'banner' in patch ? patch.banner : base.banner
    return {
      ...state,
      navigation: setOrDrop(
        setOrDrop(base, 'pinned', pinned),
        'banner',
        typeof banner === 'string' && banner,
      ),
    }
  })
  if (!written.ok) throw new Error(written.error.message)
}
