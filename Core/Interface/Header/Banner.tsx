import { type ReactNode, useRef, useState } from 'react'
import type { BannerOwnerKind, RenameKind } from '../../Nexus/mutateRequest'
import type { HeldKind } from '../../Nexus/entities'
import { DEFAULT_NEXUS_ICON, entityIcon } from '../../Assets/entityIconPolicy'
import { IconChoice } from '../../Assets/IconChoice'
import { useSession } from '../../Session/store'
import { useContentHost } from '../contentHost'
import { useAssetUrl } from '../../Assets/useAssetUrl'
import { AssetImage } from '../../Assets/AssetImage'
import { isSurfaceKind, type BannerOwner } from '../../Nexus/treeIndex'
import { DetailTitleHeader } from './DetailTitleHeader'
import { cx } from '@pommora/uix/Utilities/cx'
import { AddBannerButton } from './AddBannerButton'
import { useBannerMenu } from './useBannerMenu'
import { useWindowBannerSeat } from '../Windows/windowTabBanner'
import { popMenu } from '../../Actions/menuActions'
import { nexusTitleMenuItems, titleMenuItems, withSearchRow } from '../../Actions/identityMenus'
import { NexusIconEditors } from '../../Assets/NexusIconEditors'
import { useNexusIcon } from '../../Assets/useNexusIcon'
import { personalizationOf } from '../../Session/configSlice'

/** The one banner: its image, menu, crop editor, and window seat; the caller brings the title and what stands when there is no banner. */
export function Banner({
  path,
  kind,
  value,
  title,
  empty,
  chrome = 'detail',
  className,
  titleClassName = 'banner-title',
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
      <div
        className={cx(titleClassName, chrome === 'window' && 'window-banner-title', 'title-shadow')}
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
  const defaultIcons = useSession((s) => personalizationOf(s).defaultIcons)
  const nexusIcon = useNexusIcon()
  const homePhotoSrc = useAssetUrl(nexusIcon.profileImage)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const iconRef = useRef<Element>(null)
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
          start: () => searchView(searchTab),
          change: (query: string | null) => setViewQuery(searchTab, query),
        }
  const home = owner.kind === 'homepage'

  const iconHidden = owner.headingIconHidden === true
  const surfaceClass = isSurfaceKind(owner.kind) ? 'is-surface' : undefined
  const titleHeader = (
    <DetailTitleHeader
      key={owner.path}
      title={owner.title}
      icon={
        owner.kind === 'homepage'
          ? (nexusIcon.profileIcon ?? DEFAULT_NEXUS_ICON)
          : entityIcon(owner.kind, owner.icon, defaultIcons)
      }
      photo={home && homePhotoSrc ? nexusIcon.profileImage : undefined}
      iconHidden={iconHidden}
      iconEditing={home ? nexusIcon.editor !== null : iconPickerOpen}
      iconRef={iconRef}
      onRename={(newName) => submitRename(owner.path, owner.kind as RenameKind, newName)}
      requestMenu={async () => {
        if (!home) {
          const items = titleMenuItems({ iconHidden })
          return popMenu(search ? withSearchRow(items) : items)
        }
        const action = await popMenu(nexusTitleMenuItems({ ...nexusIcon.holds, iconHidden }))
        if (action === null || action === 'rename' || action === 'toggleIcon') return action
        void nexusIcon.run(action)
        return null
      }}
      onEditIcon={() => setIconPickerOpen(true)}
      onToggleIcon={() =>
        void mutate({
          op: 'setHeadingIconHidden',
          path: owner.path,
          kind: owner.kind,
          hidden: !iconHidden,
        })
      }
      search={search}
    />
  )
  const iconPicker = home ? (
    <NexusIconEditors icon={nexusIcon} triggerRef={iconRef} />
  ) : (
    <IconChoice
      open={iconPickerOpen}
      onClose={() => setIconPickerOpen(false)}
      triggerRef={iconRef}
      value={owner.icon}
      onSelect={(id) =>
        void mutate({
          op: 'setIcon',
          path: owner.path,
          kind: owner.kind as HeldKind,
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
        onSearch={search?.start}
        title={titleHeader}
        empty={(add) => (
          <div className={cx('banner-empty', surfaceClass)}>
            {chrome === 'detail' && <AddBannerButton onClick={add} />}
            <div className="banner-empty-title">{titleHeader}</div>
          </div>
        )}
      />
      {iconPicker}
    </>
  )
}
