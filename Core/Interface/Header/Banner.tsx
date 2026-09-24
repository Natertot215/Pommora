import { useRef, useState } from 'react'
import type { MutableKind } from '@pommora/core/Nexus/mutateRequest'
import { Icon } from '@pommora/uix/Symbols'
import { DEFAULT_NEXUS_ICON, entityIcon } from '../../Assets/entityIconPolicy'
import { IconChoice } from '../../Assets/IconChoice'
import { shownViewSearch, useSession } from '../../Session/store'
import { useAssetUrl } from '../../Assets/useAssetUrl'
import { AssetImage } from '../../Assets/AssetImage'
import { ImagePicker } from '../../Assets/ImagePicker'
import { isSurfaceKind, type BannerOwner } from '../../Nexus/treeIndex'
import { DetailTitleHeader } from './DetailTitleHeader'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { base } from '@pommora/uix/Fields/fields.css'
import { cx } from '@pommora/uix/Utilities/cx'
import { AddBannerButton } from './AddBannerButton'
import { useBannerMenu } from './useBannerMenu'
import { useWindowBannerSeat } from '../Windows/windowTabBanner'
import { host } from '../../Platform/dialer'
import { popMenu } from '../../Actions/menuActions'
import { titleMenuItems, withSearchRow } from '@pommora/core/Actions/identityMenus'

export function Banner({
  owner,
  chrome = 'detail',
}: {
  owner: BannerOwner
  chrome?: 'detail' | 'window'
}): React.JSX.Element {
  const mutate = useSession((s) => s.mutate)
  const submitRename = useSession((s) => s.submitRename)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const nexus = useSession((s) => s.tree?.nexus)
  const bannerSrc = useAssetUrl(owner.banner)
  const homePhotoSrc = useAssetUrl(nexus?.profileImage)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [editingHome, setEditingHome] = useState(false)
  const iconRef = useRef<SVGSVGElement>(null)
  const searchable = chrome === 'detail' && (owner.kind === 'collection' || owner.kind === 'set')
  const query = useSession((s) => (searchable ? (shownViewSearch(s)?.query ?? null) : null))
  const summon = useSession((s) => (searchable ? s.viewSearchSummon : 0))
  const searchView = useSession((s) => s.searchView)
  const setViewQuery = useSession((s) => s.setViewQuery)
  const search = searchable ? { query, summon, start: searchView, change: setViewQuery } : undefined

  const iconHidden = owner.headingIconHidden === true
  const toggleHeadingIcon = (): Promise<boolean> =>
    mutate({ op: 'setHeadingIconHidden', path: owner.path, kind: owner.kind, hidden: !iconHidden })
  // Always rendered (never conditionally removed) so hide/show slides it in/out rather than popping.
  const homeIcon = (): React.ReactNode => {
    const cls = iconHidden ? 'banner-home-icon is-hidden' : 'banner-home-icon'
    if (homePhotoSrc) return <AssetImage value={nexus?.profileImage} className={cls} eager />
    return <Icon name={nexus?.profileIcon ?? DEFAULT_NEXUS_ICON} className={cls} />
  }
  const openHomeTitleMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    // No Edit Icon here — the nexus icon is set from Settings / the ribbon, not this menu.
    const action = await popMenu(titleMenuItems({ iconHidden, noEditIcon: true }))
    if (action === 'rename') setEditingHome(true)
    else if (action === 'toggleIcon') await toggleHeadingIcon()
  }

  // The homepage IS the nexus, so its title renames the root folder via renameNexus rather than submitRename.
  const commitHome = (next: string): void => {
    setEditingHome(false)
    void host()
      .ask('nexus:rename', next)
      .then(async (res) => {
        if (!res.ok) await host().ask('error:show', res.error.message)
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
  const bannerRef = useRef<HTMLDivElement>(null)
  const { openMenu, run, addOrChange, editing, closeEditor, boxAspect, onSave, onRepick } =
    useBannerMenu(owner.path, owner.kind, { value: owner.banner, frame: bannerRef })
  useWindowBannerSeat(chrome === 'window', run)

  const homeClass = owner.kind === 'homepage' ? ' is-homepage' : ''
  const surfaceClass = isSurfaceKind(owner.kind) ? ' is-surface' : ''
  const titleHeader = owner.kind !== 'homepage' && (
    <DetailTitleHeader
      key={owner.path}
      title={owner.name}
      icon={entityIcon(owner.kind, owner.icon, defaultIcons)}
      iconHidden={iconHidden}
      iconRef={iconRef}
      onRename={(newName) => submitRename(owner.path, owner.kind as MutableKind, newName)}
      requestMenu={() => {
        const items = titleMenuItems({ iconHidden })
        return popMenu(search ? withSearchRow(items) : items)
      }}
      onEditIcon={() => setIconPickerOpen(true)}
      onToggleIcon={() => void toggleHeadingIcon()}
      search={search}
    />
  )
  const iconPicker = owner.kind !== 'homepage' && (
    <IconChoice
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
        {chrome === 'detail' && <AddBannerButton onClick={() => void addOrChange()} />}
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
      ref={bannerRef}
      className={cx(`banner${homeClass}${surfaceClass}`, chrome === 'window' && 'window-banner')}
      onContextMenu={(e) => {
        e.preventDefault()
        void openMenu(search?.start)
      }}
    >
      <AssetImage value={owner.banner} className="banner-img" eager />
      <ImagePicker
        open={editing}
        value={owner.banner ?? ''}
        shape="rect"
        boxAspect={boxAspect}
        onCancel={closeEditor}
        onSave={onSave}
        onRepick={onRepick}
      />
      {owner.kind === 'homepage' ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
        <span
          className="banner-title title-shadow"
          onContextMenu={(e) => void openHomeTitleMenu(e)}
        >
          {homeIcon()}
          {homeTitle('banner-title-text')}
        </span>
      ) : (
        <div
          className={cx(
            'banner-title',
            chrome === 'window' && 'window-banner-title',
            search && 'is-searchable',
            'title-shadow',
          )}
        >
          {titleHeader}
        </div>
      )}
      {iconPicker}
    </div>
  )
}
