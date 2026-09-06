import { IconPicker, type IconPickerProps } from '@pommora/uix/Pickers/IconPicker/IconPicker'
import { useIconFavorites } from './iconFavorites'

/** The icon picker bound to this nexus's favorites — what decides the icon a nexus entity wears. */
export function IconChoice(props: Omit<IconPickerProps, 'favorites'>): React.JSX.Element | null {
  return <IconPicker {...props} favorites={useIconFavorites()} />
}
