import { nextOrder } from '@pommora/uix/Utilities/moveItem'
import type { ResolvedColumn } from '../../Properties/properties'
import { placeInShown } from '../Pipeline/columns'
import type { SavedView, Side, ViewPatch } from '../views'

const DEFAULT_SIDE: Record<Exclude<ResolvedColumn, { kind: 'title' }>['type'], Side> = {
  context: 'left',
  status: 'left',
  select: 'left',
  multiSelect: 'left',
  checkbox: 'right',
  link: 'right',
  text: 'right',
  file: 'right',
  number: 'right',
  dateTime: 'right',
  createdTime: 'right',
  lastEditedTime: 'right',
}

export const sideFor = (column: ResolvedColumn, view: SavedView): Side =>
  column.kind === 'title' ? 'left' : (view.column_sides?.[column.id] ?? DEFAULT_SIDE[column.type])

/** A side's column of the property pane, top to bottom: Left as its group reads, Right from the row's edge inward. */
export function sideColumn(
  columns: ResolvedColumn[],
  view: SavedView,
  side: Side,
): ResolvedColumn[] {
  const on = columns.filter((c) => sideFor(c, view) === side)
  return side === 'left' ? on : on.reverse()
}

/** What a drop into a side's column writes: the property placed in the one order, and its side where that changed. Right lists its side reversed, so a slot there sits just before the row drawn above it in the order. */
export function sideDrop(
  view: SavedView,
  shown: ResolvedColumn[],
  side: Side,
  id: string,
  beforeId: string | null,
): ViewPatch {
  const ids = shown.map((c) => c.id)
  let before = beforeId
  if (side === 'right') {
    const drawn = nextOrder(
      sideColumn(shown, view, side).map((c) => c.id),
      id,
      beforeId,
    )
    before = drawn[drawn.indexOf(id) - 1] ?? null
  }
  const rest = ids.filter((x) => x !== id)
  return {
    ...placeInShown(view, ids, id, before === null ? rest.length : rest.indexOf(before)),
    ...(sideFor(shown.find((c) => c.id === id)!, view) !== side && {
      column_sides: { [id]: side },
    }),
  }
}
