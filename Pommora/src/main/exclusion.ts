// One pure predicate unifying convention skips + user folder exclusions.

import { NEXUS_DIR, TRASH_DIR } from '@shared/nexusPaths'

/** A SQLite store or its journal — Pommora's own and anyone else's; none is content, and a
 *  journal's churn must never cost a walk. */
export const STORE_FILE = /\.db(-wal|-shm)?$/

/** A path segment the watcher never delivers: the trash, an install's churn, a store and its
 *  journal, and OS/editor dotfile cruft. `.nexus` is the exception — Contexts and settings live
 *  there. Shared so any lister of a watched directory skips exactly what the watcher drops. */
export function neverWatched(seg: string): boolean {
  return (
    seg === TRASH_DIR ||
    seg === 'node_modules' ||
    STORE_FILE.test(seg) ||
    (seg.startsWith('.') && seg !== NEXUS_DIR)
  )
}

/** NFC-normalize + case-fold a single path segment for comparison. */
export function normalizeSeg(s: string): string {
  return s.normalize('NFC').toLocaleLowerCase()
}

/** The segments of a nexus-relative root, empties dropped — so `'a'`, `'/a/'` and `'a//'` all
 *  count the same. Shared because that count is also the depth a path's own segments start at. */
export function rootSegs(dir: string): string[] {
  return dir.split('/').filter(Boolean)
}

/** The two settings the walk and the watcher capture at arm time. They move together, so they are
 *  compared and threaded as a unit rather than as two values that could drift out of agreement. */
export interface WatchScope {
  excluded: string[]
  assetDir: string
}

/** A name Pommora keeps to itself: dot-prefixed (`.nexus`, `.git`, `.trash`) or underscore-
 *  prefixed (sidecars, internal folders). One fact shared by the walk (hides these), CRUD
 *  (refuses to create one), and any reader treating such a name as Pommora's, not user content. */
export function hiddenName(name: string): boolean {
  return name.startsWith('.') || name.startsWith('_')
}

/** Should this directory be skipped while walking the nexus? `relPath` is POSIX-style, '/'-joined.
 *  The asset root leaves the tree the same way an excluded folder does — it holds files, not
 *  content — while remaining watched. */
export function shouldSkipDir(name: string, relPath: string, scope: WatchScope): boolean {
  const segs = relPath.split('/')
  if (assetMatcher(scope.assetDir)(segs)) return true
  if (hiddenName(name) || name === 'node_modules') return true
  return excludedMatcher(scope.excluded)(segs)
}

/** Whether a freshly-read scope is the one a watcher was armed with. Both the compiled matchers
 *  and chokidar's own ignore filter capture it at arm time, so a change to either half is structural. */
export function sameScope(a: WatchScope, b: WatchScope): boolean {
  return (
    a.assetDir === b.assetDir &&
    a.excluded.length === b.excluded.length &&
    a.excluded.every((v, i) => v === b.excluded[i])
  )
}

/** Root-anchored, whole-segment prefix match over normalized segments — the one matching rule
 *  the exclusion list and the asset root both wear. */
function prefixMatcher(paths: string[]): (segs: string[]) => boolean {
  const prefixes = paths.map((p) => rootSegs(p).map(normalizeSeg)).filter((p) => p.length > 0)
  if (!prefixes.length) return () => false
  return (segs) => {
    const norm = segs.filter(Boolean).map(normalizeSeg)
    return prefixes.some((p) => p.every((seg, i) => norm[i] === seg))
  }
}

const compiled = new WeakMap<readonly string[], (segs: string[]) => boolean>()

/** Precompiled `excluded_folders` matcher, held against the list it was compiled from, so
 *  per-entry and per-watch-event callers pay the compile once; a settings edit produces a new
 *  list, which compiles fresh. */
export function excludedMatcher(excluded: string[]): (segs: string[]) => boolean {
  const held = compiled.get(excluded)
  if (held) return held
  const match = prefixMatcher(excluded)
  compiled.set(excluded, match)
  return match
}

let compiledAsset: { dir: string; match: (segs: string[]) => boolean } | null = null

/** The same match for the asset root. Memoized on the string rather than value identity — a
 *  WeakMap cannot key on a string — and a single slot suffices since the session holds one. */
export function assetMatcher(assetDir: string): (segs: string[]) => boolean {
  if (compiledAsset?.dir !== assetDir)
    compiledAsset = { dir: assetDir, match: prefixMatcher([assetDir]) }
  return compiledAsset.match
}
