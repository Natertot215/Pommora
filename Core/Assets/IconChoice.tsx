import { IconPicker, type IconPickerProps } from '@pommora/uix/Pickers/IconPicker'
import { useIconFavorites } from './iconFavorites'

export function IconChoice(props: Omit<IconPickerProps, 'favorites'>): React.JSX.Element | null {
  return <IconPicker {...props} favorites={useIconFavorites()} />
}
