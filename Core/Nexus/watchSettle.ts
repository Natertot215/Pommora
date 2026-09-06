import { relative } from '../Locations/posix'
import { CONTEXTS_DIRNAME, NEXUS_DIR } from '../Locations/nexusPaths'
import {
  assetMatcher,
  excludedMatcher,
  neverWatched,
  rootSegs,
  type WatchScope,
} from '../Locations/exclusion'
import { isMarkdownFile } from '../IO/walk'
import { HOMEPAGE_HOST_DIRNAME, NEXUS_CONFIG_FILES, TILE_DOC_FILENAME } from '../Locations/paths'
import { type TileHostRef, tileHostKey } from '../Tiles/tiles'
import type { NexusTree, ValueChange } from './tree'
import { getLiveTree } from './liveTree'
import { classifyEvent, type WatchEvent } from './watchPatch'
import { containerOf, pageIdIndex } from './valuesChanged'

export function isNavPath(root: string, path: string): boolean {
  const segs = relative(root, path).split('/')
  return segs[0] === NEXUS_DIR && segs[1] === NEXUS_CONFIG_FILES.navigation
}

// We DO watch .nexus/ — Contexts and settings/state live there, so external edits to them
// must auto-refresh. Checks only the path BELOW the root, so a dot-segment in the root's own
// absolute path (e.g. a nexus under ~/.something) can't blank the whole watch.
export function ignoredUnder(root: string, scope: WatchScope): (path: string) => boolean {
  const isExcluded = excludedMatcher(scope.excluded)
  const isAsset = assetMatcher(scope.assetDir)
  const assetDepth = rootSegs(scope.assetDir).length
  return (path) => {
    const rel = relative(root, path)
    if (!rel || rel.startsWith('..')) return false
    const segs = rel.split('/')
    if (isAsset(segs)) return segs.slice(assetDepth).some(neverWatched)
    return (
      segs.some(neverWatched) ||
      // Tile bodies load through tiles:get, never the tree walk — a debounced body write must not
      // cost a re-walk. The host's document stays watched, and so does the folder entry itself,
      // since chokidar never descends into an ignored directory.
      (segs[0] === NEXUS_DIR &&
        segs[1] === HOMEPAGE_HOST_DIRNAME &&
        segs.length >= 3 &&
        segs[2] !== TILE_DOC_FILENAME) ||
      // Space hosts get the same treatment file-granularly: a tile `.md` inside a Space
      // never walks, while `_space.json` (the tree reads banner/color/tags) stays watched.
      (segs[0] === NEXUS_DIR &&
        segs[1] === CONTEXTS_DIRNAME &&
        segs.length >= 5 &&
        isMarkdownFile(segs[segs.length - 1])) ||
      isExcluded(segs)
    )
  }
}

export function valueChangesOf(
  events: WatchEvent[],
  root: string,
  scope: WatchScope,
  tree: NexusTree | null,
): ValueChange[] {
  const held = getLiveTree()
  if (!held) return []
  const byPath = pageIdIndex(tree)
  const byContainer = new Map<string, Set<string>>()
  for (const ev of events) {
    const c = classifyEvent(held, root, ev, scope)
    if (c.kind !== 'page-upsert') continue
    const container = containerOf(c.rel)
    const ids = byContainer.get(container) ?? new Set<string>()
    byContainer.set(container, ids)
    const id = byPath.get(c.rel)
    if (id) ids.add(id)
  }
  return [...byContainer].map(([rel, ids]) => ({ rel, pageIds: [...ids] }))
}

export function tilesChangedIn(
  events: WatchEvent[],
  root: string,
  scope: WatchScope,
): TileHostRef[] {
  const held = getLiveTree()
  if (!held) return []
  const hosts = new Map<string, TileHostRef>()
  for (const ev of events) {
    const c = classifyEvent(held, root, ev, scope)
    if (c.kind === 'tiles-leaf') hosts.set(tileHostKey(c.host), c.host)
  }
  return [...hosts.values()]
}
