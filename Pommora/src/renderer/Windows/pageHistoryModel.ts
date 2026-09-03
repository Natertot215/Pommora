import type { SnapshotRow } from '@shared/types'

/** What the history list derives from its rows and its checks: the snapshot the body shows (null
 *  is Current Version), whether Restore is live, and which rows carry the trash glyph. */
export function historyRowModel(
  rows: readonly SnapshotRow[],
  checked: ReadonlySet<number>,
  lastChecked: number | null,
): { shown: number | null; restoreEnabled: boolean; glyphOn: (ts: number) => boolean } {
  const listed = new Set(rows.map((r) => r.ts))
  const live = [...checked].filter((ts) => listed.has(ts))
  const shown =
    lastChecked !== null && live.includes(lastChecked) ? lastChecked : (live.at(-1) ?? null)
  return {
    shown,
    restoreEnabled: live.length === 1,
    glyphOn: (ts) => listed.has(ts) && checked.has(ts),
  }
}
