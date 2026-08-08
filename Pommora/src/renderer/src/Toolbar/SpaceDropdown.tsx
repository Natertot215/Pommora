import { MenuDropdown } from '@renderer/design-system/components/menu'
import { entityIcon } from '@renderer/design-system/symbols'
import { useSession } from '../store'
import * as s from './toolbarDropdown.css'

// Matches ViewPane's footprint — blank until its content lands.
const PANE_SQUARE = 225

export function SpaceDropdown(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  const defaultIcons = useSession((st) => st.personalization.defaultIcons)
  if (selection.kind !== 'space') return null
  return (
    <MenuDropdown
      icon={entityIcon('space', undefined, defaultIcons)}
      title="Space"
      classNames={{ wrapper: s.wrapper, button: s.button, anchor: s.anchor }}
    >
      {() => <div style={{ width: PANE_SQUARE, height: PANE_SQUARE }} />}
    </MenuDropdown>
  )
}
