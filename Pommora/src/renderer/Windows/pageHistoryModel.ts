export function historyRowModel(checked: ReadonlySet<number>): { restoreTarget: number | null } {
  return { restoreTarget: checked.size === 1 ? [...checked][0] : null }
}
