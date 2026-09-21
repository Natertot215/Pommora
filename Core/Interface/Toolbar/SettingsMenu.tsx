import { useSession } from '../../Session/store'
import { viewSettingsScope } from './viewSettingsScope'
import { MenuSurface } from '@pommora/uix/Menus'
import { SettingsFrame } from '../../Views/Settings/SettingsFrame'
import { PageMenu } from '../../Pages/PageMenu'
import { SpaceMenu } from '../../Tiles/SpaceMenu'
import { SettingsScaffold } from '../../Tiles/HomepageSettings'
import { MatrixMenu } from '../../Matrix/MatrixMenu'
import * as s from '@pommora/uix/Menus/frames.css'

function scopePane(scope: ReturnType<typeof viewSettingsScope>): React.JSX.Element {
  switch (scope) {
    case 'view':
      return <SettingsFrame />
    case 'page':
      return <PageMenu />
    case 'space':
      return <SpaceMenu />
    case 'homepage':
    case 'context':
      return <SettingsScaffold />
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
  const selection = useSession((st) => st.selection)
  return (
    <div className={s.anchor}>
      <MenuSurface closing={closing} notchInsetRight={notchInsetRight}>
        {scopePane(viewSettingsScope(selection))}
      </MenuSurface>
    </div>
  )
}
