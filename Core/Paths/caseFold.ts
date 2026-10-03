// Case folding and title collation must land the same on every device, so both pin their locale
// rather than read the host's — a Turkish machine folds `I` the way an English one does.

const titleCollator = new Intl.Collator('en', { sensitivity: 'accent' })

/** The locale-independent comparison key a path segment, title, or frontmatter key matches by. Lowercase precedes NFC so a title's stored membership key is byte-identical to what the index already holds. */
export function foldKey(text: string): string {
  return text.toLowerCase().normalize('NFC')
}

/** Every spelling `names` holds of `name`: its exact spelling first, then each other that folds to it, in order. */
export function spellings(names: readonly string[], name: string): string[] {
  const fold = foldKey(name)
  const others = names.filter((n) => n !== name && foldKey(n) === fold)
  return names.includes(name) ? [name, ...others] : others
}

export const heldKeys = (root: object, name: string): string[] => spellings(Object.keys(root), name)

/** The key `root` reads `name` under; an exact spelling answers before anything folds. */
export const heldKey = (root: object, name: string): string | undefined =>
  Object.hasOwn(root, name) ? name : heldKeys(root, name)[0]

/** A host-independent ordering for user-visible titles; accent-sensitive and case-insensitive, matching the value sort. */
export function compareTitles(a: string, b: string): number {
  return titleCollator.compare(a, b)
}

export function matchScore(t: string, q: string): number | null {
  let ti = 0
  let score = 0
  let streak = 0
  for (const ch of q) {
    const idx = t.indexOf(ch, ti)
    if (idx === -1) return null
    if (idx === ti) {
      streak++
      score += 2 + streak
    } else {
      streak = 0
      score += 1
    }
    if (idx === 0 || t[idx - 1] === ' ') score += 3
    ti = idx + 1
  }
  return score - t.length * 0.01
}

type Ranked<T> = { item: T; score: number }

export function rankMatches<T extends { title: string }>(
  items: readonly T[],
  scoreOf: (item: T) => number | null,
  cap = Number.POSITIVE_INFINITY,
): T[] {
  const before = (a: Ranked<T>, b: Ranked<T>): number =>
    b.score - a.score || compareTitles(a.item.title, b.item.title)
  const kept: Ranked<T>[] = []
  for (const item of items) {
    const score = scoreOf(item)
    if (score === null) continue
    const hit = { item, score }
    if (kept.length === cap && before(hit, kept[cap - 1]) >= 0) continue
    let lo = 0
    let hi = kept.length
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (before(kept[mid], hit) <= 0) lo = mid + 1
      else hi = mid
    }
    kept.splice(lo, 0, hit)
    if (kept.length > cap) kept.pop()
  }
  return kept.map((k) => k.item)
}
