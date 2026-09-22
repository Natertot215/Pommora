import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@pommora/uix/Symbols'
import { cx } from '@pommora/uix/Utilities/cx'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { MenuItem } from '@pommora/uix/Menus'
import { overlay, rowDragging } from '@pommora/uix/Menus/menu-base.css'
import { TableRowDnd, useTableRowDrag } from '@pommora/uix/Interactions/tableDnd'
import { nextOrder } from '@pommora/uix/Interactions/reorderModel'
import { useEscort } from '@pommora/uix/Interactions/drag'
import {
  isWindowTarget,
  TAB_FAMILY,
  type NavRef,
  type PageTarget,
  type SelectTarget,
} from '@pommora/core/Navigation/navRef'
import { useSession } from '../Session/store'
import { pageMoveContext, runPageSendAction } from '../Interface/Menus/pageMenuActions'
import { isOpenInTabs, liveTarget } from './tabsModel'
import { reconcileIndexOf } from '../Nexus/treeIndex'
import { navKey } from './navRecents'
import { pageTargetFromNav, type ResolvedNav } from './navResolve'
import { hoverGlance, leaveGlance } from '../Interface/Glance/glanceLink'
import { EntityIcon } from '../Assets/EntityIcon'
import './nav-list.css'
import { pinLabel } from '@pommora/core/Actions/toggleLabels'
import { popMenu } from '../Actions/menuActions'
import { navRowMenuItems } from '@pommora/core/Actions/navRowMenu'

export function NavRowMenu({
  item,
  onClose,
  onOpenNewTab,
}: {
  item: ResolvedNav
  onClose: () => void
  onOpenNewTab?: (target: NavRef) => void
}): null {
  const opened = useRef(false)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    if (opened.current)
      return () => {
        alive.current = false
      }
    opened.current = true
    const s = useSession.getState()
    const target = item.target
    const isPinned = s.pinned.some((p) => navKey(p) === item.key)
    const isFavorite = s.favorites.some((f) => navKey(f) === item.key)
    const livePage =
      target.kind === 'page' && s.tree ? liveTarget(reconcileIndexOf(s.tree), target) : null
    const livePath = livePage?.kind === 'page' ? livePage.path : undefined
    void popMenu(
      navRowMenuItems({
        canOpenNewTab: onOpenNewTab !== undefined,
        alreadyOpen: isOpenInTabs(s.tabs, s.pinned, target as SelectTarget),
        kind: target.kind,
        isPinned,
        isFavorite,
        ...(livePath ? pageMoveContext(s.tree, livePath) : {}),
      }),
    ).then((action) => {
      if (!alive.current) return
      onClose()
      const st = useSession.getState()
      if (action && livePage?.kind === 'page' && runPageSendAction(action, livePage)) return
      switch (action) {
        case 'open-new-tab':
          onOpenNewTab?.(target)
          break
        case 'open-window': {
          const live = st.tree ? liveTarget(reconcileIndexOf(st.tree), target) : null
          if (live && isWindowTarget(live)) st.openWindowTab(live)
          break
        }
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
      alive.current = false
    }
  }, [])
  return null
}

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
      className={cx(className, it.pinned && 'is-pinned')}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={toggle}
      aria-label={pinLabel(it.pinned)}
    >
      <Icon name="pin" size="body" />
    </button>
  )
}

function NavRow({
  it,
  onSelect,
  onMenu,
}: {
  it: ResolvedNav
  onSelect: (t: NavRef) => void
  onMenu: (it: ResolvedNav) => void
}): React.JSX.Element {
  const drag = useTableRowDrag(it.key)
  return (
    <MenuItem
      ref={drag.ref}
      className={cx(drag.isDragging && rowDragging)}
      leading={<EntityIcon item={it} size="headline" />}
      detail={<NavTrail segments={it.path} iconSize="control" />}
      overlay={<NavPinButton it={it} className={cx(overlay, 'nav-pin')} />}
      onPointerDown={drag.handle.onPointerDown}
      onClick={() => onSelect(it.target)}
      onMouseEnter={(e) => {
        const t = pageTargetFromNav(it, useSession.getState().tree)
        if (t) hoverGlance(t, e.currentTarget, 'location', e.shiftKey)
      }}
      onMouseLeave={() => leaveGlance()}
      onContextMenu={(e) => {
        e.preventDefault()
        onMenu(it)
      }}
    >
      {it.title}
    </MenuItem>
  )
}

export function NavList({
  items,
  pins,
  reorderable,
  onReorderRecent,
  onSelect,
  onOpenNewTab,
}: {
  items: ResolvedNav[]
  pins?: ResolvedNav[]
  reorderable?: boolean
  onReorderRecent?: (activeKey: string, overKey: string) => void
  onSelect: (target: NavRef) => void
  onOpenNewTab?: (target: NavRef) => void
}): React.JSX.Element | null {
  const reorderPin = useSession((s) => s.reorderPin)
  const tree = useSession((s) => s.tree)
  const escort = useEscort()
  const [menu, setMenu] = useState<{ item: ResolvedNav } | null>(null)
  const openMenu = (it: ResolvedNav): void => setMenu({ item: it })
  const pinRows = reorderable ? (pins ?? []) : []
  const rows = [...pinRows, ...items]
  // Identity-stable so a parent re-render mid-drag can't false-dirty the drag's row snapshot.
  const dndRows = useMemo(
    () => [
      ...pinRows.map((p) => ({ id: p.key, groupKey: 'pins' })),
      ...items.map((r) => ({ id: r.key, groupKey: 'recents' })),
    ],
    [reorderable, pins, items],
  )
  if (rows.length === 0) return null

  const commitReorder = (activeId: string, groupKey: string, beforeId: string | null): void => {
    const group = groupKey === 'pins' ? pinRows : items
    const next = nextOrder(
      group.map((g) => g.key),
      activeId,
      beforeId,
    )
    const over = group[next.indexOf(activeId)]?.key
    if (!over || over === activeId) return
    if (groupKey === 'pins') reorderPin(activeId, over)
    else onReorderRecent?.(activeId, over)
  }
  const carry = (key: string): PageTarget | null => {
    const it = rows.find((r) => r.key === key)
    return (it && pageTargetFromNav(it, tree)) ?? null
  }
  const ghostOf = (key: string): React.ReactNode => {
    const it = rows.find((r) => r.key === key)
    return it ? (
      <>
        <EntityIcon item={it} size="body" />
        {it.title}
      </>
    ) : null
  }

  return (
    <>
      <TableRowDnd
        rows={dndRows}
        disabled={false}
        canReorderWithin={!!reorderable}
        crossZone={false}
        onDrop={commitReorder}
        escort={escort && { via: escort, family: TAB_FAMILY, carry }}
        ghostLabel={ghostOf}
      >
        <div className="nav-list">
          {rows.map((it) => (
            <NavRow key={it.key} it={it} onSelect={onSelect} onMenu={openMenu} />
          ))}
        </div>
      </TableRowDnd>
      {menu && (
        <NavRowMenu item={menu.item} onClose={() => setMenu(null)} onOpenNewTab={onOpenNewTab} />
      )}
    </>
  )
}
