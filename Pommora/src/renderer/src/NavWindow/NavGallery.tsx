import { useState } from 'react'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { text } from '@renderer/DesignSystem/Tokens'
import { OverScroll } from '@renderer/DesignSystem/Interactions/OverScroll'
import { SortableZone, useDragItem, type DragItem } from '@renderer/DesignSystem/Interactions/drag'
import type { NavRef } from '@shared/types'
import { useSession } from '../store'
import { navKey } from '../Navigation/navRecents'
import type { ResolvedNav } from '../Navigation/navResolve'
import { EntityGlyph } from '../Navigation/EntityGlyph'
import { NavTrail } from '@renderer/DesignSystem/Elements/NavTrail'
import { NavPinButton, NavRowMenu } from '../Navigation/NavList'
import './navGallery.css'
import { onActivateKey } from '@renderer/DesignSystem/Interactions/activate'
import { thumbKey, thumbRel } from '@shared/nexusPaths'
import { assetUrl } from '../assetUrl'

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
  // NavWindow overrides to also rewrite its frozen snapshot; NavView uses the store directly.
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
  // Search results render static — dragging a filtered view would rewrite the recents order out from under the query.
  return (
    <div className="nav-gallery">
      <div className={cx('nav-gallery-grid', frozenLayout && 'is-fill')}>
        {pins.length > 0 && (
          <SortableZone items={pins.map((p) => p.key)} layout="grid" onReorder={reorderPin}>
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
    // biome-ignore lint/a11y/useSemanticElements: a real <button> cannot host this surface — it doubles as a drag handle and wraps block content
    // biome-ignore lint/a11y/useKeyWithClickEvents: the drag handle spread supplies onKeyDown (Space/Enter lift), which a spread hides from static analysis
    <div
      ref={drag?.setNodeRef}
      style={drag?.style}
      {...(drag?.handle ?? {})}
      role="button"
      tabIndex={0}
      {...(drag ? {} : { onKeyDown: onActivateKey(() => onSelect(it.target)) })}
      className={cx('nav-gallery-card', active && 'is-active', drag?.isDragging && 'is-dragging')}
      onClick={open}
      onContextMenu={(e) => onMenu(it, e)}
    >
      <div className="nav-gallery-card-body hover-pop">
        <div className="nav-gallery-thumb">
          {failed ? (
            <div className="nav-gallery-ph">
              <EntityGlyph item={it} size="title1" />
            </div>
          ) : (
            <img src={src} loading="lazy" alt="" onError={() => setFailed(true)} />
          )}
          <NavPinButton it={it} className="nav-gallery-pin" />
        </div>
        <div className="nav-gallery-text">
          <OverScroll className={cx('nav-gallery-title', text.footnote.emphasized)}>
            <EntityGlyph item={it} size="body" className="nav-gallery-title-icon" />
            {it.title}
          </OverScroll>
          <NavTrail segments={it.path} className={cx('nav-gallery-loc', text.caption.standard)} />
        </div>
      </div>
    </div>
  )
}
