import { type PointerEvent as ReactPointerEvent, useState } from 'react'
import { beginPointerGesture } from '@renderer/Interactions/gesture'

export type CellSweep = { colId: string; rows: Set<string> }

type MeasuredRow = { id: string; top: number; bottom: number }

export function useCellSweep({
  gridEl,
  onSettle,
}: {
  gridEl: () => HTMLElement | null
  onSettle: (colId: string, rowIds: string[], settleRowId: string) => void
}): {
  sweep: CellSweep | null
  begin: (rowId: string, colId: string, e: ReactPointerEvent) => void
  clear: () => void
} {
  const [sweep, setSweep] = useState<CellSweep | null>(null)

  const begin = (rowId: string, colId: string, e: ReactPointerEvent): void => {
    let rows: MeasuredRow[] = []
    let anchor = -1
    let range: [number, number] | null = null
    let stale = false

    const measure = (): boolean => {
      const grid = gridEl()
      if (!grid) return false
      rows = [...grid.querySelectorAll<HTMLElement>('.data-row:not(.ghost-row)')].flatMap((el) => {
        const id = el.dataset.rid
        if (!id) return []
        const r = el.getBoundingClientRect()
        return [{ id, top: r.top, bottom: r.bottom }]
      })
      anchor = rows.findIndex((r) => r.id === rowId)
      return anchor !== -1
    }
    const indexAt = (y: number): number => {
      for (const [i, r] of rows.entries()) if (y < r.bottom) return i
      return rows.length - 1
    }

    beginPointerGesture({
      el: e.currentTarget as HTMLElement,
      event: e,
      onActivate: () => measure(),
      onDragMove: (ev) => {
        if (stale) {
          stale = false
          if (!measure()) return
        }
        const at = indexAt(ev.clientY)
        const next: [number, number] = [Math.min(anchor, at), Math.max(anchor, at)]
        if (range && range[0] === next[0] && range[1] === next[1]) return
        range = next
        setSweep({
          colId,
          rows: new Set(rows.slice(next[0], next[1] + 1).map((r) => r.id)),
        })
      },
      onDrop: () => {
        if (!range || range[0] === range[1]) {
          setSweep(null)
          return
        }
        const swept = rows.slice(range[0], range[1] + 1).map((r) => r.id)
        const settleAt = range[0] === anchor ? range[1] : range[0]
        onSettle(colId, swept, rows[settleAt].id)
      },
      onTap: () => setSweep(null),
      onAbort: () => setSweep(null),
      onWindowScroll: () => {
        stale = true
      },
      scrollTarget: gridEl,
    })
  }

  return { sweep, begin, clear: () => setSweep(null) }
}
