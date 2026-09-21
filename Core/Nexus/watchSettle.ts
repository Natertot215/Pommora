import { relDirname, relative } from '../Paths/posix'
import { escapes } from '../Paths/pathSafety'
import { CONTEXTS_DIRNAME, NEXUS_DIR } from '../Paths/nexusPaths'
import {
  assetMatcher,
  excludedMatcher,
  neverWatched,
  rootSegs,
  type WatchScope,
} from '../Paths/exclusion'
import { isMarkdownFile } from '../Files/walk'
import { HOMEPAGE_HOST_DIRNAME, NEXUS_CONFIG_FILES, TILE_DOC_FILENAME } from '../Paths/paths'
import { type TileHostRef, tileHostKey } from '../Tiles/tiles'
import type { ValueChange } from './tree'
import { getLiveTree } from './liveTree'
import { classifyEvent, type WatchClass, type WatchEvent, type WatchEventName } from './watchPatch'

export function isConfigPath(
  root: string,
  path: string,
  file: keyof typeof NEXUS_CONFIG_FILES,
): boolean {
  const segs = relative(root, path).split('/')
  return segs[0] === NEXUS_DIR && segs[1] === NEXUS_CONFIG_FILES[file]
}

export function tileBodyUnder(segs: string[], rel: string): boolean {
  return (
    (segs[0] === NEXUS_DIR &&
      segs[1] === HOMEPAGE_HOST_DIRNAME &&
      segs.length >= 3 &&
      segs[2] !== TILE_DOC_FILENAME &&
      rel !== `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.homepage}`) ||
    (segs[0] === NEXUS_DIR &&
      segs[1] === CONTEXTS_DIRNAME &&
      segs.length >= 5 &&
      isMarkdownFile(segs[segs.length - 1]))
  )
}

let tap: ((ev: WatchEvent) => void) | null = null

export function setWatchTap(fn: ((ev: WatchEvent) => void) | null): void {
  tap = fn
}

export function emitWatch(event: WatchEventName, absPath: string): void {
  if (tap) tap({ event, absPath })
}

export function tileBodyOf(root: string): (path: string) => boolean {
  return (path) => {
    const rel = relative(root, path)
    if (!rel || escapes(rel)) return false
    return tileBodyUnder(rel.split('/'), rel)
  }
}

// We DO watch .nexus/ — Contexts and settings/state live there. Checks only the path BELOW the root, so a dot-segment in the root's own absolute path (a nexus under ~/.something) can't blank the whole watch.
export function syncIgnoredUnder(root: string, scope: WatchScope): (path: string) => boolean {
  const isExcluded = excludedMatcher(scope.excluded)
  const isAsset = assetMatcher(scope.assetDir)
  const assetDepth = rootSegs(scope.assetDir).length
  return (path) => {
    const rel = relative(root, path)
    if (!rel || escapes(rel)) return false
    const segs = rel.split('/')
    if (isAsset(segs)) return segs.slice(assetDepth).some(neverWatched)
    return segs.some(neverWatched) || isExcluded(segs)
  }
}

export function classifyBatch(events: WatchEvent[], root: string, scope: WatchScope): WatchClass[] {
  const held = getLiveTree()
  if (!held) return []
  return events.map((ev) => classifyEvent(held, root, ev, scope))
}

export function valueChangesOf(
  classified: WatchClass[],
  byPath: ReadonlyMap<string, string>,
): ValueChange[] {
  const byContainer = new Map<string, Set<string>>()
  for (const c of classified) {
    if (c.kind !== 'page-upsert') continue
    const container = relDirname(c.rel)
    const ids = byContainer.get(container) ?? new Set<string>()
    byContainer.set(container, ids)
    const id = byPath.get(c.rel)
    if (id) ids.add(id)
  }
  return [...byContainer].map(([rel, ids]) => ({ rel, pageIds: [...ids] }))
}

export function tilesChangedIn(classified: WatchClass[]): TileHostRef[] {
  const hosts = new Map<string, TileHostRef>()
  for (const c of classified) if (c.kind === 'tiles-leaf') hosts.set(tileHostKey(c.host), c.host)
  return [...hosts.values()]
}

export function pagesChangedIn(classified: WatchClass[]): string[] {
  const rels = new Set<string>()
  for (const c of classified) if (c.kind === 'page-upsert') rels.add(c.rel)
  return [...rels]
}
