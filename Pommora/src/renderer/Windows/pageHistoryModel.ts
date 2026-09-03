import type { SnapshotRow } from '@shared/types'

/** What the history list derives from its rows and its checks: the checks that still name a listed
 *  snapshot, the snapshot the body shows (null is Current Version), whether Restore is live, and
 *  which rows carry the trash glyph. */
export function historyRowModel(
  rows: readonly SnapshotRow[],
  checked: ReadonlySet<number>,
  lastChecked: number | null,
): {
  checkedLive: readonly number[]
  shown: number | null
  restoreEnabled: boolean
  glyphOn: (ts: number) => boolean
} {
  const listed = new Set(rows.map((r) => r.ts))
  const checkedLive = [...checked].filter((ts) => listed.has(ts))
  const shown =
    lastChecked !== null && checkedLive.includes(lastChecked)
      ? lastChecked
      : (checkedLive.at(-1) ?? null)
  return {
    checkedLive,
    shown,
    restoreEnabled: checkedLive.length === 1,
    glyphOn: (ts) => listed.has(ts) && checked.has(ts),
  }
}
