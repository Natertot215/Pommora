import { useMemo, useRef, useState } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { text } from '@pommora/uix/Theme'
import { SearchField } from '@pommora/uix/Fields'
import type { NavRef } from '@pommora/core/Navigation/navRef'
import { useSession } from '../Session/store'
import { useAssetUrl } from '../Assets/useAssetUrl'
import { AssetImage } from '../Assets/AssetImage'
import { ImagePicker } from '../Assets/ImagePicker'
import { useBannerMenu } from '../Interface/Header/useBannerMenu'
import { moveByKey } from './navRecents'
import { splitSearch, useNavData } from './useNavData'
import { NavGallery } from './NavGallery'
import { NavList } from './NavList'
import { AddBannerButton } from '../Interface/Header/AddBannerButton'
import '../Interface/Header/content-banner.css'
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
  const ownBanner = useSession((s) => s.navBanner)
  const homeBanner = useSession((s) => s.tree?.homepage.banner)
  const bannerSrc = useAssetUrl(ownBanner ?? homeBanner)
  const bannerRef = useRef<HTMLDivElement>(null)
  // Remove clears only NavView's own override — `noRemove` when the shown banner is inherited.
  const { openMenu, addOrChange, editing, closeEditor, boxAspect, onSave, onRepick } =
    useBannerMenu('', 'navview', {
      value: ownBanner ?? homeBanner,
      frame: bannerRef,
      noRemove: !ownBanner,
    })
  const [query, setQuery] = useState('')
  const results = useMemo(() => (query.trim() ? splitSearch(search(query)) : null), [query, search])
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
      {bannerSrc ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
        <div
          ref={bannerRef}
          className="banner nav-view-banner"
          onContextMenu={(e) => {
            e.preventDefault()
            void openMenu()
          }}
        >
          <AssetImage value={ownBanner ?? homeBanner} className="banner-img" />
          <div className="banner-title title-shadow">{searchInput}</div>
          <ImagePicker
            open={editing}
            value={ownBanner ?? homeBanner ?? ''}
            shape="rect"
            boxAspect={boxAspect}
            onCancel={closeEditor}
            onSave={onSave}
            onRepick={onRepick}
          />
        </div>
      ) : (
        <div className="nav-view-head">
          <AddBannerButton onClick={() => void addOrChange()} />
          {searchInput}
        </div>
      )}
      <div className="nav-view-scroll over-scroll">
        {results ? (
          <NavGallery
            pins={[]}
            items={results.items}
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
