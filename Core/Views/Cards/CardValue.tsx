import { EmptyValue } from '@pommora/uix/Elements/EmptyValue'
import { useContext, useEffect, useRef, useState } from 'react'
import type { ResolvedColumn, ViewRow } from '../viewRow'
import { isBlankValue, type PropertyValue } from '../../Properties/propertyValue'
import type { ColumnStyle } from '../../Properties/columnStyles'
import { type CellMenuAction, cellMenuContextFor, cellMenuModel } from '../../Actions/cellMenu'
import { parseStyleAction } from '../../Actions/columnMenu'
import { cx } from '@pommora/uix/Utilities/cx'
import { isSecondaryClick } from '@pommora/uix/Interactions/chords'
import { text } from '@pommora/uix/Theme/typography.css'
import { resolveFieldValue } from '../../Properties/fieldValue'
import { GhostSuppress } from '@pommora/uix/Interactions/ghostCreate'
import { Cell } from '../../Properties/Cells/Cell'
import { showConnectionMenu } from '../../Interface/Menus/connectionMenuActions'
import { valueMenuTarget } from '../../Properties/Cells/valueMenuTarget'
import type { ConnEditAction, LinkAction } from '../../Actions/connectionMenu'
import { PropertyValueInput } from '../../Properties/Pickers/PropertyValueInput'
import { holderOf, type ValueContext } from '../../Properties/valueContext'
import { numberBarCapable } from '../../Properties/formatValue'
import {
  runValueIntent,
  type ValueIntent,
  valueClickIntent,
  valueMenuIntent,
} from '../../Properties/Pickers/valueClick'
import { fileChipIndex, pickFileInto, runFileMenuAction } from '../../Properties/Pickers/filePick'
import { popMenu } from '../../Actions/menuActions'
import { fillsBlank } from './cardColumns'

export type CardPickerKind = 'picker' | 'dateTime' | 'popover'

export function CardValue({
  row,
  column,
  ctx,
  style,
  onCommit,
  onStyle,
  onHide,
  onOpenPicker,
  allowInlineRemove,
}: {
  row: ViewRow
  column: ResolvedColumn
  ctx: ValueContext
  style: ColumnStyle
  onCommit: (column: ResolvedColumn, value: PropertyValue | null) => void
  onStyle: (column: ResolvedColumn, key: keyof ColumnStyle & string, value: string) => void
  onHide: (colId: string) => void
  onOpenPicker: (
    column: ResolvedColumn,
    kind: CardPickerKind,
    anchor: HTMLElement,
    clickX?: number,
  ) => void
  allowInlineRemove: boolean
}): React.JSX.Element {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [editing, setEditing] = useState<{ seat?: ConnEditAction } | null>(null)
  // The view's ghost stands down while this value's native menu or inline field owns the pointer.
  const holdGhost = useContext(GhostSuppress)
  useEffect(() => {
    if (!editing) return
    let done = (): void => {}
    void holdGhost(() => new Promise<void>((settle) => (done = settle)))
    return () => done()
  }, [editing, holdGhost])
  const commit = (v: PropertyValue | null): void => onCommit(column, v)

  const { type: t, def } = column
  const v = resolveFieldValue(row, column)

  const runIntent = (
    intent: ValueIntent | null,
    target: EventTarget | null,
    clickX?: number,
  ): boolean => {
    const open = (kind: CardPickerKind): void => {
      if (anchorRef.current) onOpenPicker(column, kind, anchorRef.current, clickX)
    }
    return runValueIntent(intent, {
      commit: ({ value }) => commit(value),
      file: () => {
        if (def) pickFileInto(def, v, fileChipIndex(target), commit)
      },
      picker: () => open('picker'),
      dateTime: () => open('dateTime'),
      rename: () => open('popover'),
      popover: () => open('popover'),
      edit: ({ seat }) => setEditing({ seat }),
      hide: () => onHide(column.id),
    })
  }
  const runMenuIntent = (action: CellMenuAction | LinkAction): boolean =>
    runIntent(valueMenuIntent(action), null)

  const onClick = (e: React.MouseEvent): void => {
    if (isSecondaryClick(e)) return
    e.stopPropagation()
    // React events cross portals along the component tree: a click inside the picker bubbles back through this span and would re-open what the pick just dismissed.
    if (!e.currentTarget.contains(e.target as Node)) return
    runIntent(valueClickIntent(t, v, style.look, def), e.target, e.clientX)
  }

  const onContextMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    // Portal events bubble the component tree: a right-click inside an open picker arrives here too — swallow it, never pop a mis-targeted menu.
    if (!e.currentTarget.contains(e.target as Node)) return
    if (t === 'link') {
      const target = valueMenuTarget(ctx, row, v.kind === 'link' ? v.value : '', true)
      if (target) {
        const action = await holdGhost(() => showConnectionMenu(target))
        if (action) runMenuIntent(action)
        return
      }
    }
    const chip = fileChipIndex(e.target)
    const menuCtx = cellMenuContextFor(t, style, !isBlankValue(v), {
      hideable: 'view',
      barCapable: numberBarCapable(def),
      onChip: chip !== null,
    })
    if (!menuCtx) return
    const action = await holdGhost(() => popMenu(cellMenuModel(menuCtx)))
    if (!action) return
    if (runFileMenuAction(action, def, v, chip, commit) || runMenuIntent(action)) return
    const parsed = parseStyleAction(action)
    if (parsed) onStyle(column, parsed.key, parsed.value)
  }

  return (
    // data-drag-slop: the whole card is a drag handle, so a press beginning on a value gets a larger activation threshold — a tap-wobble opens the picker instead of lifting the card.
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
    <span
      ref={anchorRef}
      className="card-value value-seat"
      data-drag-slop=""
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {editing && def ? (
        <PropertyValueInput
          def={def}
          current={v}
          holder={holderOf(row, ctx)}
          connections={ctx.connections}
          seat={editing.seat}
          onCommit={commit}
          onClose={() => setEditing(null)}
        />
      ) : (
        <Cell
          row={row}
          column={column}
          ctx={ctx}
          style={style}
          empty={
            fillsBlank(t) ? (
              <EmptyValue className={cx('cell-empty', text.caption.emphasized)} />
            ) : undefined
          }
          commit={commit}
          hideRemove={!allowInlineRemove}
          onPane={() => runIntent({ kind: 'popover' }, null)}
        />
      )}
    </span>
  )
}
