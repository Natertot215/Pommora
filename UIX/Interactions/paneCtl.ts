import { useCallback, useEffect, useState, type RefObject } from 'react'
import { clamp } from '../Utilities/clamp'
import { useLatest } from '../Utilities/stableApi'

/** The control a pane's keys drive while focus stays with its owner. */
export interface PaneCtl {
  open: boolean
  pick: () => void
  move: (d: number) => void
  close: () => void
  aside?: (dir: 1 | -1) => boolean
}

export function usePaneCtl<T>(
  rows: readonly T[],
  resetKey: unknown,
  drive: {
    open: boolean
    pick: (row: T) => void
    close: () => void
    aside?: (dir: 1 | -1) => boolean
  },
  initial: number | null = 0,
): { index: number | null; row: T | null; ctl: RefObject<PaneCtl> } {
  const [index, setIndex] = useState<number | null>(initial)
  const count = rows.length
  const selected = index === null ? null : Math.min(index, Math.max(count - 1, 0))

  const ctl = useLatest<PaneCtl>({
    open: drive.open,
    pick: () => {
      const row = rows[selected ?? 0]
      if (row !== undefined) drive.pick(row)
    },
    move: (d) =>
      setIndex((i) =>
        i === null ? (d > 0 ? 0 : count - 1) : clamp(Math.min(i, count - 1) + d, 0, count - 1),
      ),
    close: drive.close,
    aside: drive.aside,
  })

  useEffect(() => setIndex(initial), [resetKey, initial])

  return { index: selected, row: selected === null ? null : (rows[selected] ?? null), ctl }
}

export function useKeepInView(active: unknown): (el: HTMLElement | null) => void {
  return useCallback(
    (el: HTMLElement | null) => el?.scrollIntoView({ inline: 'nearest', block: 'nearest' }),
    [active],
  )
}
