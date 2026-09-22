import { useEffect, useRef, useState } from 'react'
import { valueOr } from '@pommora/core/Contract/result'
import { useSession } from '../Session/store'
import { useAssetUrl } from '../Assets/useAssetUrl'
import { AssetImage } from '../Assets/AssetImage'
import { ImagePicker } from '../Assets/ImagePicker'
import { IconChoice } from '../Assets/IconChoice'
import { entityIcon } from '../Assets/entityIconPolicy'
import { useBannerMenu } from '../Interface/Header/useBannerMenu'
import { AddBannerButton } from '../Interface/Header/AddBannerButton'
import { DetailTitleHeader } from '../Interface/Header/DetailTitleHeader'
import { useWindowBannerSeat } from '../Interface/Windows/windowTabBanner'
import { host } from '../Platform/dialer'
import { popMenu } from '../Actions/menuActions'
import { titleMenuItems } from '@pommora/core/Actions/identityMenus'

export interface HeaderPage {
  id: string
  path: string
  title: string
  cover?: string
  icon?: string
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
  const { id, path, title, cover, icon } = page
  const coverSrc = useAssetUrl(cover)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const submitRename = useSession((s) => s.submitRename)
  const mutate = useSession((s) => s.mutate)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [iconHidden, setIconHidden] = useState(true)
  useEffect(() => {
    let alive = true
    void host()
      .ask('headingIcon:get')
      .then((r) => {
        if (alive) setIconHidden(valueOr(r, {})[id] ?? true)
      })
    return () => {
      alive = false
    }
  }, [id])

  const toggleHeadingIcon = (): void => {
    const next = !iconHidden
    setIconHidden(next)
    void host().ask('headingIcon:set', id, next)
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

  const glyph = entityIcon('page', icon, defaultIcons)
  const titleHeader = (
    <DetailTitleHeader
      title={title}
      icon={glyph}
      iconRef={iconRef}
      iconHidden={iconHidden}
      onRename={(newName) => submitRename(path, 'page', newName)}
      requestMenu={() => popMenu(titleMenuItems({ toggleIcon: glyph !== undefined, iconHidden }))}
      onEditIcon={() => setIconPickerOpen(true)}
      onToggleIcon={toggleHeadingIcon}
    />
  )

  return (
    <div className={`mdpm-header${coverSrc ? ' has-banner' : ''}`}>
      {coverSrc ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
        <div
          ref={bannerRef}
          className="mdpm-banner"
          onContextMenu={(e) => {
            e.preventDefault()
            void bannerMenu()
          }}
        >
          <AssetImage value={cover} className="mdpm-banner-img" />
          <div className="mdpm-banner-overlay title-shadow">{titleHeader}</div>
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
        value={icon}
        onSelect={(chosen) => void mutate({ op: 'setIcon', path, kind: 'page', icon: chosen })}
      />
    </div>
  )
}
