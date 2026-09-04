import { useState } from 'react'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { SortableZone, useDragItem, type DragItem } from '@renderer/Interactions/drag'
import {
  CardBody,
  CardDropSlot,
  CardPlaceholder,
  CardRoot,
  CardText,
  CardThumb,
  CardTitle,
  CardTrail,
} from '@renderer/Cards/Card'
import type { NavRef } from '@shared/types'
import { useSession } from '../store'
import { navKey } from './navRecents'
import type { ResolvedNav } from './navResolve'
import { EntityIcon } from '@renderer/Utilities/EntityIcon'
import { NavPinButton, NavRowMenu } from './NavList'
import './nav-gallery.css'
import { onActivateKey } from '@renderer/Interactions/activate'
import { thumbKey, thumbRel } from '@shared/nexusPaths'
import { assetUrl } from '@renderer/Assets/assetUrl'

export function NavGallery({
  pins,
  items,
  frozenLayout,
  onReorderRecent,
  onSelect,
  onOpenNewTab,
}: {
  pins: ResolvedNav[]
  items: ResolvedNav[]
  frozenLayout?: boolean
  onReorderRecent?: (activeKey: string, overKey: string) => void
  onSelect: (target: NavRef) => void
  onOpenNewTab?: (target: NavRef) => void
}): React.JSX.Element {
  const reorderPin = useSession((s) => s.reorderPin)
  const reorderRecentStore = useSession((s) => s.reorderRecent)
  const reorderRecent = onReorderRecent ?? reorderRecentStore
  const nexusId = useSession((s) => s.tree?.nexus.id ?? '')
  const [menu, setMenu] = useState<{ item: ResolvedNav } | null>(null)
  const openMenu = (it: ResolvedNav, e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ item: it })
  }
  const card = (it: ResolvedNav): React.JSX.Element => (
    <DraggableCard key={it.key} it={it} nexusId={nexusId} onSelect={onSelect} onMenu={openMenu} />
  )
  return (
    <div className="nav-gallery">
      <div className={cx('card-grid', frozenLayout && 'is-fill')}>
        {pins.length > 0 && (
          <SortableZone items={pins.map((p) => p.key)} layout="grid" onReorder={reorderPin}>
            <CardDropSlot />
            {pins.map(card)}
          </SortableZone>
        )}
        {frozenLayout ? (
          items.map((it) => (
            <GalleryCard
              key={it.key}
              it={it}
              nexusId={nexusId}
              onSelect={onSelect}
              onMenu={openMenu}
            />
          ))
        ) : (
          <SortableZone items={items.map((r) => r.key)} layout="grid" onReorder={reorderRecent}>
            <CardDropSlot />
            {items.map(card)}
          </SortableZone>
        )}
      </div>
      {menu && (
        <NavRowMenu item={menu.item} onClose={() => setMenu(null)} onOpenNewTab={onOpenNewTab} />
      )}
    </div>
  )
}

function DraggableCard(props: {
  it: ResolvedNav
  nexusId: string
  onSelect: (t: NavRef) => void
  onMenu: (it: ResolvedNav, e: React.MouseEvent) => void
}): React.JSX.Element {
  const drag = useDragItem(props.it.key)
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
  const selection = useSession((s) => s.selection)
  const version = useSession((s) => s.thumbVersions[it.key] ?? 0)
  const [failed, setFailed] = useState(false)

  const active = selection.kind !== 'none' && navKey(selection) === it.key
  const src = `${assetUrl(thumbRel(nexusId, thumbKey(it.key)))}?v=${version}`
  // The drag engine fires a synthesized click after a pointer drag — don't treat a reorder-drop as a
  // navigation (mirrors TableView's `!isDragging` guard).
  const open = (): void => {
    if (!drag?.isDragging) onSelect(it.target)
  }

  return (
    <CardRoot
      drag={drag}
      active={active}
      locked
      {...(drag ? {} : { onKeyDown: onActivateKey(() => onSelect(it.target)) })}
      onClick={open}
      onContextMenu={(e) => onMenu(it, e)}
    >
      <CardBody>
        <CardThumb capture>
          {failed ? (
            <CardPlaceholder>
              <EntityIcon item={it} size="titleMedium" />
            </CardPlaceholder>
          ) : (
            <img src={src} loading="lazy" alt="" onError={() => setFailed(true)} />
          )}
          <NavPinButton it={it} className="card-pin" />
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
