import type { CollectionNode, SetNode } from '@shared/types'
import type { SavedView } from '@shared/views'
import { Icon } from '@renderer/design-system/symbols'
import { Switch } from '@renderer/design-system/components/Switches/Switch'
import { MenuItem, MenuSeparator } from '../../design-system/components/menu'
import { flushTrailing } from '../../design-system/components/menu/menu.css'
import { cx } from '../../design-system/cx'
import { useSession } from '../../store'
import { useSaveView } from '@renderer/Embeds/ViewEmbedScope'
import { ICON, switchScale, toggleRow } from './settingsPane.css'

export function LayoutToggles({
  source,
  view,
}: {
  source: CollectionNode | SetNode
  view: SavedView
}): React.JSX.Element {
  const load = useSession((st) => st.load)
  const saveView = useSaveView(source, load)
  const write = (patch: Partial<SavedView>): void => void saveView({ ...view, ...patch })

  return (
    <>
      <MenuSeparator flush />
      <MenuItem
        className={cx(flushTrailing, toggleRow)}
        leading={<Icon name="columns-3-cog" size={ICON.rootEntry} />}
        trailing={
          <span className={switchScale}>
            <Switch
              checked={!(view.hide_column_icons ?? true)}
              onChange={(next) => write({ hide_column_icons: !next })}
              ariaLabel="Column Icons"
            />
          </span>
        }
      >
        Column Icons
      </MenuItem>
      <MenuItem
        className={cx(flushTrailing, toggleRow)}
        leading={<Icon name="table" size={ICON.rootEntry} />}
        trailing={
          <span className={switchScale}>
            <Switch
              checked={view.hide_borders ?? false}
              onChange={(next) => write({ hide_borders: next })}
              ariaLabel="Hide Borders"
            />
          </span>
        }
      >
        Hide Borders
      </MenuItem>
      <MenuItem
        className={cx(flushTrailing, toggleRow)}
        leading={<Icon name="file-text" size={ICON.rootEntry} />}
        trailing={
          <span className={switchScale}>
            <Switch
              checked={!(view.hide_page_icons ?? false)}
              onChange={(next) => write({ hide_page_icons: !next })}
              ariaLabel="Page Icons"
            />
          </span>
        }
      >
        Page Icons
      </MenuItem>
    </>
  )
}
