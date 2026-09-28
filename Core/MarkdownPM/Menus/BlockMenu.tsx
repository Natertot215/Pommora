import { Fragment } from 'react'
import { Icon } from '@pommora/uix/Symbols'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import { PICKER_MAX_HEIGHT } from '@pommora/uix/Pickers/picker-base.css'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { emphasizeMatch, MenuItem, MenuRowView, MenuScrollFrame } from '@pommora/uix/Menus'
import type { BlockMenuAction } from '@pommora/core/Actions/blockMenu'
import { CLOSED_GEOMETRY, useKeepInView } from './caretPane'
import type { BlockMenuState } from './useBlockMenu'

interface Props {
  state: BlockMenuState | null
  selected: BlockMenuAction | null
  onPick: (action: BlockMenuAction) => void
}

const CLOSED: BlockMenuState = { query: '', from: 0, to: 0, matches: [], ...CLOSED_GEOMETRY }

export function BlockMenu({ state, selected, onPick }: Props): React.JSX.Element {
  const open = state !== null
  const v = useHeld({ state: state ?? CLOSED, selected }, open)
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
      <MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT}>
        {v.state.matches.map((m) => (
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
                {emphasizeMatch(row.label, row.at, matchLen)}
              </MenuItem>
            ))}
          </Fragment>
        ))}
      </MenuScrollFrame>
    </PickerMenu>
  )
}
