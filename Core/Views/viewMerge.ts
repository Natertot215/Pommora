import type { ColumnStyle } from '@pommora/core/Properties/columnStyles'

/** Fold style overrides per-KEY: style entries are objects, so an entry-level spread would wipe a column's saved sibling keys. */
export function mergeStyleRecords(
  saved: Record<string, ColumnStyle> | undefined,
  overrides: Record<string, ColumnStyle>,
): Record<string, ColumnStyle> {
  const folded = Object.fromEntries(
    Object.entries(overrides).map(([id, s]) => [id, { ...saved?.[id], ...s }]),
  )
  return { ...saved, ...folded }
}
