import type { SelectionState } from '../../Navigation/navRef'
import { useSession } from '../../Session/store'
import { MenuSurface } from '@pommora/uix/Menus'
import { SettingsFrame } from '../../Views/Settings/SettingsFrame'
import { PageMenu } from '../../Pages/PageMenu'
import { SpaceMenu } from '../../Contexts/SpaceMenu'
import { HomepageMenu } from '../Homepage/HomepageMenu'
import { MatrixMenu } from '../../Matrix/MatrixMenu'
import * as s from '@pommora/uix/Menus/frames.css'

function scopePane(kind: SelectionState['kind']): React.JSX.Element | null {
  switch (kind) {
    case 'collection':
    case 'set':
      return <SettingsFrame />
    case 'page':
      return <PageMenu />
    case 'space':
      return <SpaceMenu />
    case 'homepage':
      return <HomepageMenu />
    case 'matrix':
      return <MatrixMenu />
    case 'none':
      return <div style={{ minHeight: 24 }} />
  }
}

export function SettingsMenu({
  closing = false,
  notchInsetRight,
}: {
  closing?: boolean
  notchInsetRight?: number
}): React.JSX.Element {
  const kind = useSession((st) => st.selection.kind)
  return (
    <div className={s.anchor}>
      <MenuSurface closing={closing} notchInsetRight={notchInsetRight}>
        {scopePane(kind)}
      </MenuSurface>
    </div>
  )
}
