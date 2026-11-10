import type { ComponentProps, ReactNode } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import type { ValueSeatApi } from '../Pickers/ValueSeat'
import { Cell } from './Cell'

export const seatOf = (el: HTMLElement): HTMLElement => el.closest<HTMLElement>('.value-seat') ?? el

export function SeatedValue({
  row,
  column,
  ctx,
  style,
  api,
  editor,
  empty,
  hideRemove,
  className,
  ...attrs
}: Pick<
  ComponentProps<typeof Cell>,
  'row' | 'column' | 'ctx' | 'style' | 'empty' | 'hideRemove'
> & {
  api: Pick<ValueSeatApi, 'click' | 'menu' | 'pane' | 'commit'>
  editor: ReactNode
  className?: string
} & { [attr: `data-${string}`]: string | undefined }): React.JSX.Element {
  return (
    // data-drag-slop: the value sits on a drag handle, so a press beginning on it gets a larger activation threshold — a tap-wobble opens the picker instead of lifting the item.
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
    <span
      {...attrs}
      className={cx('value-seat', className)}
      data-drag-slop=""
      onClick={(e) => api.click(row, column, e)}
      onContextMenu={(e) => void api.menu(row, column, e)}
    >
      {editor ?? (
        <Cell
          row={row}
          column={column}
          ctx={ctx}
          style={style}
          empty={empty}
          commit={(next) => api.commit(row, column, next)}
          hideRemove={hideRemove}
          onPane={(anchor) => api.pane(row, column, anchor)}
        />
      )}
    </span>
  )
}
