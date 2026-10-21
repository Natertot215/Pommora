import { useState } from 'react'
import { Checkbox } from '@pommora/uix/Controls/Checkbox'
import { SearchField } from '@pommora/uix/Fields/SearchField'
import { overScrollEllipsis } from '@pommora/uix/Interactions/OverScroll'
import { Scrollbar } from '@pommora/uix/Interactions/Scrollbar'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { historical } from '@pommora/uix/Elements/nav-trail.css'
import { MenuItem } from '@pommora/uix/Menus'
import { overlay } from '@pommora/uix/Menus/menu-row.css'
import { cx } from '@pommora/uix/Utilities/cx'
import { Icon } from '@pommora/uix/Symbols'
import { entityIcon } from '../Assets/entityIconPolicy'
import { text } from '@pommora/uix/Theme'
import type { Personalization } from './personalization'
import type { BundleRow } from '../Bundles/rows'
import { PropertyTypeIcon, propertyTypeIconName } from '../Properties/Cells/PropertyTypes'
import { useSession } from '../Session/store'
import { personalizationOf } from '../Session/configSlice'
import { crumbSegments, useBundleBrowser } from '../Bundles/browser'
import '../Navigation/nav-list.css'
import './trash-frame.css'

// Keyed on the nexus so a switch with Settings open mounts a body with its own list.
export function TrashFrame(): React.JSX.Element {
  const nexusId = useSession((s) => s.tree?.nexus.id ?? '')
  return <TrashBody key={nexusId} />
}

function TrashBody(): React.JSX.Element {
  const [query, setQuery] = useState('')
  const { listing, visible, checked, toggle, openMenu, date } = useBundleBrowser(
    { kind: 'trash' },
    { query, shown: true },
  )
  const defaultIcons = useSession((s) => personalizationOf(s).defaultIcons)

  const body = (): React.JSX.Element => {
    switch (listing.status) {
      case 'loading':
        return <div className="trash-empty" />
      case 'failed':
        return (
          <div className={cx('trash-empty', text.body.standard)}>The trash couldn't be read.</div>
        )
      case 'ready':
        if (visible.length === 0)
          return (
            <div className={cx('trash-empty', text.body.standard)}>
              {listing.rows.length === 0 ? 'Trash is empty.' : 'Nothing matches.'}
            </div>
          )
        return (
          <>
            <div className="trash-scroll scroll-fade">
              <div className="nav-list">
                {visible.map((row) => (
                  <TrashRowView
                    key={row.bundlePath}
                    row={row}
                    checked={checked.has(row.bundlePath)}
                    onToggle={() => toggle(row.bundlePath)}
                    onMenu={() => void openMenu(row)}
                    icon={
                      row.kind === 'property'
                        ? row.propertyType
                          ? propertyTypeIconName(row.propertyType)
                          : 'tag'
                        : entityIcon(row.kind, row.icon, defaultIcons)
                    }
                    defaultIcons={defaultIcons}
                    when={date.when(row.storedAt)}
                  />
                ))}
              </div>
            </div>
            <Scrollbar />
          </>
        )
    }
  }

  return (
    <div className={cx('trash-frame table is-clear', checked.size > 0 && 'has-checked')}>
      <div className="nav-search-row">
        <SearchField className={text.body.standard} value={query} onValueChange={setQuery} />
      </div>

      <div className={cx('trash-head', 'table-head')}>
        <span className="trash-head-name col-header">
          <span className="trash-head-glyph">
            <PropertyTypeIcon type="title" size="body" />
          </span>
          File Name
        </span>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a column label — it carries no click and no keyboard gesture of its own, exactly as the banner's and the cards' right-click surfaces do */}
        <span className="trash-head-date col-header" onContextMenu={date.onContextMenu}>
          <Icon name="clock-fading" size="body" />
          Time Deleted
        </span>
      </div>

      {body()}
    </div>
  )
}

function TrashRowView({
  row,
  checked,
  onToggle,
  onMenu,
  icon,
  when,
  defaultIcons,
}: {
  row: BundleRow
  checked: boolean
  onToggle: () => void
  onMenu: () => void
  icon: string
  when: string
  defaultIcons: Personalization['defaultIcons']
}): React.JSX.Element {
  return (
    <MenuItem
      className="trash-row table-divider"
      leading={<Icon name={icon} size="headline" />}
      detail={
        <NavTrail
          segments={crumbSegments(row.crumbs, defaultIcons)}
          iconSize="control"
          className={cx('trash-trail', row.historical && historical)}
        />
      }
      trailing={
        <span className={cx('trash-date', text.caption.standard, overScrollEllipsis)}>{when}</span>
      }
      overlay={
        <Checkbox
          className={overlay}
          size="compact"
          state={checked}
          onChange={onToggle}
          ariaLabel={`Select ${row.title}`}
        />
      }
      onClick={onToggle}
      onContextMenu={(e) => {
        e.preventDefault()
        onMenu()
      }}
    >
      {row.title}
    </MenuItem>
  )
}
