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

export function walksTo(
  fromId: string,
  ancestorId: string,
  parentOf: (id: string) => string | null | undefined,
): boolean {
  let cur: string | null | undefined = fromId
  while (cur) {
    if (cur === ancestorId) return true
    cur = parentOf(cur)
  }
  return false
}
