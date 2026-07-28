import { Fragment, useEffect, useState } from 'react'
import { Icon } from '@renderer/design-system/symbols'
import { cx } from '@renderer/design-system/cx'
import { text } from '@renderer/design-system/tokens'
import { OverflowScroll } from '@renderer/design-system/components/OverflowScroll'
import { onActivateKey } from '@renderer/design-system/interactions/activate'
import { TableRowDnd, useTableRowDrag } from '../Detail/Views/Table/tableDnd'
import type { NavTarget, SelectTarget } from '@shared/types'
import { useSession } from '../store'
import { isOpenInTabs } from '../Tabs/tabsModel'
import { navKey } from './navRecents'
import type { ResolvedNav } from './navResolve'
import { EntityGlyph } from './EntityGlyph'
import './navList.css'

/** Shared by the list rows and the gallery cards — differing only by wrapper class + glyph size.
 *  Null when at root. */
export function NavCrumbs({
  path,
  className,
  iconSize,
}: {
  path: ResolvedNav['path']
  className: string
  iconSize: number
}): React.JSX.Element | null {
  if (path.length === 0) return null
  return (
    <OverflowScroll className={cx(className, text.caption.standard)}>
      {path.map((crumb, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a breadcrumb is strictly positional and never reorders
        <Fragment key={i}>
          {i > 0 && <span className="nav-path-sep">›</span>}
          <Icon name={crumb.icon} size={iconSize} className="nav-path-icon" />
          <span className="nav-path-name">{crumb.title}</span>
        </Fragment>
      ))}
    </OverflowScroll>
  )
}

/** A NATIVE Electron menu (the tab/cell-menu pattern) — renders nothing, fires on mount, closes
 *  when the menu resolves. Shared by the NavWindow list AND gallery. */
export function NavRowMenu({
  item,
  onClose,
  onOpenNewTab,
}: {
  item: ResolvedNav
  onClose: () => void
  onOpenNewTab?: (target: NavTarget) => void
}): null {
  useEffect(() => {
    let live = true
    const s = useSession.getState()
    const target = item.target
    const isPinned = s.pins.some((p) => navKey(p) === item.key)
    const isFavorite = s.favorites.some((f) => navKey(f) === item.key)
    void window.nexus
      .navRowMenu({
        canOpenNewTab: onOpenNewTab !== undefined,
        alreadyOpen: isOpenInTabs(s.tabs, s.pins, target as SelectTarget),
        isPage: target.kind === 'page',
        isPinned,
        isFavorite,
      })
      .then((action) => {
        if (!live) return
        onClose()
        const st = useSession.getState()
        switch (action) {
          case 'open-new-tab':
            onOpenNewTab?.(target)
            break
          case 'open-preview':
            if (target.kind === 'page') {
              // Inside the NavWindow the override routes this to a tab in THAT window; off → the floating preview.
              const ref = { id: target.id, path: target.path }
              if (st.navOpen && (st.previewsFile.navOverride ?? true)) st.openPreviewTab(ref)
              else st.openPreview(ref)
            }
            break
          case 'pin':
            st.pinTarget(target)
            break
          case 'unpin':
            st.unpinTarget(item.key)
            break
          case 'favorite':
            st.addFavorite(target)
            break
          case 'unfavorite':
            st.removeFavorite(item.key)
            break
          case 'remove':
            st.removeRecent(item.key)
            break
        }
      })
    return () => {
      live = false
    }
  }, [item, onClose, onOpenNewTab])
  return null
}

/** `stopPropagation` on pointerdown keeps the press off the row/card drag handle — a pin toggle
 *  must never arm a reorder. Null for adopted entities — they re-mint their id on adoption, so
 *  they can't hold a durable pin. */
export function NavPinButton({
  it,
  className,
}: {
  it: ResolvedNav
  className: string
}): React.JSX.Element | null {
  const pinTarget = useSession((s) => s.pinTarget)
  const unpinTarget = useSession((s) => s.unpinTarget)
  if ('id' in it.target && it.target.id.startsWith('adopted-')) return null
  const toggle = (e: React.MouseEvent): void => {
    e.stopPropagation()
    if (it.pinned) unpinTarget(it.key)
    else pinTarget(it.target)
  }
  return (
    <button
      type="button"
      className={cx(className, it.pinned && 'is-pinned')}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={toggle}
      aria-label={it.pinned ? 'Unpin' : 'Pin'}
    >
      <Icon name="pin" size={13} />
    </button>
  )
}

type RowDrag = ReturnType<typeof useTableRowDrag>

// The whole row is the drag surface + click target — the drop-line gesture suppresses the
// post-drag click itself.
function NavRow({
  it,
  drag,
  onSelect,
  onMenu,
}: {
  it: ResolvedNav
  drag?: RowDrag
  onSelect: (t: NavTarget) => void
  onMenu: (it: ResolvedNav, e: React.MouseEvent) => void
}): React.JSX.Element {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a real <button> cannot host this surface — it doubles as a drag handle and wraps block content
    <div
      ref={drag?.ref}
      role="button"
      tabIndex={0}
      onKeyDown={onActivateKey(() => onSelect(it.target))}
      {...drag?.handle}
      className={cx('nav-item', drag?.isDragging && 'is-dragging')}
      onClick={() => onSelect(it.target)}
      onContextMenu={(e) => {
        e.preventDefault()
        onMenu(it, e)
      }}
    >
      <NavPinButton it={it} className="nav-item-pin" />
      <div className="nav-item-main">
        <EntityGlyph item={it} size={15} className="nav-item-lead" />
        <OverflowScroll className="nav-item-title">{it.title}</OverflowScroll>
        <NavCrumbs path={it.path} className="nav-item-path" iconSize={12} />
      </div>
    </div>
  )
}

function DraggableRow(props: {
  it: ResolvedNav
  onSelect: (t: NavTarget) => void
  onMenu: (it: ResolvedNav, e: React.MouseEvent) => void
}): React.JSX.Element {
  const drag = useTableRowDrag(props.it.key)
  return <NavRow {...props} drag={drag} />
}

// Pins and recents are separate groups — reassign is off, so a drag never crosses the boundary.
export function NavList({
  items,
  pins,
  extras,
  reorderable,
  onReorderRecent,
  onSelect,
  onOpenNewTab,
}: {
  items: ResolvedNav[]
  /** Membership comes from the caller's pin set, never a flag on the rows (mirrors NavGallery). */
  pins?: ResolvedNav[]
  /** Unresolvable hits (agenda kinds) — listed inert until Agenda routing ships. */
  extras?: { key: string; title: string; kind: string }[]
  reorderable?: boolean
  /** Host override for the recents reorder (NavWindow rewrites its frozen snapshot too). */
  onReorderRecent?: (activeKey: string, overKey: string) => void
  onSelect: (target: NavTarget) => void
  /** omitted = the item doesn't render. */
  onOpenNewTab?: (target: NavTarget) => void
}): React.JSX.Element | null {
  const reorderPin = useSession((s) => s.reorderPin)
  const reorderRecentStore = useSession((s) => s.reorderRecent)
  const reorderRecent = onReorderRecent ?? reorderRecentStore
  const [menu, setMenu] = useState<{ item: ResolvedNav } | null>(null)
  const openMenu = (it: ResolvedNav): void => setMenu({ item: it })
  const pinRows = reorderable ? (pins ?? []) : []
  if (items.length === 0 && pinRows.length === 0 && !extras?.length) return null
  const recents = reorderable ? items : []

  // `over` is the old order's occupant of the index the dragged row landed on — the exact splice
  // the stores perform.
  const commitReorder = (orderIds: string[], groupKey: string, activeId: string): void => {
    const group = groupKey === 'pins' ? pinRows : recents
    const keys = new Set(group.map((g) => g.key))
    const nextOrder = orderIds.filter((id) => keys.has(id))
    const over = group[nextOrder.indexOf(activeId)]?.key
    if (!over || over === activeId) return
    ;(groupKey === 'pins' ? reorderPin : reorderRecent)(activeId, over)
  }

  const list = (
    <div className="nav-list">
      {(reorderable ? [...pinRows, ...recents] : items).map((it) =>
        reorderable ? (
          <DraggableRow key={it.key} it={it} onSelect={onSelect} onMenu={openMenu} />
        ) : (
          <NavRow key={it.key} it={it} onSelect={onSelect} onMenu={openMenu} />
        ),
      )}
      {extras?.map((e) => (
        <div
          key={e.key}
          className="nav-item nav-item-inert"
          title="Agenda navigation isn't wired yet"
        >
          <span className="nav-item-title">{e.title}</span>
          <span className={cx('nav-item-path', text.caption.standard)}>{e.kind}</span>
        </div>
      ))}
    </div>
  )
  return (
    <>
      {reorderable ? (
        <TableRowDnd
          rows={[
            ...pinRows.map((p) => ({ id: p.key, groupKey: 'pins' })),
            ...recents.map((r) => ({ id: r.key, groupKey: 'recents' })),
          ]}
          disabled={false}
          canReorderWithin
          canReassign={false}
          reorderTo={commitReorder}
          reassign={() => {}}
        >
          {list}
        </TableRowDnd>
      ) : (
        list
      )}
      {menu && (
        <NavRowMenu item={menu.item} onClose={() => setMenu(null)} onOpenNewTab={onOpenNewTab} />
      )}
    </>
  )
}
