// The filename→path map resolution answers against. Assets are named the way Obsidian names
// them — by basename, not by path — so one map from a listing of the asset root is the whole
// mechanism. It mirrors `buildPageIndex`: a normalized-name map answering resolved, phantom, or
// ambiguous, so the trichotomy has one meaning across pages and files alike.
//
// Held in memory and never persisted. Nothing derived from an asset needs to survive a restart,
// which is what keeps `nexus.db`'s stat gate, seed and prune out of this feature entirely.

import { relative, sep } from 'node:path'
import { normalizeTitle } from '@shared/connections'
import { THUMBNAILS_SEGMENT } from '@shared/nexusPaths'
import type { AssetMap } from '@shared/types'
import { neverWatched } from './exclusion'
import { assetsDir } from './paths'
import { listFilesRecursive } from './io/walk'
import { readWatchScope } from './settings'
import type { WatchEventName } from './watchPatch'

const EMPTY: AssetMap = { files: {}, version: 0 }

/** Whether this path is one the map may hold. Thumbnails are Pommora's own derived files, and
 *  the cruft rule matches the watcher's, so the map never holds what no event can update. */
function indexable(rel: string): boolean {
  return !rel.split('/').some((seg) => seg === THUMBNAILS_SEGMENT || neverWatched(seg))
}

const nameOf = (rel: string): string => normalizeTitle(rel.split('/').pop() ?? '')

/** Every file under the asset root, keyed by normalized basename, each name holding every path
 *  that answers to it in sorted order. */
export async function buildAssetMap(root: string, assetDir: string): Promise<AssetMap> {
  const abs = await listFilesRecursive(assetsDir(root, assetDir))
  const files: Record<string, string[]> = {}
  for (const rel of abs.map((p) => relative(root, p).split(sep).join('/')).filter(indexable)) {
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
): AssetMap {
  if (!indexable(rel)) return map
  const name = nameOf(rel)
  if (!name) return map
  const version = map.version + 1
  if (event === 'change') return { ...map, version }
  const held = map.files[name] ?? []
  const paths =
    event === 'add' ? [...held.filter((p) => p !== rel), rel].sort() : held.filter((p) => p !== rel)
  const files = { ...map.files, [name]: paths }
  if (!paths.length) delete files[name]
  return { files, version }
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
let held: { root: string; map: AssetMap } | null = null

export const emptyAssetMap = (): AssetMap => EMPTY

export function getHeldAssetMap(root: string): AssetMap | null {
  return held?.root === root ? held.map : null
}

/** The map for `root`, built on first ask and held after. */
export async function liveAssetMap(root: string): Promise<AssetMap> {
  const already = getHeldAssetMap(root)
  if (already) return already
  const map = await buildAssetMap(root, (await readWatchScope(root)).assetDir)
  held = { root, map }
  return map
}

/** Apply one asset event to the held map, answering the new map when it moved and null when it
 *  did not — a directory event, a thumbnail, cruft, or a map this root does not own. */
export function patchHeldAssetMap(
  root: string,
  rel: string,
  event: WatchEventName,
): AssetMap | null {
  const current = getHeldAssetMap(root)
  if (!current) return null
  if (event !== 'add' && event !== 'change' && event !== 'unlink') return null
  const next = patchAssetMap(current, rel, event)
  if (next === current) return null
  held = { root, map: next }
  return next
}
