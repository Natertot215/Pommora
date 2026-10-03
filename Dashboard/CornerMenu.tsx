import { Fragment, useRef, useState } from 'react'
import { Segmented } from '@pommora/uix/Buttons/Button'
import { MenuItem, MenuScrollFrame, MenuSeparator } from '@pommora/uix/Menus'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import { PICKER_MAX_HEIGHT } from '@pommora/uix/Pickers/picker-base.css'
import { Icon } from '@pommora/uix/Symbols'
import * as s from './shell.css'

const GLYPH = 12

export type CornerRow = {
  key: string
  label: string
  icon: string
  checked: boolean
  onPick: () => void
}

export function CornerMenu({
  side,
  title,
  icon,
  label,
  groups,
}: {
  side: 'left' | 'right'
  title: string
  icon: string
  label: string
  groups: readonly (readonly CornerRow[])[]
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={triggerRef} className={s.corner[side]}>
      <Segmented
        glass
        showSelection={false}
        labelCollapsed={false}
        segments={[{ icon, label, title, active: open, onClick: () => setOpen((o) => !o) }]}
      />
      <PickerMenu
        open={open}
        onDismiss={() => setOpen(false)}
        triggerRef={triggerRef}
        origin={side}
      >
        <MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT}>
          {groups.map((rows, i) => (
            <Fragment key={rows[0]?.key ?? i}>
              {i > 0 && <MenuSeparator />}
              {rows.map((row) => (
                <MenuItem
                  key={row.key}
                  leading={<Icon name={row.icon} size={GLYPH} />}
                  checked={row.checked}
                  onClick={() => {
                    row.onPick()
                    setOpen(false)
                  }}
                >
                  {row.label}
                </MenuItem>
              ))}
            </Fragment>
          ))}
        </MenuScrollFrame>
      </PickerMenu>
    </div>
  )
}
