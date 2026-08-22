// One pure predicate unifying convention skips + user folder exclusions.

/** NFC-normalize + case-fold a single path segment for comparison. */
export function normalizeSeg(s: string): string {
  return s.normalize('NFC').toLocaleLowerCase()
}

/** The two settings the walk and the watcher capture at arm time. They move together — a change
 *  to either one moves what can be seen at all — so they are compared and threaded as a unit
 *  rather than as two values with two comparisons to keep in agreement. */
export interface WatchScope {
  excluded: string[]
  assetDir: string
}

/** A name Pommora keeps to itself: dot-prefixed (`.nexus`, `.git`, `.trash`) or underscore-
 *  prefixed (sidecars, and internal folders). The walk hides these, which is why CRUD refuses to
 *  create one — and why anything reading a Pommora-owned folder can treat such a name as its own
 *  rather than as user content. One fact, so the three readings can never drift apart. */
export function hiddenName(name: string): boolean {
  return name.startsWith('.') || name.startsWith('_')
}

/** Should this directory be skipped while walking the nexus? `relPath` is POSIX-style,
 *  '/'-joined. The asset root leaves the tree the same way an excluded folder does — it holds
 *  files, not content — while remaining watched, which is the watcher's own concern. */
export function shouldSkipDir(name: string, relPath: string, scope: WatchScope): boolean {
  const segs = relPath.split('/')
  if (assetMatcher(scope.assetDir)(segs)) return true
  if (hiddenName(name) || name === 'node_modules') return true
  return excludedMatcher(scope.excluded)(segs)
}

/** Whether a freshly-read scope is the one a watcher was armed with. Both the compiled matchers
 *  and chokidar's own ignore filter capture it at arm time, so a change to either half is
 *  structural — the classifier and the settings-leaf arm ask this same question. */
export function sameScope(a: WatchScope, b: WatchScope): boolean {
  return (
    a.assetDir === b.assetDir &&
    a.excluded.length === b.excluded.length &&
    a.excluded.every((v, i) => v === b.excluded[i])
  )
}

/** Root-anchored, whole-segment prefix match over normalized segments — the one matching rule
 *  the exclusion list and the asset root both wear. An empty prefix set matches nothing. */
function prefixMatcher(paths: string[]): (segs: string[]) => boolean {
  const prefixes = paths
    .map((p) => p.split('/').filter(Boolean).map(normalizeSeg))
    .filter((p) => p.length > 0)
  if (!prefixes.length) return () => false
  return (segs) => {
    const norm = segs.filter(Boolean).map(normalizeSeg)
    return prefixes.some((p) => p.every((seg, i) => norm[i] === seg))
  }
}

const compiled = new WeakMap<readonly string[], (segs: string[]) => boolean>()

/** Precompiled `excluded_folders` matcher, held against the list it was compiled from, so the
 *  callers that ask per directory entry and per watch event pay the compile once — the session
 *  holds one such list, and a settings edit produces a new one, which compiles fresh. */
export function excludedMatcher(excluded: string[]): (segs: string[]) => boolean {
  const held = compiled.get(excluded)
  if (held) return held
  const match = prefixMatcher(excluded)
  compiled.set(excluded, match)
  return match
}

let compiledAsset: { dir: string; match: (segs: string[]) => boolean } | null = null

/** The same match for the asset root. Memoized on the string rather than against the value's
 *  identity — a WeakMap cannot key on one — and a single slot suffices: the session holds one
 *  asset root, and a settings edit re-arms the watcher with the new one. */
export function assetMatcher(assetDir: string): (segs: string[]) => boolean {
  if (compiledAsset?.dir !== assetDir)
    compiledAsset = { dir: assetDir, match: prefixMatcher([assetDir]) }
  return compiledAsset.match
}
