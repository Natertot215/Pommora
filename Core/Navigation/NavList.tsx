import { Icon } from '@pommora/uix/Symbols'
import { cx } from '@pommora/uix/Utilities/cx'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { MenuItem, menuDropLine } from '@pommora/uix/Menus'
import { overlay } from '@pommora/uix/Menus/menu-row.css'
import { carries, LineRow, LineZone, lineList } from '@pommora/uix/Interactions/drag'
import {
  isWindowTarget,
  type NavRef,
  type WindowTarget,
  type SelectTarget,
} from '@pommora/core/Navigation/navRef'
import { TAB_FAMILY } from './tabRows'
import { useSession } from '../Session/store'
import { pageMoveContext, runPageAction } from '../Interface/Menus/pageMenuActions'
import { isOpenInTabs, isPinned, liveTarget } from './tabsModel'
import { reconcileIndexOf } from '../Nexus/treeIndex'
import { pageTargetFromNav, type ResolvedNav, windowTargetFromNav } from './navResolve'
import { hoverGlance, leaveGlance } from '../Interface/Glance/glanceAction'
import { EntityIcon } from '../Assets/EntityIcon'
import './nav-list.css'
import { pinLabel } from '@pommora/core/Actions/toggleLabels'
import { popMenu } from '../Actions/menuActions'
import { navRowMenuItems } from '@pommora/core/Actions/navRowMenu'

export async function showNavRowMenu(
  item: ResolvedNav,
  onOpenNewTab?: (target: NavRef) => void,
): Promise<void> {
  const s = useSession.getState()
  const target = item.target
  const livePage =
    target.kind === 'page' && s.tree ? liveTarget(reconcileIndexOf(s.tree), target) : null
  const livePath = livePage?.kind === 'page' ? livePage.path : undefined
  const action = await popMenu(
    navRowMenuItems({
      canOpenNewTab: onOpenNewTab !== undefined,
      alreadyOpen: isOpenInTabs(s.tabs, s.pinned, target as SelectTarget),
      kind: target.kind,
      isPinned: isPinned(target, s.pinned),
      ...(livePath ? pageMoveContext(s.tree, livePath) : {}),
    }),
  )
  const st = useSession.getState()
  if (action && livePage?.kind === 'page' && runPageAction(action, livePage)) return
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
    case 'remove':
      st.removeRecent(item.key)
      break
  }
}

export function NavPinButton({
  it,
  className,
}: {
  it: ResolvedNav
  className?: string
}): React.JSX.Element | null {
  const pinned = isPinned(
    it.target,
    useSession((s) => s.pinned),
  )
  const pinTarget = useSession((s) => s.pinTarget)
  const unpinTarget = useSession((s) => s.unpinTarget)
  if ('id' in it.target && it.target.id.startsWith('adopted-')) return null
  const toggle = (e: React.MouseEvent): void => {
    e.stopPropagation()
    if (pinned) unpinTarget(it.key)
    else pinTarget(it.target)
  }
  return (
    <button
      type="button"
      className={cx(className, pinned && 'is-pinned')}
      data-reveal-held={pinned || undefined}
      onClick={toggle}
      aria-label={pinLabel(pinned)}
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
  const select = (): void => onSelect(it.target)
  return (
    <LineRow id={it.key} open={select}>
      <MenuItem
        tabIndex={-1}
        leading={<EntityIcon item={it} size="headline" />}
        detail={<NavTrail segments={it.path} iconSize="control" />}
        overlay={<NavPinButton it={it} className={cx(overlay, 'nav-pin')} />}
        onClick={select}
        onPointerEnter={(e) => {
          const t = pageTargetFromNav(it, useSession.getState().tree)
          if (t) hoverGlance(t, e.currentTarget, 'location', e.shiftKey)
        }}
        onPointerLeave={() => leaveGlance()}
        onContextMenu={(e) => {
          e.preventDefault()
          onMenu(it)
        }}
      >
        {it.title}
      </MenuItem>
    </LineRow>
  )
}

export function NavList({
  items,
  pins,
  onReorderRecent,
  onSelect,
  onOpenNewTab,
}: {
  items: ResolvedNav[]
  pins: ResolvedNav[]
  onReorderRecent?: (key: string, beforeKey: string | null) => void
  onSelect: (target: NavRef) => void
  onOpenNewTab?: (target: NavRef) => void
}): React.JSX.Element | null {
  const reorderPin = useSession((s) => s.reorderPin)
  const tree = useSession((s) => s.tree)
  const openMenu = (it: ResolvedNav): void => void showNavRowMenu(it, onOpenNewTab)
  const rows = [...pins, ...items]
  if (rows.length === 0) return null

  const find = (key: string): ResolvedNav | undefined => rows.find((r) => r.key === key)
  const carry = (key: string): WindowTarget | null => {
    const it = find(key)
    return (it && windowTargetFromNav(it, tree)) ?? null
  }

  return (
    <LineZone
      {...lineList({
        laneOf: () => {
          const pinned = new Set(pins.map((p) => p.key))
          return (k) => (pinned.has(k) ? 'pins' : 'recents')
        },
        locked: !onReorderRecent,
        commit: (key, slot) =>
          slot.lane === 'pins' ? reorderPin(key, slot.before) : onReorderRecent?.(key, slot.before),
        line: menuDropLine,
        label: (key) => find(key)?.title ?? '',
        glyph: (key) => {
          const it = find(key)
          return it && <EntityIcon item={it} />
        },
        watch: [pins, items],
      })}
      carry={[carries(TAB_FAMILY, carry)]}
    >
      <div className="nav-list">
        {rows.map((it) => (
          <NavRow key={it.key} it={it} onSelect={onSelect} onMenu={openMenu} />
        ))}
      </div>
    </LineZone>
  )
}
