import { type ReactNode, useRef } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { useSession } from '../Session/store'
import { useAssetUrl } from '../Assets/useAssetUrl'
import { AssetImage } from '../Assets/AssetImage'
import { ImagePicker } from '../Assets/ImagePicker'
import { useBannerMenu } from '../Interface/Header/useBannerMenu'
import '../Interface/Header/content-banner.css'
import './nav-view.css'

/** NavView's banner, with the search field as its title; `empty` draws the head when there is no banner to show. */
export function NavBanner({
  search,
  empty,
  chrome = 'detail',
}: {
  search: ReactNode
  empty: (add: () => void) => ReactNode
  chrome?: 'detail' | 'window'
}): ReactNode {
  const ownBanner = useSession((s) => s.navBanner)
  const homeBanner = useSession((s) => s.tree?.homepage.banner)
  const value = ownBanner ?? homeBanner
  const bannerSrc = useAssetUrl(value)
  const bannerRef = useRef<HTMLDivElement>(null)
  // Remove clears only NavView's own override — `noRemove` when the shown banner is inherited.
  const { openMenu, addOrChange, editing, closeEditor, boxAspect, onSave, onRepick } =
    useBannerMenu('', 'navview', { value, frame: bannerRef, noRemove: !ownBanner })

  if (!bannerSrc) return empty(() => void addOrChange())
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
    <div
      ref={bannerRef}
      className={cx('banner', 'nav-view-banner', chrome === 'window' && 'window-banner')}
      onContextMenu={(e) => {
        e.preventDefault()
        void openMenu()
      }}
    >
      <AssetImage value={value} className="banner-img" eager />
      <div
        className={cx('banner-title', chrome === 'window' && 'window-banner-title', 'title-shadow')}
      >
        {search}
      </div>
      <ImagePicker
        open={editing}
        value={value ?? ''}
        shape="rect"
        boxAspect={boxAspect}
        onCancel={closeEditor}
        onSave={onSave}
        onRepick={onRepick}
      />
    </div>
  )
}
