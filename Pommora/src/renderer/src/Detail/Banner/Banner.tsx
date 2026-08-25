import { useRef, useState } from 'react'
import type { MutableKind } from '@shared/mutate'
import { DEFAULT_NEXUS_ICON, Icon, entityIcon } from '@renderer/DesignSystem/Symbols'
import { IconPicker } from '@renderer/Settings/IconPicker'
import { useAssetUrl, useSession } from '../../store'
import { isSurfaceKind, type BannerOwner } from '../Scope'
import { DetailTitleHeader } from '../DetailTitleHeader'
import { RenamableLabel, base } from '@renderer/DesignSystem/Components/Fields'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { AddBannerButton } from './AddBannerButton'
import { useBannerMenu } from './useBannerMenu'

export function Banner({ owner }: { owner: BannerOwner }): React.JSX.Element {
  const mutate = useSession((s) => s.mutate)
  const submitRename = useSession((s) => s.submitRename)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const nexus = useSession((s) => s.tree?.nexus)
  const bannerSrc = useAssetUrl(owner.banner)
  const homePhotoSrc = useAssetUrl(nexus?.profileImage)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [editingHome, setEditingHome] = useState(false)
  const iconRef = useRef<SVGSVGElement>(null)

  const iconHidden = owner.headingIconHidden === true
  const toggleHeadingIcon = (): Promise<boolean> =>
    mutate({ op: 'setHeadingIconHidden', path: owner.path, kind: owner.kind, hidden: !iconHidden })
  // Always rendered (never conditionally removed) so hide/show slides it in/out rather than popping.
  const homeIcon = (): React.ReactNode => {
    const cls = iconHidden ? 'banner-home-icon is-hidden' : 'banner-home-icon'
    if (homePhotoSrc) return <img className={cls} src={homePhotoSrc} alt="" />
    return <Icon name={nexus?.profileIcon ?? DEFAULT_NEXUS_ICON} className={cls} />
  }
  const openHomeTitleMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation() // the homepage title menu, not the banner's Change/Remove-photo menu underneath
    // No Edit Icon here — the nexus icon is set from Settings / the ribbon, not this menu.
    const action = await window.nexus.titleMenu({ toggleIcon: true, iconHidden, noEditIcon: true })
    if (action === 'rename') setEditingHome(true)
    else if (action === 'toggleIcon') await toggleHeadingIcon()
  }

  // The homepage IS the nexus, so its title renames the root folder via renameNexus — not
  // submitRename, which the other title header (below) uses.
  const commitHome = (next: string): void => {
    setEditingHome(false)
    void window.nexus.renameNexus(next).then(async (res) => {
      if (!res.ok) await window.nexus.showError(res.error.message)
    })
  }
  const homeTitle = (className: string): React.ReactNode => (
    <RenamableLabel
      renames="title"
      editing={editingHome}
      value={owner.name}
      className={cx(base, className)}
      onCommit={commitHome}
      onCancel={() => setEditingHome(false)}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a double-click shortcut; the same action has a primary control */}
      <span
        className={className}
        onDoubleClick={() => setEditingHome(true)}
        title="Double-click to rename"
      >
        {owner.name}
      </span>
    </RenamableLabel>
  )
  const { openMenu, addOrChange } = useBannerMenu(owner.path, owner.kind)

  const homeClass = owner.kind === 'homepage' ? ' is-homepage' : ''
  const surfaceClass = isSurfaceKind(owner.kind) ? ' is-surface' : ''
  const titleHeader = owner.kind !== 'homepage' && (
    <DetailTitleHeader
      title={owner.name}
      icon={entityIcon(owner.kind, owner.icon, defaultIcons)}
      iconHidden={iconHidden}
      iconRef={iconRef}
      onRename={(newName) => submitRename(owner.path, owner.kind as MutableKind, newName)}
      requestMenu={() => window.nexus.titleMenu({ toggleIcon: true, iconHidden })}
      onEditIcon={() => setIconPickerOpen(true)}
      onToggleIcon={() => void toggleHeadingIcon()}
    />
  )
  const iconPicker = owner.kind !== 'homepage' && (
    <IconPicker
      open={iconPickerOpen}
      onClose={() => setIconPickerOpen(false)}
      triggerRef={iconRef}
      value={owner.icon}
      onSelect={(id) =>
        void mutate({
          op: 'setIcon',
          path: owner.path,
          kind: owner.kind as MutableKind,
          icon: id,
        })
      }
    />
  )
  if (!bannerSrc) {
    return (
      <div className={`banner-empty${homeClass}${surfaceClass}`}>
        <AddBannerButton onClick={() => void addOrChange()} />
        {owner.kind === 'homepage' ? (
          homeTitle('banner-empty-title')
        ) : (
          <div className="banner-empty-title">{titleHeader}</div>
        )}
        {iconPicker}
      </div>
    )
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
    <div
      className={`banner${homeClass}${surfaceClass}`}
      onContextMenu={(e) => {
        e.preventDefault()
        void openMenu()
      }}
    >
      <img className="banner-img" src={bannerSrc} alt="" />
      {owner.kind === 'homepage' ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
        <span className="banner-title" onContextMenu={(e) => void openHomeTitleMenu(e)}>
          {homeIcon()}
          {homeTitle('banner-title-text')}
        </span>
      ) : (
        <div className="banner-title">{titleHeader}</div>
      )}
      {iconPicker}
    </div>
  )
}
