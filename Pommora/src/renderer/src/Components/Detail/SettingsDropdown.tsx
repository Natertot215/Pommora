import { useSession } from '../../store'
import { viewSettingsScope } from '../../Detail/ViewSettingsScope'
import { MenuSurface } from '@renderer/DesignSystem/Components/Menu'
import { SettingsPane } from './SettingsPane'
import { PageMenu } from './PageMenu'
import { SettingsScaffold } from './SettingsScaffold'
import * as s from './settingsPane.css'

/** The button never binds to a specific pane — the content view's scope decides which one renders. */
export function SettingsDropdown({
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
          <SettingsPane />
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
