import { Fragment, useRef } from 'react'
import { Icon } from '@pommora/uix/Symbols'
import { PickerMenu } from '@pommora/uix/Pickers/picker-base'
import { PICKER_MAX_HEIGHT } from '@pommora/uix/Pickers/picker-base.css'
import { MenuItem, MenuRowView, MenuScrollFrame } from '@pommora/uix/Menus'
import type { BlockMenuAction, BlockMenuMatch } from '@pommora/core/Actions/blockMenu'
import { useKeepInView } from '../Autocomplete/useKeepInView'
import type { BlockMenuState } from './useBlockMenu'

interface Props {
  open: boolean
  state: BlockMenuState | null
  matches: BlockMenuMatch[]
  selected: BlockMenuAction | null
  onPick: (action: BlockMenuAction) => void
}

const CLOSED: BlockMenuState = {
  query: '',
  from: 0,
  to: 0,
  citeSeat: false,
  caretX: 0,
  caretTop: 0,
  caretBottom: 0,
  bounds: { left: 0, right: 0 },
}

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
    >
      <MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT} className="mdpm-autocomplete-slot">
        {v.matches.map((m) => (
          <Fragment key={m.title}>
            <MenuRowView row={{ kind: 'heading', label: m.title, caps: true }} />
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
                {row.label.slice(0, row.at)}
                <span className="mdpm-autocomplete-match">
                  {row.label.slice(row.at, row.at + matchLen)}
                </span>
                {row.label.slice(row.at + matchLen)}
              </MenuItem>
            ))}
          </Fragment>
        ))}
      </MenuScrollFrame>
    </PickerMenu>
  )
}
