import { Fragment } from 'react'
import { Icon } from '@pommora/uix/Symbols'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import type { RememberedSize } from '@pommora/uix/Interactions/useResizable'
import { PICKER_MAX_HEIGHT } from '@pommora/uix/Pickers/picker-base.css'
import { type PaneBounds, usePaneResize } from '@pommora/uix/Pickers/usePaneResize'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { emphasizeMatch, MenuItem, MenuRowView, MenuScrollFrame } from '@pommora/uix/Menus'
import type { BlockMenuAction } from '@pommora/core/Actions/blockMenu'
import { CLOSED_GEOMETRY, useKeepInView } from './caretPane'
import type { BlockMenuState } from './useBlockMenu'

interface Props {
  state: BlockMenuState | null
  selected: BlockMenuAction | null
  onPick: (action: BlockMenuAction) => void
  geometry?: RememberedSize
}

const CLOSED: BlockMenuState = { query: '', from: 0, to: 0, matches: [], ...CLOSED_GEOMETRY }

// KNOB — a fixed width, resized in height alone: the floor, and the whole list as its ceiling.
const BLOCK_BOUNDS: PaneBounds = { min: { h: 180 }, default: { h: PICKER_MAX_HEIGHT } }

export function BlockMenuPane({ state, selected, onPick, geometry }: Props): React.JSX.Element {
  const open = state !== null
  const resize = usePaneResize(open, BLOCK_BOUNDS, geometry)
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
      focus="keep"
      contentClassName="mdpm-block-menu"
      resize={resize}
    >
      <MenuScrollFrame maxHeight={resize.size.h}>
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
                onMouseDown={() => onPick(row.action)}
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
