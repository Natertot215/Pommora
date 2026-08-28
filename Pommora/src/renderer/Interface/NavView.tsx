import { useMemo, useRef, useState } from 'react'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { text } from '@renderer/DesignSystem/Tokens'
import { SearchField } from '@renderer/DesignSystem/Fields'
import type { NavRef } from '@shared/types'
import { useAssetUrl, useSession } from '../store'
import { AssetImage } from '@renderer/Assets/AssetImage'
import { ImagePicker } from '@renderer/DesignSystem/Pickers/ImagePicker/ImagePicker'
import { useBannerMenu } from './useBannerMenu'
import { moveByKey } from '../Navigation/navRecents'
import { splitSearch, useNavData } from '../Navigation/useNavData'
import { NavGallery } from '../Navigation/NavGallery'
import { NavList } from '../Navigation/NavList'
import { AddBannerButton } from './AddBannerButton'
import './content-banner.css'
import './navView.css'

export function NavView(): React.JSX.Element {
  // resolvedRecents arrives already pin-deduped (useNavData filters against the pin set).
  const { resolvedRecents, resolvedPins, search, go } = useNavData()
  const viewMode = useSession((s) => s.navViewMode)
  // NavWindow's freeze-at-open is for its persistent pane — NavView opens fresh each time, so it
  // isn't needed here.
  const setRecentsOrder = useSession((s) => s.setRecentsOrder)
  const reorderRecent = (activeKey: string, overKey: string): void => {
    const next = moveByKey(resolvedRecents, (r) => r.key, activeKey, overKey)
    if (next) setRecentsOrder(next.map((r) => r.key))
  }
  const ownBanner = useSession((s) => s.navBanner)
  const homeBanner = useSession((s) => s.tree?.homepage.banner)
  const bannerSrc = useAssetUrl(ownBanner ?? homeBanner)
  const bannerRef = useRef<HTMLDivElement>(null)
  // Remove clears only NavView's own override (falls back to the homepage banner) — offered only
  // while an override exists (`noRemove` when the shown banner is the inherited homepage one).
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
        {/* Search always renders Gallery cards (frozen layout) — the toggle governs only the
            recents/empty view. */}
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
            onSelect={open}
            onOpenNewTab={openNew}
          />
        )}
      </div>
    </div>
  )
}
