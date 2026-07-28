import { MenuSurface } from '@renderer/design-system/components/menu'
import * as s from '../Components/Detail/settingsPane.css'

// A blank placeholder at a fixed ceiling — content pulled back until the design lands.
export function NavPane({
  closing = false,
  notchInsetRight,
}: {
  closing?: boolean
  notchInsetRight?: number
}): React.JSX.Element {
  return (
    <div className={s.anchor}>
      <MenuSurface closing={closing} notchInsetRight={notchInsetRight}>
        <div style={{ height: 300 }} />
      </MenuSurface>
    </div>
  )
}
