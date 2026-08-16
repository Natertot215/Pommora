import { type ReactNode, useRef, useState } from 'react'
import type { CollectionNode, SetNode } from '@shared/types'
import type { PropertyDefinition } from '@shared/properties'
import { mintDefaultView, mintNewView, type SavedView } from '@shared/views'
import { Icon, iconNameOr } from '@renderer/design-system/symbols'
import {
  Menu,
  MenuItem,
  MenuBottomRow,
  MenuScrollFrame,
  AccessoryButton,
} from '../design-system/components/menu'
import { titleInput } from '../design-system/components/menu/menu.css'
import { PaneSlider } from '../Components/Detail/PaneSlider'
import { ViewSettings } from '../Components/Detail/ViewSettings'
import { PaneDnd, RowShell, usePaneRegions } from '../Components/Detail/paneDnd'
import type { PaneDrop, PaneRow, paneSlot } from '../Components/Detail/paneDndModel'
import { useSaveView, useViewEmbedScope } from '@renderer/Embeds/ViewEmbedScope'
import { ColorPicker } from '../Components/Detail/ColorPicker'
import { chipColorFor } from '@renderer/design-system/tokens/colorMap'
import { RenamableLabel } from '../Components/RenamableLabel'
import { IconPicker } from '../Components/IconPicker'
import { useSession } from '../store'
import { optionRing } from '@renderer/design-system/components/PickerMenu/pickerMenu.css'
import * as vd from './toolbarDropdown.css'

// Width/height floor — a sparse list reserves the square (footer pinned to bottom); rows fill
// top-down and only grow the pane past it.
const PANE_SQUARE = 225

const viewSlot: typeof paneSlot = (rows, _byId, _regions, pointerY, draggedId) => {
  const others = rows.filter((r) => r.id !== draggedId)
  let i = 0
  while (i < others.length && pointerY >= others[i].mid) i++
  const last = others[others.length - 1]
  const lineY = i < others.length ? others[i].top : last ? last.bottom : null
  return {
    drop: { kind: 'reorder-assigned', propId: draggedId, toIndex: i },
    lineY,
    highlightAll: false,
  }
}

/** A pure reorder has no assign/hide zones, so both of the engine's region refs ride this one
 *  element — its snapshot needs both non-null even though `viewSlot` ignores their rects. */
function DragRegion({ children }: { children: ReactNode }): React.JSX.Element {
  const { assignedRef, allRef } = usePaneRegions()
  const region = (el: HTMLElement | null): void => {
    assignedRef(el)
    allRef(el)
  }
  return (
    <div ref={region} data-group="assigned">
      {children}
    </div>
  )
}

export function ViewPane({
  node,
  schema,
  onClose,
}: {
  node: CollectionNode | SetNode
  schema: PropertyDefinition[]
  onClose: () => void
}): React.JSX.Element | null {
  const setActiveView = useSession((s) => s.setActiveView)
  const load = useSession((s) => s.load)
  const saveView = useSaveView(node, load)
  const storedActive = useSession((s) => s.activeViews[node.id])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  // Holds the view whose glyph is being picked, not a bare flag: the picker opens from a ROW's menu,
  // and the pane's `editing` is the drill target — null whenever that list is on screen.
  const [iconFor, setIconFor] = useState<SavedView | null>(null)
  const [colorFor, setColorFor] = useState<SavedView | null>(null)
  const menuAnchorRef = useRef<HTMLElement | null>(null)
  const scope = useViewEmbedScope()
  // Never mounts inside a view embed until the payload switcher lands — CRUD here would bypass the scope.
  if (scope) return null
  const views = node.views ?? []
  // During the entry-mint beat (a legacy container's first open, before refetch lands) shows the
  // in-memory sentinel default — same as the button + table.
  const rows = views.length ? views : [mintDefaultView(schema)]
  // Fallback to the first row keeps the outline on exactly one row even with a gone/unset pointer.
  const activeId = rows.some((v) => v.id === storedActive) ? storedActive : rows[0]?.id
  // Re-derived from the live tree each render so an edit shows fresh, not stale; a deleted id
  // collapses back to the list.
  const editing = editingId ? rows.find((v) => v.id === editingId) : undefined

  // Selecting switches the active view but leaves the dropdown open, so you can see (and keep
  // switching) which view you're in.
  const switchTo = (id: string): void => void setActiveView(node.id, id)
  const createView = async (): Promise<void> => {
    await window.nexus.views.save(node.path, node.kind, mintNewView('Untitled', schema))
    await load()
  }

  const paneRows: PaneRow[] = rows.map((v) => ({ id: v.id, group: 'assigned' as const }))
  const nameFor = (id: string): string => rows.find((v) => v.id === id)?.name ?? ''
  const onDrop = (drop: PaneDrop): void => {
    if (drop.kind !== 'reorder-assigned' || views.length < 2) return
    const order = rows.map((v) => v.id).filter((id) => id !== drop.propId)
    order.splice(drop.toIndex, 0, drop.propId)
    void (async () => {
      const res = await window.nexus.views.reorder(node.path, node.kind, order)
      if (!res.ok) return void window.nexus.showError(res.error.message)
      await load()
    })()
  }

  const commitRename = (v: SavedView, next: string): void => {
    setRenamingId(null)
    void saveView({ ...v, name: next })
  }
  const rowMenu = async (v: SavedView, e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    // The row the menu opened from is what a picker it leads to anchors against.
    menuAnchorRef.current = e.currentTarget as HTMLElement
    const action = await window.nexus.viewRowMenu({ colorable: true, deletable: views.length > 1 })
    switch (action) {
      case 'rename':
        return setRenamingId(v.id)
      case 'icon':
        return setIconFor(v)
      case 'color':
        return setColorFor(v)
      case 'delete':
        return void deleteRow(v)
      default:
        return
    }
  }
  const deleteRow = async (v: SavedView): Promise<void> => {
    const res = await window.nexus.views.delete(node.path, node.kind, v.id)
    if (!res.ok) return void window.nexus.showError(res.error.message)
    await load()
  }

  const list = (
    <MenuScrollFrame
      footer={
        <MenuBottomRow
          leading={
            <AccessoryButton
              icon="plus"
              size={12}
              box={20}
              create
              ariaLabel="New View"
              onClick={() => void createView()}
            />
          }
          trailing={
            // Parked: the per-view actions menu hasn't landed. Inert rather than a live button
            // that swallows its own click.
            <AccessoryButton
              icon="dots"
              size={12}
              box={20}
              ariaLabel="More"
              disabled
              onClick={() => {}}
            />
          }
        />
      }
    >
      <PaneDnd rows={paneRows} labelFor={nameFor} onDrop={onDrop} slot={viewSlot}>
        <DragRegion>
          <Menu>
            {rows.map((v) => (
              <RowShell key={v.id} id={v.id}>
                <MenuItem
                  className={activeId === v.id ? optionRing : undefined}
                  leading={<Icon name={iconNameOr(v.icon, 'table')} size={16} />}
                  trailing={
                    <button
                      type="button"
                      className={vd.chevronButton}
                      aria-label={`Edit ${v.name}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingId(v.id)
                      }}
                    >
                      <Icon name="chevron-right" size={16} />
                    </button>
                  }
                  onClick={renamingId === v.id ? undefined : () => switchTo(v.id)}
                  onContextMenu={(e) => void rowMenu(v, e)}
                >
                  <RenamableLabel
                    renames="title"
                    editing={renamingId === v.id}
                    value={v.name}
                    className={titleInput}
                    onCommit={(next) => commitRename(v, next)}
                    onCancel={() => setRenamingId(null)}
                  />
                </MenuItem>
              </RowShell>
            ))}
          </Menu>
        </DragRegion>
      </PaneDnd>
    </MenuScrollFrame>
  )

  const detail = editing ? (
    <ViewSettings
      source={node}
      view={editing}
      schema={schema}
      door="full"
      onBack={() => setEditingId(null)}
      onClose={onClose}
    />
  ) : null

  return (
    <>
      <PaneSlider
        open={!!editing}
        root={list}
        detail={detail}
        minWidth={PANE_SQUARE}
        minHeight={PANE_SQUARE}
      />
      <IconPicker
        open={!!iconFor}
        onClose={() => setIconFor(null)}
        value={iconFor?.icon}
        onSelect={(icon) => {
          if (iconFor) void saveView({ ...iconFor, icon })
        }}
      />
      <ColorPicker
        open={colorFor !== null}
        selected={chipColorFor(colorFor?.color)}
        onPick={(picked) => {
          if (colorFor) void saveView({ ...colorFor, color: picked })
          setColorFor(null)
        }}
        onDismiss={() => setColorFor(null)}
        triggerRef={menuAnchorRef}
      />
    </>
  )
}
