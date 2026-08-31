import type { ColumnStyle } from '@shared/columnStyles'

/** Fold style overrides per-KEY into the saved record — style entries are objects, so an
 *  entry-level spread would wipe a column's saved sibling keys (a time_format override must
 *  not drop the saved look). */
export function mergeStyleRecords(
  saved: Record<string, ColumnStyle> | undefined,
  overrides: Record<string, ColumnStyle>,
): Record<string, ColumnStyle> {
  const folded = Object.fromEntries(
    Object.entries(overrides).map(([id, s]) => [id, { ...saved?.[id], ...s }]),
  )
  return { ...saved, ...folded }
}
