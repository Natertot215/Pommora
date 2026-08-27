import { MenuItem } from '@renderer/DesignSystem/Menus'

export interface RowText {
  label: string
  hint: string
}

export function SettingsRow({
  label,
  hint,
  wide = false,
  children,
}: RowText & { wide?: boolean; children: React.ReactNode }): React.JSX.Element {
  return (
    <MenuItem
      subLabel={hint}
      trailing={wide ? <span className="settings-wide">{children}</span> : children}
    >
      {label}
    </MenuItem>
  )
}
