import { useRef } from 'react'
import { EntityIcon } from '@renderer/Components/EntityIcon'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { PickerMenu } from '@renderer/DesignSystem/Components/Pickers/PickerMenu'
import { PICKER_MAX_HEIGHT } from '@renderer/DesignSystem/Components/Pickers/PickerMenu/pickerMenu.css'
import { MenuItem } from '@renderer/DesignSystem/Menus'
import { HoverRemove, hoverRemoveHost } from '@renderer/DesignSystem/Interactions/HoverRemove'
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
    // and Escape, and a row commits on mousedown with preventDefault so the caret never leaves the
    // alias. The × guards itself on POINTERDOWN, a different event, so the mousedown checks for it —
    // without that the press meant to forget a suggestion accepts it instead.
    <PickerMenu
      glass="pane"
      open={live}
      anchorX={v.caretX}
      anchorY={v.caretTop}
      anchorHeight={v.caretBottom - v.caretTop}
      bounds={v.bounds}
      origin="center"
      manageFocus={false}
      maxHeight={PICKER_MAX_HEIGHT}
      contentClassName="mdpm-ac"
    >
      {v.candidates.map((row, i) => (
        <MenuItem
          key={row.value}
          className={hoverRemoveHost}
          selected={i === v.index}
          leading={
            row.isPage ? (
              <EntityIcon kind="page" size="body" />
            ) : (
              <Icon name="square-split-horizontal" size="body" />
            )
          }
          trailing={
            row.forget && (
              <HoverRemove
                reveal="host"
                className="mdpm-ac-forget"
                label={`Forget ${row.label}`}
                onRemove={row.forget}
              />
            )
          }
          onMouseDown={(e) => {
            e.preventDefault()
            if ((e.target as HTMLElement).closest?.('.mdpm-ac-forget')) return
            onPick(row)
          }}
        >
          <span className="mdpm-ac-match">{row.label.slice(0, matchLen)}</span>
          {row.label.slice(matchLen)}
        </MenuItem>
      ))}
    </PickerMenu>
  )
}
