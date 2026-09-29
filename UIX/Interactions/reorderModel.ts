export type Row = {
  id: string
  top: number
  bottom: number
  mid: number
  left: number
  right: number
}
export type Geometry = { rows: Row[]; groups: ReadonlyMap<string, Row>; bottom: number }

export const INTO_EDGE = 0.25

export function rank(sorted: readonly number[], y: number): number {
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (y < sorted[mid]) hi = mid
    else lo = mid + 1
  }
  return lo
}

export type LaneSlot = { lane: string; index: number; before: string | null; edge: number }

type Lane = {
  key: string
  top: number
  bottom: number
  own: number
  mids: readonly number[]
  slots: readonly LaneSlot[]
}

export type Lanes = { list: readonly Lane[]; splits: readonly number[]; home: Lane | undefined }

const LIST = 'list'
const NO_BOXES: ReadonlyMap<string, Row> = new Map()

type Run = { rows: Row[]; top: number; bottom: number; own: number }

export function buildLanes(
  rows: readonly Row[],
  draggedId: string,
  laneOf: (id: string) => string | undefined = () => LIST,
  boxes: ReadonlyMap<string, Row> = NO_BOXES,
): Lanes {
  const runs = new Map<string, Run>()
  const runOf = (key: string): Run => {
    let run = runs.get(key)
    if (!run) {
      run = { rows: [], top: Number.POSITIVE_INFINITY, bottom: Number.NEGATIVE_INFINITY, own: -1 }
      runs.set(key, run)
    }
    return run
  }
  for (const key of boxes.keys()) runOf(key)
  let home: string | undefined
  for (const r of rows) {
    const key = laneOf(r.id)
    if (key === undefined) continue
    const run = runOf(key)
    run.top = Math.min(run.top, r.top)
    run.bottom = Math.max(run.bottom, r.bottom)
    if (r.id !== draggedId) run.rows.push(r)
    else {
      home = key
      run.own = run.rows.length
    }
  }
  const list: Lane[] = []
  for (const [key, run] of runs) {
    const box = boxes.get(key) ?? (run.top <= run.bottom ? run : undefined)
    if (!box) continue
    list.push({
      key,
      top: box.top,
      bottom: box.bottom,
      own: run.own,
      mids: run.rows.map((r) => r.mid),
      slots: Array.from({ length: run.rows.length + 1 }, (_, index) => ({
        lane: key,
        index,
        before: run.rows[index]?.id ?? null,
        edge: run.rows[index]?.top ?? run.rows.at(-1)?.bottom ?? box.top,
      })),
    })
  }
  list.sort((a, b) => a.top - b.top)
  return {
    list,
    splits: list.slice(1).map((lane, i) => (list[i].bottom + lane.top) / 2),
    home: list.find((lane) => lane.key === home),
  }
}

export const laneAt = (lanes: Lanes, y: number): Lane | undefined =>
  lanes.list[rank(lanes.splits, y)]

export function rowSlot(lane: Lane | undefined, y: number): LaneSlot | null {
  if (!lane) return null
  const i = rank(lane.mids, y)
  return i === lane.own ? null : lane.slots[i]
}

export function laneSlot(lanes: Lanes, y: number, across: boolean): LaneSlot | null {
  const lane = laneAt(lanes, y)
  return lane === lanes.home || across ? rowSlot(lane, y) : null
}

export { nextOrder } from '../Utilities/moveItem'

export type MeasuredRow = { id: string; top: number; bottom: number; mid: number }

/** Top half drops before `over`, bottom half after, skipping the dragged id so "after" can't resolve to itself. */
export function slotInGroup(
  group: string[],
  over: MeasuredRow,
  clientY: number,
  draggedId: string,
): { beforeId: string | null; edge: number } {
  const before = clientY < over.mid
  const pos = group.indexOf(over.id)
  const beforeId = before ? over.id : (group.slice(pos + 1).find((id) => id !== draggedId) ?? null)
  return { beforeId, edge: before ? over.top : over.bottom }
}

/** The insertion index among `rows` with the dragged one removed, and the drop line: the gap's middle between two rows, else the last row's bottom, else `emptyTop`. */
export function scanSlot(
  rows: MeasuredRow[],
  draggedId: string,
  y: number,
  emptyTop: number,
): { i: number; lineY: number } {
  const others = rows.filter((r) => r.id !== draggedId)
  let i = 0
  while (i < others.length && y >= others[i].mid) i++
  const lineY =
    i === others.length
      ? (others[i - 1]?.bottom ?? emptyTop)
      : i === 0
        ? others[0].top
        : (others[i - 1].bottom + others[i].top) / 2
  return { i, lineY }
}

export type MeasuredGroup = { id: string; top: number; bottom: number; rows: MeasuredRow[] }
export type GroupedSlot = { groupId: string; top: number; to: number }

/** Groups split the pointer axis at the midpoints between them. `to` indexes the target group with the dragged row removed, `top` is the drop line's offset from that group's top, and a drop back into the row's own slot resolves to null. */
export function resolveGroupedSlot(
  draggedId: string,
  y: number,
  groups: MeasuredGroup[],
): GroupedSlot | null {
  const from = groups.find((g) => g.rows.some((r) => r.id === draggedId))
  if (!from) return null
  let grp = groups[groups.length - 1]
  for (let i = 0; i < groups.length - 1; i++) {
    if (y < (groups[i].bottom + groups[i + 1].top) / 2) {
      grp = groups[i]
      break
    }
  }
  const { i: to, lineY } = scanSlot(grp.rows, draggedId, y, grp.top)
  if (grp === from && to === from.rows.findIndex((r) => r.id === draggedId)) return null
  return { groupId: grp.id, top: lineY - grp.top, to }
}

export function walksTo(
  fromId: string,
  ancestorId: string,
  parents: ((id: string) => string | null | undefined) | Map<string, { parentId: string | null }>,
): boolean {
  const parentOf =
    typeof parents === 'function' ? parents : (id: string) => parents.get(id)?.parentId
  let cur: string | null | undefined = fromId
  while (cur) {
    if (cur === ancestorId) return true
    cur = parentOf(cur)
  }
  return false
}
