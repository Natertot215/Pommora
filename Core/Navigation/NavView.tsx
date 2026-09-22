import { useMemo, useState } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { text } from '@pommora/uix/Theme'
import { SearchField } from '@pommora/uix/Fields/SearchField'
import type { NavRef } from '@pommora/core/Navigation/navRef'
import { useSession } from '../Session/store'
import { moveByKey } from './navRecents'
import { useNavData } from './useNavData'
import { usePublishCount } from '../Interface/Subfield/publish'
import { NavGallery } from './NavGallery'
import { NavList } from './NavList'
import { AddBannerButton } from '../Interface/Header/AddBannerButton'
import { NavBanner } from './NavBanner'
import './nav-view.css'

export function NavView(): React.JSX.Element {
  const { resolvedRecents, resolvedPins, search, go } = useNavData()
  const viewMode = useSession((s) => s.navViewMode)
  // NavWindow's freeze-at-open is for its persistent pane — NavView opens fresh each time.
  const setRecentsOrder = useSession((s) => s.setRecentsOrder)
  const reorderRecent = (activeKey: string, overKey: string): void => {
    const next = moveByKey(resolvedRecents, (r) => r.key, activeKey, overKey)
    if (next) setRecentsOrder(next.map((r) => r.key))
  }
  const [query, setQuery] = useState('')
  const results = useMemo(() => (query.trim() ? search(query) : null), [query, search])
  usePublishCount(results ? results.length : resolvedPins.length + resolvedRecents.length)
  const open = (target: NavRef): void => go(target)
  const openNew = (target: NavRef): void => go(target, undefined, { newTab: true })

  const searchInput = (
    <SearchField
      className={cx('nav-view-search', text.headline.emphasized)}
      value={query}
      onValueChange={setQuery}
    />
  )

  return (
    <div className="nav-view">
      <NavBanner
        search={searchInput}
        empty={(add) => (
          <div className="nav-view-head">
            <AddBannerButton onClick={add} />
            {searchInput}
          </div>
        )}
      />
      <div className="nav-view-scroll over-scroll">
        {results ? (
          <NavGallery
            pins={[]}
            items={results}
            frozenLayout
            onSelect={open}
            onOpenNewTab={openNew}
          />
        ) : viewMode === 'list' ? (
          <NavList
            pins={resolvedPins}
            items={resolvedRecents}
            reorderable
            onReorderRecent={reorderRecent}
            onSelect={open}
            onOpenNewTab={openNew}
          />
        ) : (
          <NavGallery
            pins={resolvedPins}
            items={resolvedRecents}
            onReorderRecent={reorderRecent}
            onSelect={open}
            onOpenNewTab={openNew}
          />
        )}
      </div>
    </div>
  )
}
