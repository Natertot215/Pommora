import { forwardRef, useRef } from 'react'
import { useAssetUrl, useSession } from '../store'
import { AssetImage } from '@renderer/DesignSystem/Components/AssetImage/AssetImage'
import { ImagePicker } from '@renderer/DesignSystem/Components/Pickers/ImagePicker/ImagePicker'
import { useBannerMenu } from '../Interface/useBannerMenu'
import { AddBannerButton } from '../Interface/AddBannerButton'
import { DetailTitleHeader } from '../Interface/DetailTitleHeader'

/** What the header draws. Passed as one object rather than five props, so the surfaces that host an
 *  editor — the page view, the floating preview, an embedded tile — hand over the page they are
 *  showing instead of spreading its fields. The header never reads the store for these: a preview
 *  window draws a page that is not the active one. */
export interface HeaderPage {
  path: string
  title: string
  cover?: string
  /** The page's own glyph. Absent draws no icon at all — the header stays as it was. */
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

/**
 * The page editor's header: a full-bleed cover band (the frontmatter `cover` key) with the title
 * overlaid bottom-left, or — with no cover — a hover Add-Banner strip above the title. The title is
 * the shared DetailTitleHeader (right-click → Rename / Edit Icon / Show Icon); the banner has its own
 * right-click → Change / Remove. Both menus are native + separate, never overlapping.
 */
export const PageHeader = forwardRef<HTMLDivElement, Props>(function PageHeader(
  { page, onToggleIcon, onRename, onEditIcon },
  ref,
) {
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
      requestMenu={() => window.nexus.titleMenu({ toggleIcon: icon !== undefined, iconHidden })}
      onEditIcon={onEditIcon}
      onToggleIcon={onToggleIcon}
    />
  )

  return (
    <div className={`mdpm-header${coverSrc ? ' has-banner' : ''}`} ref={ref}>
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
          <div className="mdpm-banner-overlay">{titleHeader}</div>
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
})
