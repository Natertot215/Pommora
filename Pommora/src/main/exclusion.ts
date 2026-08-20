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

/** Whether a freshly-read `excluded_folders` is the list a watcher was armed with. Both the
 *  compiled matcher and chokidar's own ignore filter capture the list at arm time, so a change
 *  to it is structural — the classifier and the settings-leaf arm ask this same question. */
export function sameExclusions(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

const compiled = new WeakMap<readonly string[], (segs: string[]) => boolean>()

/** Precompiled `excluded_folders` matcher: root-anchored, whole-segment prefix match over
 *  normalized segments. Held against the list it was compiled from, so the callers that ask per
 *  directory entry and per watch event pay the compile once — the session holds one such list,
 *  and a settings edit produces a new one, which compiles fresh. */
export function excludedMatcher(excluded: string[]): (segs: string[]) => boolean {
  const held = compiled.get(excluded)
  if (held) return held
  const prefixes = excluded
    .map((ex) => ex.split('/').filter(Boolean).map(normalizeSeg))
    .filter((p) => p.length > 0)
  const match: (segs: string[]) => boolean = prefixes.length
    ? (segs) => {
        const norm = segs.filter(Boolean).map(normalizeSeg)
        return prefixes.some((p) => p.every((seg, i) => norm[i] === seg))
      }
    : () => false
  compiled.set(excluded, match)
  return match
}
