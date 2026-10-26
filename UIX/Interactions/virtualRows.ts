import { type Key, useLayoutEffect, useState } from 'react'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'

/** The one seam over the virtualizer: fixed-height rows of a list inside a scroll root, each `start` measured from the list's own top, and the row at `keep` drawn wherever it sits, with its neighbours, so the row focus last stood on outlives scrolling out of view and the arrows still step from it, since a removed element takes its focus with it. `deps` re-measure where the list sits whenever what lies above it changes. */
export function useVirtualRows(
  {
    count,
    rowHeight,
    listEl,
    scrollEl,
    keep = null,
  }: {
    count: number
    rowHeight: number
    listEl: HTMLElement | null
    scrollEl: HTMLElement | null
    keep?: number | null
  },
  deps: readonly unknown[],
): { height: number; rows: { key: Key; index: number; start: number }[] } {
  const [margin, setMargin] = useState(0)
  // Against the scroll root rather than `offsetTop`, which reads the nearest positioned ancestor: a parked content host, in a content view.
  useLayoutEffect(() => {
    if (!listEl || !scrollEl) return
    const top = listEl.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top
    setMargin(top + scrollEl.scrollTop)
  }, [listEl, scrollEl, ...deps])
  const virtual = useVirtualizer({
    count,
    getScrollElement: () => scrollEl,
    estimateSize: () => rowHeight,
    overscan: 6,
    scrollMargin: margin,
    rangeExtractor: (range) => {
      const drawn = defaultRangeExtractor(range)
      if (keep === null) return drawn
      const kept = [keep - 1, keep, keep + 1].filter((i) => i >= 0 && i < count)
      if (kept.every((i) => drawn.includes(i))) return drawn
      return [...new Set([...drawn, ...kept])].sort((a, b) => a - b)
    },
  })
  return {
    height: virtual.getTotalSize(),
    rows: virtual
      .getVirtualItems()
      .map(({ key, index, start }) => ({ key, index, start: start - margin })),
  }
}
