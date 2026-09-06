import { MenuSurface } from '@pommora/uix/Menus'
import { anchorRight } from './toolbar-menu.css'

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
