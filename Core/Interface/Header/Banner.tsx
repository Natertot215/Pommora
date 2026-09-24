import { type ReactNode, useRef, useState } from 'react'
import type { BannerOwnerKind, MutableKind } from '@pommora/core/Nexus/mutateRequest'
import { Icon } from '@pommora/uix/Symbols'
import { DEFAULT_NEXUS_ICON, entityIcon } from '../../Assets/entityIconPolicy'
import { IconChoice } from '../../Assets/IconChoice'
import { useSession } from '../../Session/store'
import { useContentHost } from '../contentHost'
import { useAssetUrl } from '../../Assets/useAssetUrl'
import { AssetImage } from '../../Assets/AssetImage'
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

/** The one banner band: its image, menu, crop editor, and window seat; the caller brings the title and what stands when there is no banner. */
export function Banner({
  path,
  kind,
  value,
  title,
  empty,
  chrome = 'detail',
  className,
  titleClassName = 'banner-title',
  onTitleMenu,
  onSearch,
  onDone,
  noRemove,
}: {
  path: string
  kind: BannerOwnerKind
  value: string | null | undefined
  title: ReactNode
  empty: (add: () => void) => ReactNode
  chrome?: 'detail' | 'window'
  className?: string
  titleClassName?: string
  onTitleMenu?: (e: React.MouseEvent) => void
  onSearch?: () => void
  onDone?: () => void
  noRemove?: boolean
}): ReactNode {
  const src = useAssetUrl(value)
  const frame = useRef<HTMLDivElement>(null)
  const { openMenu, run, addOrChange, editor } = useBannerMenu(path, kind, {
    value,
    frame,
    onDone,
    noRemove,
  })
  useWindowBannerSeat(chrome === 'window', run)

  if (!src) return empty(() => void addOrChange())
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
    <div
      ref={frame}
      className={cx('banner', chrome === 'window' && 'window-banner', className)}
      onContextMenu={(e) => {
        e.preventDefault()
        void openMenu(onSearch)
      }}
    >
      <AssetImage value={value} className="banner-img" eager />
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control */}
      <div
        className={cx(titleClassName, chrome === 'window' && 'window-banner-title', 'title-shadow')}
        onContextMenu={onTitleMenu}
      >
        {title}
      </div>
      {editor}
    </div>
  )
}

/** A homepage, Collection, Set, or Space's banner, titled by its renamable name. */
export function EntityBanner({
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
  const homePhotoSrc = useAssetUrl(nexus?.profileImage)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [editingHome, setEditingHome] = useState(false)
  const iconRef = useRef<SVGSVGElement>(null)
  const contentHost = useContentHost()
  const searchTab =
    chrome === 'detail' && (owner.kind === 'collection' || owner.kind === 'set')
      ? contentHost?.tabId
      : undefined
  const open = useSession((s) => (searchTab === undefined ? undefined : s.viewSearch[searchTab]))
  const searchView = useSession((s) => s.searchView)
  const setViewQuery = useSession((s) => s.setViewQuery)
  const search =
    searchTab === undefined
      ? undefined
      : {
          query: open?.query ?? null,
          summon: open?.summon ?? 0,
          start: searchView,
          change: setViewQuery,
        }
  const home = owner.kind === 'homepage'

  const iconHidden = owner.headingIconHidden === true
  const toggleHeadingIcon = (): Promise<boolean> =>
    mutate({ op: 'setHeadingIconHidden', path: owner.path, kind: owner.kind, hidden: !iconHidden })
  // Always rendered (never conditionally removed) so hide/show slides it in/out rather than popping.
  const homeIcon = (): React.ReactNode => {
    const cls = cx(
      'detail-title-icon title-icon-reveal banner-home-icon',
      iconHidden && 'is-hidden',
    )
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

  const surfaceClass = isSurfaceKind(owner.kind) ? 'is-surface' : undefined
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
  const iconPicker = !home && (
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
  return (
    <>
      <Banner
        path={owner.path}
        kind={owner.kind}
        value={owner.banner}
        chrome={chrome}
        className={surfaceClass}
        titleClassName={cx('banner-title', search && 'is-searchable')}
        onTitleMenu={home ? (e) => void openHomeTitleMenu(e) : undefined}
        onSearch={search?.start}
        title={
          home ? (
            <>
              {homeIcon()}
              {homeTitle('banner-title-text')}
            </>
          ) : (
            titleHeader
          )
        }
        empty={(add) => (
          <div className={cx('banner-empty', surfaceClass)}>
            {chrome === 'detail' && <AddBannerButton onClick={add} />}
            {home ? (
              homeTitle('banner-empty-title')
            ) : (
              <div className="banner-empty-title">{titleHeader}</div>
            )}
          </div>
        )}
      />
      {iconPicker}
    </>
  )
}
