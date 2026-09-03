import type { SnapshotRow } from '@shared/types'

/** What the history list derives from its rows and its checks: the checks that still name a listed
 *  snapshot, whether Restore is live, and which rows carry the trash glyph. */
export function historyRowModel(
  rows: readonly SnapshotRow[],
  checked: ReadonlySet<number>,
): { checkedLive: readonly number[]; restoreEnabled: boolean; glyphOn: (ts: number) => boolean } {
  const listed = new Set(rows.map((r) => r.ts))
  const checkedLive = [...checked].filter((ts) => listed.has(ts))
  return {
    checkedLive,
    restoreEnabled: checkedLive.length === 1,
    glyphOn: (ts) => listed.has(ts) && checked.has(ts),
  }
}
