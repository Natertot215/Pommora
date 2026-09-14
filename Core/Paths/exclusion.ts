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

/** `.nexus` is the exception, since Contexts and settings live there. Shared so any lister of a watched directory skips exactly what it drops. */
export function neverWatched(seg: string): boolean {
  return (
    seg === TRASH_DIR ||
    seg === 'node_modules' ||
    STORE_FILE.test(seg) ||
    (seg.startsWith('.') && seg !== NEXUS_DIR)
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
    if (segs[0] === TRASH_DIR)
      return !segs.slice(1).some(neverWatched) && !isExcluded(segs.slice(1))
    if (thumbnailSegs(segs)) return false
    if (rel === PROPERTY_JOURNAL_REL || rel === CONTEXT_JOURNAL_REL) return false
    if (isAsset(segs)) return !segs.slice(assetDepth).some(neverWatched)
    return !segs.some(neverWatched) && !isExcluded(segs)
  }
}

export function normalizeSeg(s: string): string {
  return foldKey(s)
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

export function hiddenName(name: string): boolean {
  return name.startsWith('.') || name.startsWith('_')
}

/** `relPath` is POSIX-style. The asset root leaves the tree the way an excluded folder does — it holds files, not content — while remaining watched. */
export function shouldSkipDir(name: string, relPath: string, scope: WatchScope): boolean {
  const segs = relPath.split('/')
  if (assetMatcher(scope.assetDir)(segs)) return true
  if (hiddenName(name) || name === 'node_modules') return true
  return excludedMatcher(scope.excluded)(segs)
}

/** Both the compiled matchers and chokidar's ignore filter capture the scope at arm time, so a change to either half is structural. */
export function sameScope(a: WatchScope, b: WatchScope): boolean {
  return (
    a.assetDir === b.assetDir &&
    a.excluded.length === b.excluded.length &&
    a.excluded.every((v, i) => v === b.excluded[i])
  )
}

function prefixMatcher(paths: string[]): (segs: string[]) => boolean {
  const prefixes = paths.map((p) => rootSegs(p).map(normalizeSeg)).filter((p) => p.length > 0)
  if (!prefixes.length) return () => false
  return (segs) => {
    const norm = segs.filter(Boolean).map(normalizeSeg)
    return prefixes.some((p) => p.every((seg, i) => norm[i] === seg))
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
