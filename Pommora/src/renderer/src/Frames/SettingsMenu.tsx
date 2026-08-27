import { useSession } from '../store'
import { viewSettingsScope } from '../Detail/ViewSettingsScope'
import { MenuSurface } from '@renderer/DesignSystem/Menus'
import { SettingsFrame } from './SettingsFrame'
import { PageMenu } from './PageMenu'
import { SettingsScaffold } from './SettingsScaffold'
import * as s from './frames.css'

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
