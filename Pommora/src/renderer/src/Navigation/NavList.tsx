import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { NavTrail } from '@renderer/DesignSystem/Elements/NavTrail'
import { MenuItem } from '@renderer/DesignSystem/Menus'
import { overlay, rowDragging } from '@renderer/DesignSystem/Menus/menu-base.css'
import { TableRowDnd, useTableRowDrag } from '@renderer/Tables/tableDnd'
import type { NavRef, SelectTarget } from '@shared/types'
import { useSession } from '../store'
import { pageMoveContext, runPageSendAction } from '../pageMenuActions'
import { isOpenInTabs, liveTarget } from '../Tabs/tabsModel'
import { reconcileIndexOf } from '../treeIndex'
import { navKey } from './navRecents'
import type { ResolvedNav } from './navResolve'
import { EntityGlyph } from './EntityGlyph'
import './navList.css'
import { pinLabel } from '@shared/toggleLabels'

/** A NATIVE Electron menu (the tab/cell-menu pattern) — renders nothing, fires on mount, closes
 *  when the menu resolves. Shared by the NavWindow list AND gallery. */
export function NavRowMenu({
  item,
  onClose,
  onOpenNewTab,
}: {
  item: ResolvedNav
  onClose: () => void
  onOpenNewTab?: (target: NavRef) => void
}): null {
  useEffect(() => {
    let live = true
    const s = useSession.getState()
    const target = item.target
    const isPinned = s.pinned.some((p) => navKey(p) === item.key)
    const isFavorite = s.favorites.some((f) => navKey(f) === item.key)
    // A stored ref carries no path, so the send block's actions address the page through the live
    // tree — the same mint the preview item makes.
    const livePage =
      target.kind === 'page' && s.tree ? liveTarget(reconcileIndexOf(s.tree), target) : null
    const livePath = livePage?.kind === 'page' ? livePage.path : undefined
    void window.nexus
      .navRowMenu({
        canOpenNewTab: onOpenNewTab !== undefined,
        alreadyOpen: isOpenInTabs(s.tabs, s.pinned, target as SelectTarget),
        isPage: target.kind === 'page',
        isPinned,
        isFavorite,
        ...(livePath ? pageMoveContext(s.tree, livePath) : {}),
      })
      .then((action) => {
        if (!live) return
        onClose()
        const st = useSession.getState()
        if (action && livePath && runPageSendAction(action, livePath)) return
        switch (action) {
          case 'open-new-tab':
            onOpenNewTab?.(target)
            break
          case 'open-preview':
            if (target.kind === 'page' && st.tree) {
              // A stored ref carries no path — mint one against the live tree, exactly as go() does.
              const livePage = liveTarget(reconcileIndexOf(st.tree), target)
              if (livePage?.kind !== 'page') break
              // Inside the NavWindow the override routes this to a tab in THAT window; off → the floating preview.
              const ref = { id: livePage.id, path: livePage.path }
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
  className?: string
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
      className={cx('nav-pin', className, it.pinned && 'is-pinned')}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={toggle}
      aria-label={pinLabel(it.pinned)}
    >
      <Icon name="pin" size="body" />
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
  onSelect: (t: NavRef) => void
  onMenu: (it: ResolvedNav) => void
}): React.JSX.Element {
  return (
    <MenuItem
      ref={drag?.ref}
      className={cx(drag?.isDragging && rowDragging)}
      leading={<EntityGlyph item={it} size="title3" />}
      detail={<NavTrail segments={it.path} iconSize="control" />}
      overlay={<NavPinButton it={it} className={overlay} />}
      onPointerDown={drag?.handle.onPointerDown}
      onClick={() => onSelect(it.target)}
      onContextMenu={(e) => {
        e.preventDefault()
        onMenu(it)
      }}
    >
      {it.title}
    </MenuItem>
  )
}

function DraggableRow(props: {
  it: ResolvedNav
  onSelect: (t: NavRef) => void
  onMenu: (it: ResolvedNav) => void
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
  /** Hits whose kind has no click destination — listed inert so they stay findable. */
  extras?: { key: string; title: string; kind: string }[]
  reorderable?: boolean
  /** Host override for the recents reorder (NavWindow rewrites its frozen snapshot too). */
  onReorderRecent?: (activeKey: string, overKey: string) => void
  onSelect: (target: NavRef) => void
  /** omitted = the item doesn't render. */
  onOpenNewTab?: (target: NavRef) => void
}): React.JSX.Element | null {
  const reorderPin = useSession((s) => s.reorderPin)
  const reorderRecentStore = useSession((s) => s.reorderRecent)
  const reorderRecent = onReorderRecent ?? reorderRecentStore
  const [menu, setMenu] = useState<{ item: ResolvedNav } | null>(null)
  const openMenu = (it: ResolvedNav): void => setMenu({ item: it })
  const pinRows = reorderable ? (pins ?? []) : []
  // Identity-stable so a parent re-render mid-drag can't false-dirty the drag's row snapshot.
  const dndRows = useMemo(
    () =>
      reorderable
        ? [
            ...(pins ?? []).map((p) => ({ id: p.key, groupKey: 'pins' })),
            ...items.map((r) => ({ id: r.key, groupKey: 'recents' })),
          ]
        : [],
    [reorderable, pins, items],
  )
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
        <MenuItem key={e.key} disabled detail={e.kind}>
          <span title="This result can't be opened" style={{ pointerEvents: 'auto' }}>
            {e.title}
          </span>
        </MenuItem>
      ))}
    </div>
  )
  return (
    <>
      {reorderable ? (
        <TableRowDnd
          rows={dndRows}
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
