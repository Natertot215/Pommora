import { useSession } from '../../Session/store'
import { viewSettingsScope } from './viewSettingsScope'
import { MenuSurface } from '@pommora/uix/Menus'
import { SettingsFrame } from '../../Views/SettingsFrame'
import { PageMenu } from '../../Pages/PageMenu'
import { SettingsScaffold } from '../../Tiles/HomepageSettings'
import * as s from '@pommora/uix/Menus/frames.css'

/** The button never binds to a specific frame — the content view's scope decides which one renders. */
export function SettingsMenu({
  closing = false,
  notchInsetRight,
}: {
  closing?: boolean
  notchInsetRight?: number
}): React.JSX.Element {
  const selection = useSession((st) => st.selection)
  const scope = viewSettingsScope(selection)
  return (
    <div className={s.anchor}>
      <MenuSurface closing={closing} notchInsetRight={notchInsetRight}>
        {scope === 'view' ? (
          <SettingsFrame />
        ) : scope === 'page' ? (
          <PageMenu />
        ) : scope === 'homepage' || scope === 'context' ? (
          <SettingsScaffold />
        ) : (
          <div style={{ minHeight: 24 }} />
        )}
      </MenuSurface>
    </div>
  )
}
