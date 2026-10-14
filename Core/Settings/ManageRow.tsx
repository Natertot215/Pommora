import { type CSSProperties, type ReactNode, useRef, useState } from 'react'
import { Button } from '@pommora/uix/Buttons/Button'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import { SettingsFieldRow } from './SettingsFieldRow'
import * as x from './settings-rows.css'

/** A settings row whose value is a list edited in its own pane: the count, and Manage to open it. */
export function ManageRow({
  label,
  hint,
  count,
  style,
  children,
}: {
  label: string
  hint?: string
  count: number
  style?: CSSProperties
  children: ReactNode
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  return (
    <SettingsFieldRow label={label} hint={hint}>
      <span className={x.manageCluster}>
        <span className={x.count}>{count}</span>
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
          bareSurface
          style={style}
        >
          {children}
        </PickerMenu>
      </span>
    </SettingsFieldRow>
  )
}
