import type { CollectionNode, SetNode } from '@shared/types'
import type { SavedView } from '@shared/views'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { DualSwitch } from '@renderer/DesignSystem/Components/Controls/Switches/DualSwitch'
import { MenuItem } from '@renderer/DesignSystem/Menus'
import { flushTrailing } from '@renderer/DesignSystem/Menus/menu-base.css'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { useSaveView } from '@renderer/Embeds/ViewEmbedScope'
import { ICON, toggleRow } from './frames.css'

/** Style, Banner and Scale live in the LayoutFrame footing, not here. */
export function CardsOptions({
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
      <MenuItem
        className={cx(flushTrailing, toggleRow)}
        leading={<Icon name="map" size={ICON.rootEntry} />}
        trailing={
          <DualSwitch
            checked={view.hide_location ?? false}
            onChange={(next) => write({ hide_location: next })}
            ariaLabel="Hide Location"
          />
        }
      >
        Hide Location
      </MenuItem>
      <MenuItem
        className={cx(flushTrailing, toggleRow)}
        leading={<Icon name="wrap-text" size={ICON.rootEntry} />}
        trailing={
          <DualSwitch
            checked={view.wrap_titles ?? false}
            onChange={(next) => write({ wrap_titles: next })}
            ariaLabel="Wrap Titles"
          />
        }
      >
        Wrap Titles
      </MenuItem>
      <MenuItem
        className={cx(flushTrailing, toggleRow)}
        leading={<Icon name="eye-off" size={ICON.rootEntry} />}
        trailing={
          <DualSwitch
            checked={view.hide_page_icons ?? false}
            onChange={(next) => write({ hide_page_icons: next })}
            ariaLabel="Hide Icons"
          />
        }
      >
        Hide Icons
      </MenuItem>
      <MenuItem
        className={cx(flushTrailing, toggleRow)}
        leading={<Icon name="folder-closed" size={ICON.rootEntry} />}
        trailing={
          <DualSwitch
            checked={view.set_cards ?? true}
            onChange={(next) => write({ set_cards: next })}
            ariaLabel="Set Cards"
          />
        }
      >
        Set Cards
      </MenuItem>
    </>
  )
}
