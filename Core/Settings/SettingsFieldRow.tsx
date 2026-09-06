import type { ReactNode } from 'react'
import { MenuRowView } from '@pommora/uix/Menus'

/** A labeled settings row whose trailing slot is a control rather than a value. */
export function SettingsFieldRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <MenuRowView
      row={{ kind: 'item', label, caption: hint, trailing: { kind: 'field', children } }}
    />
  )
}
