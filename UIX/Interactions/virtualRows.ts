import { type Key, useLayoutEffect, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

/** The one seam over the virtualizer: fixed-height rows of a list inside a scroll root, each `start` measured from the list's own top. `deps` re-measure where the list sits whenever what lies above it changes. */
export function useVirtualRows(
  {
    count,
    rowHeight,
    listEl,
    scrollEl,
  }: { count: number; rowHeight: number; listEl: HTMLElement | null; scrollEl: HTMLElement | null },
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
  })
  return {
    height: virtual.getTotalSize(),
    rows: virtual
      .getVirtualItems()
      .map(({ key, index, start }) => ({ key, index, start: start - margin })),
  }
}
