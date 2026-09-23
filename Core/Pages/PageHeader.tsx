import { useRef, useState } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { pageMetaOf, useSession } from '../Session/store'
import { useAssetUrl } from '../Assets/useAssetUrl'
import { AssetImage } from '../Assets/AssetImage'
import { ImagePicker } from '../Assets/ImagePicker'
import { IconChoice } from '../Assets/IconChoice'
import { entityIcon } from '../Assets/entityIconPolicy'
import { useBannerMenu } from '../Interface/Header/useBannerMenu'
import { AddBannerButton } from '../Interface/Header/AddBannerButton'
import { DetailTitleHeader } from '../Interface/Header/DetailTitleHeader'
import { useWindowBannerSeat } from '../Interface/Windows/windowTabBanner'
import { popMenu } from '../Actions/menuActions'
import { titleMenuItems } from '@pommora/core/Actions/identityMenus'

export interface HeaderPage {
  id: string
  path: string
  title: string
  cover?: string
}

export function PageHeader({
  page,
  onBannerDone,
  chrome = 'detail',
}: {
  page: HeaderPage
  onBannerDone: () => void
  chrome?: 'detail' | 'window'
}): React.JSX.Element | null {
  const { id, path, title, cover } = page
  const meta = useSession(pageMetaOf(id))
  const setting = useSession((s) => s.personalization.titleIcon) === true
  const shown = meta?.title_icon ?? setting
  const coverSrc = useAssetUrl(cover)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const submitRename = useSession((s) => s.submitRename)
  const mutate = useSession((s) => s.mutate)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)

  const toggleTitleIcon = (): void => {
    const next = !shown
    void mutate({ op: 'setPageMeta', path, patch: { title_icon: next === setting ? null : next } })
  }

  const bannerRef = useRef<HTMLDivElement>(null)
  const iconRef = useRef<SVGSVGElement>(null)
  const {
    openMenu: bannerMenu,
    run,
    addOrChange,
    editing,
    closeEditor,
    boxAspect,
    onSave,
    onRepick,
  } = useBannerMenu(path, 'page', { value: cover, frame: bannerRef, onDone: onBannerDone })
  useWindowBannerSeat(chrome === 'window', run)

  // A windowed page without a banner draws no header at all; the seat above still takes the strip's Add Banner.
  if (chrome === 'window' && !coverSrc) return null

  const glyph = entityIcon('page', meta?.icon, defaultIcons)
  const titleHeader = (
    <DetailTitleHeader
      title={title}
      icon={glyph}
      iconRef={iconRef}
      iconHidden={!shown}
      onRename={(newName) => submitRename(path, 'page', newName)}
      requestMenu={() => popMenu(titleMenuItems({ toggleIcon: true, iconHidden: !shown }))}
      onEditIcon={() => setIconPickerOpen(true)}
      onToggleIcon={toggleTitleIcon}
    />
  )

  return (
    <div className={`mdpm-header${coverSrc ? ' has-banner' : ''}`}>
      {coverSrc ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
        <div
          ref={bannerRef}
          className={cx('mdpm-banner', chrome === 'window' && 'window-banner')}
          onContextMenu={(e) => {
            e.preventDefault()
            void bannerMenu()
          }}
        >
          <AssetImage value={cover} className="mdpm-banner-img" eager />
          <div
            className={cx(
              'mdpm-banner-overlay',
              chrome === 'window' && 'window-banner-title',
              'title-shadow',
            )}
          >
            {titleHeader}
          </div>
          <ImagePicker
            open={editing}
            value={cover ?? ''}
            shape="rect"
            boxAspect={boxAspect}
            onCancel={closeEditor}
            onSave={onSave}
            onRepick={onRepick}
          />
        </div>
      ) : (
        <>
          <AddBannerButton onClick={() => void addOrChange()} />
          {titleHeader}
          <div className="mdpm-divider" />
        </>
      )}
      <IconChoice
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        triggerRef={iconRef}
        value={meta?.icon}
        onSelect={(chosen) => void mutate({ op: 'setIcon', path, kind: 'page', icon: chosen })}
      />
    </div>
  )
}
