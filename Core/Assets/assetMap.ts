import { normalizeTitle } from '../Connections/connections'
import { stabilize } from '../Nexus/treeStabilize'
import { ASSETS_DIR_REL, THUMBNAILS_SEGMENT } from '../Locations/nexusPaths'
import type { AssetMap } from '../Nexus/tree'
import { neverWatched, rootSegs } from '../Locations/exclusion'
import { assetsDir, relPosix } from '../Locations/paths'
import { listFilesRecursive } from '../IO/walk'
import { readWatchScope } from '../Settings/settings'
import type { WatchEventName } from '../Nexus/watchPatch'

/** The root's OWN segments are exempt, exactly as in the watcher's ignore — a root named `.attachments` is the case that exemption exists for. */
export function indexable(rel: string, assetDir: string): boolean {
  const below = rel.split('/').slice(rootSegs(assetDir).length)
  if (below.some(neverWatched)) return false
  return !(rel.startsWith(`${ASSETS_DIR_REL}/`) && below.includes(THUMBNAILS_SEGMENT))
}

const nameOf = (rel: string): string => normalizeTitle(rel.split('/').pop() ?? '')

export async function buildAssetMap(root: string, assetDir: string): Promise<AssetMap> {
  const abs = await listFilesRecursive(assetsDir(root, assetDir))
  const files: Record<string, string[]> = {}
  for (const rel of abs.map((p) => relPosix(root, p)).filter((rel) => indexable(rel, assetDir))) {
    const name = nameOf(rel)
    if (!name) continue
    const held = files[name]
    if (held) held.push(rel)
    else files[name] = [rel]
  }
  for (const paths of Object.values(files)) paths.sort()
  return { files, version: 0 }
}

export function patchAssetMap(
  map: AssetMap,
  rel: string,
  event: 'add' | 'change' | 'unlink',
  assetDir: string,
): AssetMap {
  if (!indexable(rel, assetDir)) return map
  const name = nameOf(rel)
  if (!name) return map
  // Only a re-save under an unchanged name needs the version: an add or an unlink already hands every affected consumer a different path.
  if (event === 'change') return { ...map, version: map.version + 1 }
  const held = map.files[name] ?? []
  const paths =
    event === 'add' ? [...held.filter((p) => p !== rel), rel].sort() : held.filter((p) => p !== rel)
  const files = { ...map.files, [name]: paths }
  if (!paths.length) delete files[name]
  return { files, version: map.version }
}

/** A symbol, not a sentinel string: `string | 'ambiguous'` collapses to `string`, so a caller testing `typeof hit === 'string'` would take the refusal for a path and delete by it. */
export const AMBIGUOUS: unique symbol = Symbol('ambiguous')

export function resolveAssetName(map: AssetMap, name: string): string | null | typeof AMBIGUOUS {
  const paths = map.files[normalizeTitle(name)]
  if (!paths?.length) return null
  return paths.length > 1 ? AMBIGUOUS : paths[0]
}

// Pinned to the root it was built for, so a session switch needs no teardown — the pin makes the previous nexus's map unreadable.
let held: { root: string; assetDir: string; map: AssetMap } | null = null

// `atomicWriteBinary` records its own write and the watcher drops the echo, so the writer is the only thing that knows the renderer is owed a push.
let owedPush = false

export function getHeldAssetMap(root: string): AssetMap | null {
  return held?.root === root ? held.map : null
}

export function takeAssetMapPush(root: string): AssetMap | null {
  if (!owedPush || held?.root !== root) return null
  owedPush = false
  return held.map
}

/** A changed `asset_directory` rebuilds: the held listing describes the folder it was taken from, so patching a new root's events into it would answer with paths that moved away. */
export async function liveAssetMap(root: string): Promise<AssetMap> {
  const { assetDir } = await readWatchScope(root)
  if (held?.root === root && held.assetDir === assetDir) return held.map
  const map = await buildAssetMap(root, assetDir)
  held = { root, assetDir, map }
  return map
}

export async function refreshAssetMap(root: string): Promise<AssetMap> {
  const prior = held?.root === root ? held.map : null
  const { assetDir } = await readWatchScope(root)
  const map = stabilize(await buildAssetMap(root, assetDir), prior)
  held = { root, assetDir, map }
  return map
}

export function patchHeldAssetMap(
  root: string,
  rel: string,
  event: WatchEventName,
): AssetMap | null {
  if (held?.root !== root) return null
  if (event !== 'add' && event !== 'change' && event !== 'unlink') return null
  const next = patchAssetMap(held.map, rel, event, held.assetDir)
  if (next === held.map) return null
  held = { ...held, map: next }
  owedPush = true
  return next
}
