// The filename→path map resolution answers against. Assets are named the way Obsidian names
// them — by basename, not by path — so one map from a listing of the asset root is the whole
// mechanism. It mirrors `buildPageIndex`: a normalized-name map answering resolved, phantom, or
// ambiguous, so the trichotomy has one meaning across pages and files alike.
//
// Held in memory and never persisted. Nothing derived from an asset needs to survive a restart,
// which is what keeps `nexus.db`'s stat gate, seed and prune out of this feature entirely.

import { normalizeTitle } from '@shared/connections'
import { stabilize } from '@shared/treeStabilize'
import { ASSETS_DIR_REL, THUMBNAILS_SEGMENT } from '@shared/nexusPaths'
import type { AssetMap } from '@shared/types'
import { neverWatched, rootSegs } from './exclusion'
import { assetsDir, relPosix } from './paths'
import { listFilesRecursive } from './io/walk'
import { readWatchScope } from './settings'
import type { WatchEventName } from './watchPatch'

/** Whether this path is one the map may hold. The root's OWN segments are exempt, exactly as
 *  they are in the watcher's ignore — a root named `.attachments` is the case that exemption
 *  exists for, and applying the cruft rule to it would yield a permanently empty map. Below the
 *  root the rule matches the watcher's, so the map never holds what no event can update.
 *  Thumbnails are Pommora's own derived files and are skipped under the default root alone; a
 *  user's folder that happens to be called `thumbnails` is theirs. */
export function indexable(rel: string, assetDir: string): boolean {
  const below = rel.split('/').slice(rootSegs(assetDir).length)
  if (below.some(neverWatched)) return false
  return !(rel.startsWith(`${ASSETS_DIR_REL}/`) && below.includes(THUMBNAILS_SEGMENT))
}

const nameOf = (rel: string): string => normalizeTitle(rel.split('/').pop() ?? '')

/** Every file under the asset root, keyed by normalized basename, each name holding every path
 *  that answers to it in sorted order. */
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

/** One watch event applied without a re-listing. A `change` leaves the paths alone and bumps the
 *  version instead: the map is byte-identical, so nothing downstream would repaint and the
 *  re-saved file would never be re-requested. */
export function patchAssetMap(
  map: AssetMap,
  rel: string,
  event: 'add' | 'change' | 'unlink',
  assetDir: string,
): AssetMap {
  if (!indexable(rel, assetDir)) return map
  const name = nameOf(rel)
  if (!name) return map
  // Only a re-save under an unchanged name needs the version: an add or an unlink already gives
  // every affected consumer a different path, and bumping here would re-request every mounted
  // image in the nexus for one file a sync delivered.
  if (event === 'change') return { ...map, version: map.version + 1 }
  const held = map.files[name] ?? []
  const paths =
    event === 'add' ? [...held.filter((p) => p !== rel), rel].sort() : held.filter((p) => p !== rel)
  const files = { ...map.files, [name]: paths }
  if (!paths.length) delete files[name]
  return { files, version: map.version }
}

/** A name several files answer to. A symbol rather than a sentinel string: `string | 'ambiguous'`
 *  collapses to `string`, so a caller testing `typeof hit === 'string'` would take the refusal
 *  for a path and delete by it. */
export const AMBIGUOUS: unique symbol = Symbol('ambiguous')

/** The main-side resolver — a path, nothing, or a refusal to choose. A delete that depends on
 *  which file a name means must never guess. */
export function resolveAssetName(map: AssetMap, name: string): string | null | typeof AMBIGUOUS {
  const paths = map.files[normalizeTitle(name)]
  if (!paths?.length) return null
  return paths.length > 1 ? AMBIGUOUS : paths[0]
}

// The map as last built or patched — main's one holder, pinned to the root it was built for. A
// session switch needs no teardown: the pin makes the previous nexus's map unreadable, and the
// first ask for the new root rebuilds over it.
let held: { root: string; assetDir: string; map: AssetMap } | null = null

// Set whenever the map moves under a write of Pommora's own. `atomicWriteBinary` records its own
// write and the watcher drops the echo, so the writer is the only thing that knows the renderer
// is owed a push — and the channel that ran the write is the only thing holding a window.
let owedPush = false

export function getHeldAssetMap(root: string): AssetMap | null {
  return held?.root === root ? held.map : null
}

/** The map a write moved and nobody has been told about, once. */
export function takeAssetMapPush(root: string): AssetMap | null {
  if (!owedPush || held?.root !== root) return null
  owedPush = false
  return held.map
}

/** The map for `root`, built on first ask and held after. A changed `asset_directory` rebuilds:
 *  the held listing describes the folder it was taken from, so patching a new root's events into
 *  it would answer with paths that moved away. */
export async function liveAssetMap(root: string): Promise<AssetMap> {
  const { assetDir } = await readWatchScope(root)
  if (held?.root === root && held.assetDir === assetDir) return held.map
  const map = await buildAssetMap(root, assetDir)
  held = { root, assetDir, map }
  return map
}

/** Rebuild from disk. The map is otherwise patch-only, so the walk the watcher falls back to —
 *  which is where an unclassifiable batch lands, its asset events applied by nothing — is also
 *  where the listing must be taken again. */
export async function refreshAssetMap(root: string): Promise<AssetMap> {
  const prior = held?.root === root ? held.map : null
  const { assetDir } = await readWatchScope(root)
  // Stabilized against what was held, so a walk that moved nothing leaves the map's identity
  // alone and settle has nothing to push.
  const map = stabilize(await buildAssetMap(root, assetDir), prior)
  held = { root, assetDir, map }
  return map
}

/** Apply one asset event to the held map, answering the new map when it moved and null when it
 *  did not — a directory event, a thumbnail, cruft, or a map this root does not own. */
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
