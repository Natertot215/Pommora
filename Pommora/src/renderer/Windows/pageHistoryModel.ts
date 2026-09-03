export function historyRowModel(checked: ReadonlySet<number>): {
  shown: number | null
  restoreEnabled: boolean
} {
  return { shown: [...checked].at(-1) ?? null, restoreEnabled: checked.size === 1 }
}
