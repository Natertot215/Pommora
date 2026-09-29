import { cx } from '@pommora/uix/Utilities/cx'
import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
import {
  carries,
  DropSlot,
  SortableZone,
  useDragItem,
  type DragItem,
} from '@pommora/uix/Interactions/drag'
import {
  CardBody,
  CardPlaceholder,
  CardRoot,
  CardText,
  CardThumb,
  CardTitle,
  CardTrail,
} from '@pommora/uix/Cards/Card'
import { navKey, TAB_FAMILY, type NavRef, type WindowTarget } from '@pommora/core/Navigation/navRef'
import { useSession } from '../Session/store'
import { pageTargetFromNav, type ResolvedNav, windowTargetFromNav } from './navResolve'
import { EntityIcon } from '../Assets/EntityIcon'
import { NavPinButton, showNavRowMenu } from './NavList'
import { hoverGlance, leaveGlance } from '../Interface/Glance/glanceAction'
import { useThumb } from '../Assets/useThumb'
import './nav-list.css'

export function NavGallery({
  pins,
  items,
  onReorderRecent,
  onSelect,
  onOpenNewTab,
}: {
  pins: ResolvedNav[]
  items: ResolvedNav[]
  onReorderRecent?: (key: string, beforeKey: string | null) => void
  onSelect: (target: NavRef) => void
  onOpenNewTab?: (target: NavRef) => void
}): React.JSX.Element {
  const reorderPin = useSession((s) => s.reorderPin)
  const nexusId = useSession((s) => s.tree?.nexus.id ?? '')
  const tree = useSession((s) => s.tree)
  const frozen = onReorderRecent === undefined
  const find = (key: string): ResolvedNav | undefined =>
    pins.find((p) => p.key === key) ?? items.find((r) => r.key === key)
  const carry = (key: string): WindowTarget | null => {
    const it = find(key)
    return (it && windowTargetFromNav(it, tree)) ?? null
  }
  const renderOverlay = (key: string): React.ReactNode => {
    const it = find(key)
    return it ? (
      <div className="nav-gallery">
        <div className="card-grid">
          <GalleryCard it={it} nexusId={nexusId} onSelect={onSelect} onMenu={openMenu} />
        </div>
      </div>
    ) : null
  }
  const zone = {
    label: (key: string) => find(key)?.title ?? '',
    carry: [carries(TAB_FAMILY, carry)],
    renderOverlay,
  }
  const openMenu = (it: ResolvedNav, e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    void showNavRowMenu(it, onOpenNewTab)
  }
  const card = (it: ResolvedNav): React.JSX.Element => (
    <DraggableCard key={it.key} it={it} nexusId={nexusId} onSelect={onSelect} onMenu={openMenu} />
  )
  return (
    <div className="nav-gallery nav-gallery-list">
      <div className={cx('card-grid', frozen && 'is-fill')}>
        {pins.length > 0 && (
          <SortableZone items={pins.map((p) => p.key)} onMove={reorderPin} {...zone}>
            <DropSlot />
            {pins.map(card)}
          </SortableZone>
        )}
        {frozen ? (
          <SortableZone items={items.map((r) => r.key)} fixed {...zone}>
            {items.map(card)}
          </SortableZone>
        ) : (
          <SortableZone items={items.map((r) => r.key)} onMove={onReorderRecent} {...zone}>
            <DropSlot />
            {items.map(card)}
          </SortableZone>
        )}
      </div>
    </div>
  )
}

function DraggableCard(props: {
  it: ResolvedNav
  nexusId: string
  onSelect: (t: NavRef) => void
  onMenu: (it: ResolvedNav, e: React.MouseEvent) => void
}): React.JSX.Element {
  const drag = useDragItem(props.it.key, { open: () => props.onSelect(props.it.target) })
  return <GalleryCard {...props} drag={drag} />
}

function GalleryCard({
  it,
  nexusId,
  onSelect,
  onMenu,
  drag,
}: {
  it: ResolvedNav
  nexusId: string
  onSelect: (t: NavRef) => void
  onMenu: (it: ResolvedNav, e: React.MouseEvent) => void
  drag?: DragItem
}): React.JSX.Element {
  const active = useSession((s) => s.selection.kind !== 'none' && navKey(s.selection) === it.key)
  const { src, onError } = useThumb(nexusId, it.key)

  return (
    <CardRoot
      drag={drag}
      active={active}
      locked
      data-reveal-host=""
      onClick={() => onSelect(it.target)}
      onPointerEnter={(e) => {
        const t = pageTargetFromNav(it, useSession.getState().tree)
        if (t) hoverGlance(t, e.currentTarget, 'location', e.shiftKey)
      }}
      onPointerLeave={() => leaveGlance()}
      onContextMenu={(e) => onMenu(it, e)}
    >
      <CardBody>
        <CardThumb capture>
          {src ? (
            <img src={src} loading="lazy" alt="" onError={onError} />
          ) : (
            <CardPlaceholder>
              <EntityIcon item={it} size="titleMedium" />
            </CardPlaceholder>
          )}
          <NavPinButton it={it} className={cx(revealTarget, 'card-pin')} />
        </CardThumb>
        <CardText>
          <CardTitle>
            <EntityIcon item={it} size="body" className="card-title-icon" />
            {it.title}
          </CardTitle>
          <CardTrail segments={it.path} />
        </CardText>
      </CardBody>
    </CardRoot>
  )
}
