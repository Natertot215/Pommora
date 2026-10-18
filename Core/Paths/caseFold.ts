// Case folding and title collation must land the same on every device, so both pin their locale
// rather than read the host's — a Turkish machine folds `I` the way an English one does.

const titleCollator = new Intl.Collator('en', { sensitivity: 'accent' })

/** The locale-independent comparison key a path segment, title, or frontmatter key matches by. Lowercase precedes NFC so a title's stored membership key is byte-identical to what the index already holds. */
export function foldKey(text: string): string {
  return text.toLowerCase().normalize('NFC')
}

/** `foldKey` of any scalar's trimmed text: a YAML scalar `- 2024` off disk still matches "2024", and NFC lets an NFD-composed outside write match the NFC title it names. */
export function normalizeTitle(raw: unknown): string {
  return foldKey(String(raw).trim())
}

/** A host-independent ordering for user-visible titles; accent-sensitive and case-insensitive, matching the value sort. */
export function compareTitles(a: string, b: string): number {
  return titleCollator.compare(a, b)
}

function foldedScore(t: string, q: string): number | null {
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

/** A search's view of an item: its folded name, and where it has a location, that location and the name as one string of words. */
export interface MatchKey {
  name: string
  place?: string
}

/** A query, or a key's text, folded with every run of `/` and spaces one word break, so `Pommora/Cl`, `Pommora / Cl`, and `pommora cl` ask the same and a heading `Q1/Q2` answers both. */
export const matchQuery = (raw: string): string => foldKey(raw.replace(/[\s/]+/g, ' ').trim())

export const matchKey = (name: string, place = ''): MatchKey =>
  place
    ? { name: matchQuery(name), place: matchQuery(`${place}/${name}`) }
    : { name: matchQuery(name) }

// A name's score tops out near 34,000 at the 255 characters a link slot holds, so a location's sits under every name's.
const UNDER_NAMES = 100_000

/** The name's score where the name matches, else the location's, seated below every name match: a plain title query ranks as the name alone does, and a folder query reaches through the location. */
export function matchScore(key: MatchKey, q: string): number | null {
  const name = foldedScore(key.name, q)
  if (name !== null) return name
  const place = key.place === undefined ? null : foldedScore(key.place, q)
  return place === null ? null : place - UNDER_NAMES
}

type Ranked<T> = { item: T; score: number; name: string }

/** The items whose key matches `q`, best first, a tie broken by name. */
export function rankMatches<T>(
  items: readonly T[],
  q: string,
  keyOf: (item: T) => MatchKey,
  cap = Number.POSITIVE_INFINITY,
): T[] {
  const before = (a: Ranked<T>, b: Ranked<T>): number =>
    b.score - a.score || compareTitles(a.name, b.name)
  const kept: Ranked<T>[] = []
  for (const item of items) {
    const key = keyOf(item)
    const score = matchScore(key, q)
    if (score === null) continue
    const hit = { item, score, name: key.name }
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
