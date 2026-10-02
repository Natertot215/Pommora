import { foldKey } from './caseFold'
import {
  ASSETS_DIRNAME,
  CONTEXT_JOURNAL_REL,
  NEXUS_DIR,
  PROPERTY_JOURNAL_REL,
  THUMBNAILS_SEGMENT,
  TRASH_DIR,
} from './nexusPaths'

/** None is content, and a journal's churn must never cost a walk. */
const STORE_FILE = /\.db(-wal|-shm)?$/

const TEMP_SUFFIX = /\.\d+$/

export function hiddenName(name: string): boolean {
  return name.startsWith('.') || name.startsWith('_')
}

/** A folder the app never enters: hidden behind a leading dot or underscore, or a package cache. */
export function hiddenFolder(name: string): boolean {
  return hiddenName(name) || name === 'node_modules'
}

/** `.nexus` is the exception, since Contexts and settings live there. Every folder on the way is held to `hiddenFolder`, while the leaf is held only to the dot, since sidecars carry the underscore. Shared so any lister of a watched directory skips exactly what it drops. */
export function neverWatched(segs: string[]): boolean {
  const leaf = segs.length - 1
  return segs.some(
    (seg, i) =>
      !(i === 0 && seg === NEXUS_DIR) &&
      (i < leaf
        ? hiddenFolder(seg)
        : seg.startsWith('.') || seg === 'node_modules' || STORE_FILE.test(seg)),
  )
}

const thumbnailSegs = (segs: string[]): boolean =>
  segs.length > 3 &&
  segs[0] === NEXUS_DIR &&
  segs[1] === ASSETS_DIRNAME &&
  segs[3] === THUMBNAILS_SEGMENT

export function manifestAdmits(
  scope: WatchScope,
): (rel: string, siblings?: ReadonlySet<string>) => boolean {
  const isExcluded = excludedMatcher(scope.excluded)
  const isAsset = assetMatcher(scope.assetDir)
  const assetDepth = rootSegs(scope.assetDir).length
  return (rel, siblings) => {
    if (!rel || rel === '..' || rel.startsWith('../') || rel.startsWith('/')) return false
    const segs = rel.split('/')
    const name = segs[segs.length - 1]
    if (TEMP_SUFFIX.test(name) && siblings?.has(name.replace(TEMP_SUFFIX, ''))) return false
    if (segs[0] === TRASH_DIR) return !neverWatched(segs.slice(1)) && !isExcluded(segs.slice(1))
    if (thumbnailSegs(segs)) return false
    if (rel === PROPERTY_JOURNAL_REL || rel === CONTEXT_JOURNAL_REL) return false
    if (isAsset(segs)) return !neverWatched(segs.slice(assetDepth))
    return !neverWatched(segs) && !isExcluded(segs)
  }
}

/** Empties dropped, so `'a'`, `'/a/'` and `'a//'` all count the same — and that count is also the depth a path's own segments start at. */
export function rootSegs(dir: string): string[] {
  return dir.split('/').filter(Boolean)
}

/** Captured at arm time by both the walk and the watcher, and threaded as a unit so the two halves cannot drift out of agreement. */
export interface WatchScope {
  excluded: string[]
  assetDir: string
}

export type OutsideReason = 'hidden' | 'asset' | 'excluded'

/** What keeps a nexus-relative path outside the content the app reads, or null: a hidden folder or name on the way, the asset root (which holds files rather than content while remaining watched), or an excluded folder. */
export function outsideContent(rel: string, scope: WatchScope): OutsideReason | null {
  const segs = rel.split('/')
  if (segs.some(hiddenFolder)) return 'hidden'
  if (assetMatcher(scope.assetDir)(segs)) return 'asset'
  return excludedMatcher(scope.excluded)(segs) ? 'excluded' : null
}

/** The scope of a deliberate reach into excluded folders, which still passes hidden folders and the asset root by. Clear Exclusion Cache and the legacy asset migration are the two; every other enumerator keeps excluded folders out. */
export const reachingExcluded = (scope: WatchScope): WatchScope => ({ ...scope, excluded: [] })

/** Both the compiled matchers and chokidar's ignore filter capture the scope at arm time, so a change to either half is structural. */
export function sameScope(a: WatchScope, b: WatchScope): boolean {
  return (
    a.assetDir === b.assetDir &&
    a.excluded.length === b.excluded.length &&
    a.excluded.every((v, i) => v === b.excluded[i])
  )
}

/** What `segs` holds below `dirSegs`, compared case-folded; `dirSegs` arrive already folded, so a matcher folds its prefixes once. Null when `segs` isn't under it. */
export function remainderUnder(segs: string[], dirSegs: string[]): string[] | null {
  const under = dirSegs.every((seg, i) => i < segs.length && foldKey(segs[i]) === seg)
  return under ? segs.slice(dirSegs.length) : null
}

export const entryWithin = (entry: string, rel: string): string[] | null =>
  remainderUnder(rootSegs(entry), rootSegs(rel).map(foldKey))

function prefixMatcher(paths: string[]): (segs: string[]) => boolean {
  const prefixes = paths.map((p) => rootSegs(p).map(foldKey)).filter((p) => p.length > 0)
  if (!prefixes.length) return () => false
  return (segs) => {
    const clean = segs.filter(Boolean)
    return prefixes.some((p) => remainderUnder(clean, p) !== null)
  }
}

const compiled = new WeakMap<readonly string[], (segs: string[]) => boolean>()

/** Held against the list it was compiled from, so per-entry and per-event callers pay the compile once. */
export function excludedMatcher(excluded: string[]): (segs: string[]) => boolean {
  const held = compiled.get(excluded)
  if (held) return held
  const match = prefixMatcher(excluded)
  compiled.set(excluded, match)
  return match
}

let compiledAsset: { dir: string; match: (segs: string[]) => boolean } | null = null

/** Memoized on the string, since a WeakMap cannot key on one; a single slot suffices because the session holds one asset root. */
export function assetMatcher(assetDir: string): (segs: string[]) => boolean {
  if (compiledAsset?.dir !== assetDir)
    compiledAsset = { dir: assetDir, match: prefixMatcher([assetDir]) }
  return compiledAsset.match
}
