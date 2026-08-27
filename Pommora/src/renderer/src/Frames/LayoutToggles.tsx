import type { CollectionNode, SetNode } from '@shared/types'
import type { SavedView } from '@shared/views'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { DualSwitch } from '@renderer/DesignSystem/Components/Controls/Switches/DualSwitch'
import { MenuItem, MenuSeparator } from '@renderer/DesignSystem/Menus'
import { flushTrailing } from '@renderer/DesignSystem/Menus/menu-base.css'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { useSaveView } from '@renderer/Embeds/ViewEmbedScope'
import { ICON, toggleRow } from './frames.css'

export function LayoutToggles({
  source,
  view,
}: {
  source: CollectionNode | SetNode
  view: SavedView
}): React.JSX.Element {
  const saveView = useSaveView(source)
  const write = (patch: Partial<SavedView>): void => void saveView({ ...view, ...patch })

  return (
    <>
      <MenuSeparator flush />
      <MenuItem
        className={cx(flushTrailing, toggleRow)}
        leading={<Icon name="columns-3-cog" size={ICON.rootEntry} />}
        trailing={
          <DualSwitch
            checked={!(view.hide_column_icons ?? true)}
            onChange={(next) => write({ hide_column_icons: !next })}
            ariaLabel="Column Icons"
          />
        }
      >
        Column Icons
      </MenuItem>
      <MenuItem
        className={cx(flushTrailing, toggleRow)}
        leading={<Icon name="table" size={ICON.rootEntry} />}
        trailing={
          <DualSwitch
            checked={view.hide_borders ?? false}
            onChange={(next) => write({ hide_borders: next })}
            ariaLabel="Hide Borders"
          />
        }
      >
        Hide Borders
      </MenuItem>
      <MenuItem
        className={cx(flushTrailing, toggleRow)}
        leading={<Icon name="file-text" size={ICON.rootEntry} />}
        trailing={
          <DualSwitch
            checked={!(view.hide_page_icons ?? false)}
            onChange={(next) => write({ hide_page_icons: !next })}
            ariaLabel="Page Icons"
          />
        }
      >
        Page Icons
      </MenuItem>
    </>
  )
}
