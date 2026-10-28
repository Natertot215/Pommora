import { type ReactNode, useRef, useState } from 'react'
import { Button } from '../Buttons/Button'
import { PickerMenu } from '../Pickers/PickerMenu'
import { Icon, type IconName } from '../Symbols'
import { MenuRowView } from './MenuIndex'
import { trailingCluster, trailingFigure } from './menu-row.css'
import * as s from './manage-row.css'

/** A row whose value is a list edited in its own pane: its count where it shows one, and Manage to open the pane. */
export function ManageRow({
  label,
  caption,
  info,
  icon,
  count,
  solid,
  menu,
  children,
}: {
  label: string
  caption?: string
  info?: ReactNode
  icon?: IconName
  count?: number
  /** Stacked over another glass surface, as a picker opened from a menu is. */
  solid?: boolean
  /** A pane of menu rows on the picker's own surface, taking no focus on open, rather than an inset one. */
  menu?: boolean
  children: ReactNode
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  return (
    <MenuRowView
      row={{
        kind: 'item',
        icon: icon ? <Icon name={icon} size="control" /> : undefined,
        label,
        caption,
        info,
        trailing: {
          kind: 'field',
          children: (
            <span className={trailingCluster}>
              {count !== undefined && <span className={trailingFigure}>{count}</span>}
              <Button
                ref={triggerRef}
                type="filled"
                label="Manage"
                pressed={open}
                onClick={() => setOpen((o) => !o)}
              />
              <PickerMenu
                open={open}
                onDismiss={() => setOpen(false)}
                triggerRef={triggerRef}
                solid={solid}
                bareSurface={!menu}
                focus={menu ? 'leave' : undefined}
                contentClassName={menu ? s.bounds : s.pane}
              >
                {children}
              </PickerMenu>
            </span>
          ),
        },
      }}
    />
  )
}
