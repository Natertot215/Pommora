import { MenuSurface } from '@renderer/DesignSystem/Menus'
import { anchorRight } from './toolbarMenu.css'

// A blank placeholder at a fixed ceiling — content pulled back until the design lands.
export function NavMenu({
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
