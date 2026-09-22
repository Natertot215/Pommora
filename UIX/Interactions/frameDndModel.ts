import type { MeasuredRow } from './reorderModel'

export type FrameRow = { id: string; group: 'assigned' | 'all' }

export type FrameSlot<D> = { drop: D; lineY: number | null; highlightAll: boolean }
export type Region = { top: number; bottom: number }

export const withinRegion = (r: Region, pointerY: number): boolean =>
  pointerY >= r.top && pointerY <= r.bottom

export function regionScan(
  rows: MeasuredRow[],
  byId: Map<string, FrameRow>,
  group: FrameRow['group'],
  draggedId: string,
  pointerY: number,
  emptyTop: number,
): { i: number; lineY: number } {
  const groupRows = rows.filter((r) => byId.get(r.id)?.group === group && r.id !== draggedId)
  let i = 0
  while (i < groupRows.length && pointerY >= groupRows[i].mid) i++
  const last = groupRows[groupRows.length - 1]
  const lineY = i < groupRows.length ? groupRows[i].top : last ? last.bottom : emptyTop
  return { i, lineY }
}

export type SlotFor<D> = (
  rows: MeasuredRow[],
  byId: Map<string, FrameRow>,
  regions: { assigned: Region; all: Region },
  pointerY: number,
  draggedId: string,
) => FrameSlot<D> | null
