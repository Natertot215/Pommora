import { MenuSurface } from '@renderer/DesignSystem/Components/Menu'
import { anchorRight } from './toolbarDropdown.css'

// A blank placeholder at a fixed ceiling — content pulled back until the design lands.
export function NavPane({
  closing = false,
  notchInsetRight,
}: {
  closing?: boolean
  notchInsetRight?: number
}): React.JSX.Element {
  return (
    <div className={anchorRight}>
      <MenuSurface closing={closing} notchInsetRight={notchInsetRight}>
        <div style={{ height: 300 }} />
      </MenuSurface>
    </div>
  )
}
