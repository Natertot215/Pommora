import { useRef } from 'react'
import { useSession } from '../Session/store'
import { useAssetUrl } from '../Assets/useAssetUrl'
import { AssetImage } from '../Assets/AssetImage'
import { ImagePicker } from '../Assets/ImagePicker'
import { useBannerMenu } from '../Interface/Header/useBannerMenu'
import { AddBannerButton } from '../Interface/Header/AddBannerButton'
import { DetailTitleHeader } from '../Interface/Header/DetailTitleHeader'
import { popRowMenu } from '../Platform/nativeMenus'
import { titleMenuItems } from '@pommora/core/Actions/identityMenus'

export interface HeaderPage {
  path: string
  title: string
  cover?: string
  icon?: string
  iconHidden?: boolean
}

interface Props {
  page: HeaderPage
  onToggleIcon?: () => void
  // biome-ignore lint/suspicious/noConfusingVoidType: the union is deliberate: a caller may hand back nothing or a promise, and `undefined` in place of `void` breaks assignability for the sync handlers.
  onRename: (newName: string) => void | Promise<boolean | void>
  onEditIcon: () => void
}

export function PageHeader({ page, onToggleIcon, onRename, onEditIcon }: Props): React.JSX.Element {
  const { path, title, cover, icon, iconHidden } = page
  const coverSrc = useAssetUrl(cover)
  const reloadPage = useSession((s) => s.reloadPage)
  const bannerRef = useRef<HTMLDivElement>(null)
  const {
    openMenu: bannerMenu,
    addOrChange,
    editing,
    closeEditor,
    boxAspect,
    onSave,
    onRepick,
  } = useBannerMenu(path, 'page', {
    value: cover,
    frame: bannerRef,
    onDone: () => void reloadPage(),
  })

  const titleHeader = (
    <DetailTitleHeader
      title={title}
      icon={icon}
      iconHidden={iconHidden}
      onRename={onRename}
      requestMenu={() => popRowMenu(titleMenuItems({ toggleIcon: icon !== undefined, iconHidden }))}
      onEditIcon={onEditIcon}
      onToggleIcon={onToggleIcon}
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
    </div>
  )
}
