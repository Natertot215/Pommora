import { MenuItem } from '@renderer/DesignSystem/Menus'

export interface RowText {
  label: string
  hint: string
}

export function SettingsRow({
  label,
  hint,
  children,
}: RowText & { children: React.ReactNode }): React.JSX.Element {
  return (
    <MenuItem subLabel={hint} trailing={children}>
      {label}
    </MenuItem>
  )
}
