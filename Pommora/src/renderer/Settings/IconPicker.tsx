import {
  IconPicker as Picker,
  type IconPickerProps,
} from '@renderer/DesignSystem/Components/Pickers/IconPicker/IconPicker'
import { useIconFavorites } from './iconFavorites'

/** The IconPicker bound to this nexus's favorites. */
export function IconPicker(props: Omit<IconPickerProps, 'favorites'>): React.JSX.Element | null {
  return <Picker {...props} favorites={useIconFavorites()} />
}
