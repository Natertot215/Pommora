import { forwardRef } from 'react'
import { useSession } from '../store'
import { useBannerMenu } from '../Detail/Banner/useBannerMenu'
import { AddBannerButton } from '../Detail/Banner/AddBannerButton'
import { DetailTitleHeader } from '../Detail/DetailTitleHeader'
import { assetUrl } from '../assetUrl'

interface Props {
  path: string
  title: string
  cover?: string
  /** The page's own glyph. Absent draws no icon at all — the header stays as it was. */
  icon?: string
  iconHidden?: boolean
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
  { path, title, cover, icon, iconHidden, onToggleIcon, onRename, onEditIcon },
  ref,
) {
  const reloadPage = useSession((s) => s.reloadPage)
  const { openMenu: bannerMenu, addOrChange } = useBannerMenu(path, 'page', () => void reloadPage())

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
    <div className={`mdpm-header${cover ? ' has-banner' : ''}`} ref={ref}>
      {cover ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
        <div
          className="mdpm-banner"
          onContextMenu={(e) => {
            e.preventDefault()
            void bannerMenu()
          }}
        >
          <img className="mdpm-banner-img" src={assetUrl(cover)} alt="" />
          <div className="mdpm-banner-overlay">{titleHeader}</div>
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
