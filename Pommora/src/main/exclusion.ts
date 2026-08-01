// One pure predicate unifying convention skips + user folder exclusions.

/** NFC-normalize + case-fold a single path segment for comparison. */
export function normalizeSeg(s: string): string {
  return s.normalize('NFC').toLocaleLowerCase()
}

/** A name Pommora keeps to itself: dot-prefixed (`.nexus`, `.git`, `.trash`) or underscore-
 *  prefixed (sidecars, and internal folders). The walk hides these, which is why CRUD refuses to
 *  create one — and why anything reading a Pommora-owned folder can treat such a name as its own
 *  rather than as user content. One fact, so the three readings can never drift apart. */
export function hiddenName(name: string): boolean {
  return name.startsWith('.') || name.startsWith('_')
}

/** Should this directory be skipped while walking the nexus? `relPath` is POSIX-style,
 *  '/'-joined; `excluded` is user `excluded_folders` from settings.json. */
export function shouldSkipDir(name: string, relPath: string, excluded: string[]): boolean {
  if (hiddenName(name) || name === 'node_modules') return true
  return excludedMatcher(excluded)(relPath.split('/'))
}

/** Precompiled `excluded_folders` matcher: root-anchored, whole-segment prefix match over
 *  normalized segments. Curried so per-event callers (the watcher) compile the list once. */
export function excludedMatcher(excluded: string[]): (segs: string[]) => boolean {
  const prefixes = excluded
    .map((ex) => ex.split('/').filter(Boolean).map(normalizeSeg))
    .filter((p) => p.length > 0)
  if (prefixes.length === 0) return () => false
  return (segs) => {
    const norm = segs.filter(Boolean).map(normalizeSeg)
    return prefixes.some((p) => p.every((seg, i) => norm[i] === seg))
  }
}
