import { type MeasuredRow, scanSlot } from './reorderModel'

export type FrameRow = { id: string; group: 'assigned' | 'all' }

export type FrameSlot<D> = { drop: D; lineY: number | null; highlightAll: boolean }
export type Region = { top: number; bottom: number }

export const withinRegion = (r: Region, pointerY: number): boolean =>
  pointerY >= r.top && pointerY <= r.bottom

export const regionScan = (
  rows: MeasuredRow[],
  byId: Map<string, FrameRow>,
  group: FrameRow['group'],
  draggedId: string,
  pointerY: number,
  emptyTop: number,
): { i: number; lineY: number } =>
  scanSlot(
    rows.filter((r) => byId.get(r.id)?.group === group),
    draggedId,
    pointerY,
    emptyTop,
  )

export type SlotFor<D> = (
  rows: MeasuredRow[],
  byId: Map<string, FrameRow>,
  regions: { assigned: Region; all: Region },
  pointerY: number,
  draggedId: string,
) => FrameSlot<D> | null
