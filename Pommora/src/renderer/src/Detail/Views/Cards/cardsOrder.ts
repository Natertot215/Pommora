// Pure card-order helpers — extracted so the drag/order seams are unit-testable off the React tree.
// The manual-order gate the pipeline sorter reads lives in pipeline/sort.ts (resolveManualOrder), shared
// with the table.

export function reorderIds(ids: string[], activeId: string, overId: string): string[] {
  const from = ids.indexOf(activeId)
  const to = ids.indexOf(overId)
  if (from === -1 || to === -1 || from === to) return [...ids]
  const next = [...ids]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
