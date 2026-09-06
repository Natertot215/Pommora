// One pure predicate unifying convention skips + user folder exclusions.

import { NEXUS_DIR, TRASH_DIR } from './nexusPaths'

/** None is content, and a journal's churn must never cost a walk. */
const STORE_FILE = /\.db(-wal|-shm)?$/

/** A path segment the watcher never delivers; `.nexus` is the exception, since Contexts and
 *  settings live there. Shared so any lister of a watched directory skips exactly what it drops. */
export function neverWatched(seg: string): boolean {
  return (
    seg === TRASH_DIR ||
    seg === 'node_modules' ||
    STORE_FILE.test(seg) ||
    (seg.startsWith('.') && seg !== NEXUS_DIR)
  )
}

export function normalizeSeg(s: string): string {
  return s.normalize('NFC').toLocaleLowerCase()
}

/** Empties dropped, so `'a'`, `'/a/'` and `'a//'` all count the same — and that count is also the
 *  depth a path's own segments start at. */
export function rootSegs(dir: string): string[] {
  return dir.split('/').filter(Boolean)
}

/** Captured at arm time by both the walk and the watcher, and threaded as a unit so the two
 *  halves cannot drift out of agreement. */
export interface WatchScope {
  excluded: string[]
  assetDir: string
}

/** A name Pommora keeps to itself: dot-prefixed, or underscore-prefixed like a sidecar. */
export function hiddenName(name: string): boolean {
  return name.startsWith('.') || name.startsWith('_')
}

/** `relPath` is POSIX-style. The asset root leaves the tree the way an excluded folder does — it
 *  holds files, not content — while remaining watched. */
export function shouldSkipDir(name: string, relPath: string, scope: WatchScope): boolean {
  const segs = relPath.split('/')
  if (assetMatcher(scope.assetDir)(segs)) return true
  if (hiddenName(name) || name === 'node_modules') return true
  return excludedMatcher(scope.excluded)(segs)
}

/** Both the compiled matchers and chokidar's ignore filter capture the scope at arm time, so a
 *  change to either half is structural. */
export function sameScope(a: WatchScope, b: WatchScope): boolean {
  return (
    a.assetDir === b.assetDir &&
    a.excluded.length === b.excluded.length &&
    a.excluded.every((v, i) => v === b.excluded[i])
  )
}

/** The one matching rule the exclusion list and the asset root both use. */
function prefixMatcher(paths: string[]): (segs: string[]) => boolean {
  const prefixes = paths.map((p) => rootSegs(p).map(normalizeSeg)).filter((p) => p.length > 0)
  if (!prefixes.length) return () => false
  return (segs) => {
    const norm = segs.filter(Boolean).map(normalizeSeg)
    return prefixes.some((p) => p.every((seg, i) => norm[i] === seg))
  }
}

const compiled = new WeakMap<readonly string[], (segs: string[]) => boolean>()

/** Held against the list it was compiled from, so per-entry and per-event callers pay the compile
 *  once; a settings edit produces a new list, which compiles fresh. */
export function excludedMatcher(excluded: string[]): (segs: string[]) => boolean {
  const held = compiled.get(excluded)
  if (held) return held
  const match = prefixMatcher(excluded)
  compiled.set(excluded, match)
  return match
}

let compiledAsset: { dir: string; match: (segs: string[]) => boolean } | null = null

/** Memoized on the string, since a WeakMap cannot key on one; a single slot suffices because the
 *  session holds one asset root. */
export function assetMatcher(assetDir: string): (segs: string[]) => boolean {
  if (compiledAsset?.dir !== assetDir)
    compiledAsset = { dir: assetDir, match: prefixMatcher([assetDir]) }
  return compiledAsset.match
}
