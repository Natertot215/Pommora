/** The virtualizer's stand-in for renderer suites: every row drawn, each at its fixed height's offset, since jsdom lays nothing out. */
export function useVirtualRows({ count, rowHeight }: { count: number; rowHeight: number }): {
  height: number
  rows: { key: number; index: number; start: number }[]
} {
  return {
    height: count * rowHeight,
    rows: Array.from({ length: count }, (_, index) => ({
      key: index,
      index,
      start: index * rowHeight,
    })),
  }
}
