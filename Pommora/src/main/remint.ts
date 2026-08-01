// The re-mint half of the record: a duplicated id — content or container — stops sharing its
// twin's identity. The prior session's baseline names the path that legitimately held each id;
// what sits there is the original, everything else takes a fresh id. Pure adjudication here;
// the writes ride beside it.

import type { EntityRecord, RecordKind } from '@shared/record'
import type { Baseline } from './record'

export interface RemintTarget {
  /** The shared id being vacated — the write half mints the replacement. */
  id: string
  kind: RecordKind
  path: string
}

/** Who keeps a contested id. The recorded path is the only non-re-derivable fact, so it is the
 *  whole verdict: a readable claimant there is the original and every other claimant re-mints —
 *  an ambiguous mark is preserved evidence and is spent the session its path answers again.
 *  Everything else defers: no baseline, no entry, an unreadable recorded path (never guess),
 *  or no claimant at it (unadjudicable — the baseline writer drops that entry). */
export function adjudicate(
  duplicates: Record<string, EntityRecord[]>,
  prior: Baseline | null,
  unreadablePaths: readonly string[],
): { remint: RemintTarget[]; defer: string[] } {
  const remint: RemintTarget[] = []
  const defer: string[] = []
  const unreadable = new Set(unreadablePaths)
  for (const [id, claims] of Object.entries(duplicates)) {
    const p = prior?.[id]
    if (!p || unreadable.has(p.path) || !claims.some((c) => c.path === p.path)) {
      defer.push(id)
      continue
    }
    for (const c of claims)
      if (c.path !== p.path) remint.push({ id: c.id, kind: c.kind, path: c.path })
  }
  return { remint, defer }
}
