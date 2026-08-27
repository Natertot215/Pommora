import { useRef } from 'react'
import { EntityIcon } from '@renderer/Components/EntityIcon'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { PickerMenu } from '@renderer/DesignSystem/Components/Pickers/PickerMenu'
import { HoverRemove, hoverRemoveHost } from '@renderer/DesignSystem/Interactions/HoverRemove'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { overScrollEllipsis } from '@renderer/DesignSystem/Interactions/OverScroll'
import type { AcRow } from './autocomplete'

interface Props {
  /** Whether the autocomplete is active; false plays the retract before unmounting. */
  open: boolean
  candidates: AcRow[]
  index: number
  /** The caret, as the line it is — the pane centers on `caretX` and opens clear of the line's height. */
  caretX: number
  caretTop: number
  caretBottom: number
  /** The editor's own surface, which the pane slides within rather than the viewport. */
  bounds?: { left: number; right: number }
  query: string
  onPick: (row: AcRow) => void
}

export function AutocompletePane({
  open,
  candidates,
  index,
  caretX,
  caretTop,
  caretBottom,
  bounds,
  query,
  onPick,
}: Props): React.JSX.Element {
  const live = open && candidates.length > 0
  // Retain the last open state so the pane can retract in place after `ac` clears (position + rows gone).
  const last = useRef({ candidates, index, caretX, caretTop, caretBottom, bounds, query })
  if (live) last.current = { candidates, index, caretX, caretTop, caretBottom, bounds, query }

  const v = last.current
  const matchLen = v.query.length
  return (
    // No `onDismiss` and no focus management, by contract: the editor's keymap owns arrows, Return
    // and Escape, and the rows commit on mousedown with preventDefault so the caret never leaves the
    // alias. A backdrop would eat the next click; taking focus would close the pane it belongs to.
    <PickerMenu
      glass="pane"
      open={live}
      anchorX={v.caretX}
      anchorY={v.caretTop}
      anchorHeight={v.caretBottom - v.caretTop}
      bounds={v.bounds}
      origin="center"
      manageFocus={false}
      bareSurface
      contentClassName="mdpm-ac"
    >
      {v.candidates.map((row, i) => (
        // biome-ignore lint/a11y/noStaticElementInteractions: a pointer shortcut for a pane the editor keymap already drives — arrows move the selection, Enter picks
        <div
          key={row.value}
          className={cx('mdpm-ac-row', hoverRemoveHost, i === v.index && 'mdpm-ac-selected')}
          onMouseDown={(e) => {
            // preventDefault regardless: the press must not move focus out of the editor, or the
            // caret leaves the alias and the pane closes before a click can land anywhere.
            e.preventDefault()
            // The × sits inside the row and guards itself on POINTERDOWN — a different event from
            // this one, which its stopPropagation therefore never reaches. Without this the press
            // meant to forget a suggestion accepts it instead, and the gesture has no working path.
            if ((e.target as HTMLElement).closest?.('.mdpm-ac-forget')) return
            onPick(row)
          }}
        >
          {row.isPage ? (
            <EntityIcon kind="page" size="body" className="mdpm-ac-icon" />
          ) : (
            <Icon name="square-split-horizontal" size="body" className="mdpm-ac-icon" />
          )}
          <span className={cx('mdpm-ac-title', overScrollEllipsis)}>
            <span className="mdpm-ac-match">{row.label.slice(0, matchLen)}</span>
            {row.label.slice(matchLen)}
          </span>
          {row.forget && (
            <HoverRemove
              reveal="host"
              className="mdpm-ac-forget"
              label={`Forget ${row.label}`}
              onRemove={row.forget}
            />
          )}
        </div>
      ))}
    </PickerMenu>
  )
}
