import { Fragment, useRef, type ReactNode } from 'react'
import { Icon } from '@pommora/uix/Symbols'
import { PickerMenu } from '@pommora/uix/Pickers/picker-base'
import { PICKER_MAX_HEIGHT } from '@pommora/uix/Pickers/picker-base.css'
import { MenuItem, MenuRowView, MenuScrollFrame } from '@pommora/uix/Menus'
import type { BlockMenuAction, BlockMenuMatch } from '@pommora/core/Actions/blockMenu'
import { useKeepInView } from '../Autocomplete/useKeepInView'
import { CLOSED_GEOMETRY } from '../Autocomplete/useConnectionAutocomplete'
import type { BlockMenuState } from './useBlockMenu'

const BLOCK_MENU_WIDTH = 140

function emphasized(label: string, at: number | null, len: number): ReactNode {
  if (at === null || len === 0) return label
  return (
    <>
      {label.slice(0, at)}
      <span className="mdpm-autocomplete-match">{label.slice(at, at + len)}</span>
      {label.slice(at + len)}
    </>
  )
}

interface Props {
  open: boolean
  state: BlockMenuState | null
  matches: BlockMenuMatch[]
  selected: BlockMenuAction | null
  onPick: (action: BlockMenuAction) => void
}

const CLOSED: BlockMenuState = { query: '', from: 0, to: 0, citeSeat: false, ...CLOSED_GEOMETRY }

export function BlockMenu({ open, state, matches, selected, onPick }: Props): React.JSX.Element {
  const last = useRef({ state: CLOSED, matches, selected })
  if (open && state) last.current = { state, matches, selected }

  const v = last.current
  const matchLen = v.state.query.length
  const keepInView = useKeepInView(v.selected)

  return (
    <PickerMenu
      glass="window"
      open={open}
      anchorX={v.state.caretX}
      anchorY={v.state.caretTop}
      anchorHeight={v.state.caretBottom - v.state.caretTop}
      bounds={v.state.bounds}
      origin="center"
      manageFocus={false}
      contentClassName="mdpm-block-menu"
      style={{ width: BLOCK_MENU_WIDTH }}
    >
      <MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT}>
        {v.matches.map((m) => (
          <Fragment key={m.title}>
            <MenuRowView
              row={{ kind: 'heading', label: emphasized(m.title, m.at, matchLen), caps: true }}
            />
            {m.rows.map((row) => (
              <MenuItem
                key={row.action}
                className="mdpm-block-row"
                ref={row.action === v.selected ? keepInView : undefined}
                selected={row.action === v.selected}
                leading={row.icon && <Icon name={row.icon} size="body" />}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onPick(row.action)
                }}
              >
                {emphasized(row.label, row.at, matchLen)}
              </MenuItem>
            ))}
          </Fragment>
        ))}
      </MenuScrollFrame>
    </PickerMenu>
  )
}
