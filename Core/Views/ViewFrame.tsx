import { type ReactNode, useRef, useState } from 'react'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { mintDefaultView, mintNewView, type SavedView } from '@pommora/core/Views/views'
import { askDeleteView } from '../Interface/confirmations'
import { notifyDeleted, notifyError } from '../Interface/notifications'
import { restoreView } from './restoreView'
import { Button } from '@pommora/uix/Buttons'
import { Icon, iconNameOr } from '@pommora/uix/Symbols'
import { Menu, MenuItem, MenuFooting, MenuScrollFrame, AccessoryButton } from '@pommora/uix/Menus'
import { titleInput } from '@pommora/uix/Menus/menu-base.css'
import { FrameSlide } from '@pommora/uix/Menus/frame-slide'
import { LayoutFrame } from './LayoutFrame'
import { FrameDnd, RowShell, useFrameRegions } from '@pommora/uix/Interactions/frameDnd'
import type { PaneDrop, FrameRow, frameSlot } from '@pommora/uix/Interactions/frameDndModel'
import { useSaveView, useViewTileScope } from './ViewTileScope'
import { ColorPicker } from '@pommora/uix/Pickers/ColorPicker/ColorPicker'
import { labelColorFor } from '@pommora/uix/Theme/colorMap'
import { RenamableLabel } from '@pommora/uix/Fields'
import { IconPicker } from '../Assets/IconPicker'
import { useSession } from '../Session/store'
import { optionRing } from '@pommora/uix/Pickers/picker-base.css'
import * as vd from '../Interface/Toolbar/toolbar-menu.css'
import { host } from '../Platform/dialer'

const PANE_SQUARE = 225

const viewSlot: typeof frameSlot = (rows, _byId, _regions, pointerY, draggedId) => {
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

function DragRegion({ children }: { children: ReactNode }): React.JSX.Element {
  const { assignedRef, allRef } = useFrameRegions()
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

export function ViewFrame({
  node,
  schema,
  onClose,
}: {
  node: CollectionNode | SetNode
  schema: PropertyDefinition[]
  onClose: () => void
}): React.JSX.Element | null {
  const setActiveView = useSession((s) => s.setActiveView)
  const saveView = useSaveView(node)
  const storedActive = useSession((s) => s.activeViews[node.id])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [iconFor, setIconFor] = useState<SavedView | null>(null)
  const [colorFor, setColorFor] = useState<SavedView | null>(null)
  const menuAnchorRef = useRef<HTMLElement | null>(null)
  const scope = useViewTileScope()
  // Never mounts inside a view embed until the payload switcher lands — CRUD here would bypass the scope.
  if (scope) return null
  const views = node.views ?? []
  const rows = views.length ? views : [mintDefaultView(schema)]
  const activeId = rows.some((v) => v.id === storedActive) ? storedActive : rows[0]?.id
  const editing = editingId ? rows.find((v) => v.id === editingId) : undefined

  const switchTo = (id: string): void => void setActiveView(node.id, id)
  const createView = async (): Promise<void> => {
    await host().ask('views:save', node.path, node.kind, mintNewView('Untitled', schema))
  }

  const paneRows: FrameRow[] = rows.map((v) => ({ id: v.id, group: 'assigned' as const }))
  const nameFor = (id: string): string => rows.find((v) => v.id === id)?.name ?? ''
  const onDrop = (drop: PaneDrop): void => {
    if (drop.kind !== 'reorder-assigned' || views.length < 2) return
    const order = rows.map((v) => v.id).filter((id) => id !== drop.propId)
    order.splice(drop.toIndex, 0, drop.propId)
    void (async () => {
      const res = await host().ask('views:reorder', node.path, node.kind, order)
      if (!res.ok) return void host().ask('error:show', res.error.message)
    })()
  }

  const commitRename = (v: SavedView, next: string): void => {
    setRenamingId(null)
    void saveView({ ...v, name: next })
  }
  const rowMenu = async (v: SavedView, e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    menuAnchorRef.current = e.currentTarget as HTMLElement
    const action = await host().ask('view-row-menu', { deletable: views.length > 1 })
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
    if (!(await askDeleteView())) return
    const res = await host().ask('views:delete', node.path, node.kind, v.id)
    if (!res.ok) return void notifyError(res.error.message)
    notifyDeleted(v.name, () => restoreView(node.path, node.kind, v, views))
  }

  const list = (
    <MenuScrollFrame
      footer={
        <MenuFooting
          leading={
            <AccessoryButton
              icon="plus"
              size="control"
              box={20}
              create
              ariaLabel="New View"
              onClick={() => void createView()}
            />
          }
          trailing={
            <AccessoryButton
              icon="dots"
              size="control"
              box={20}
              ariaLabel="More"
              disabled
              onClick={() => {}}
            />
          }
        />
      }
    >
      <FrameDnd rows={paneRows} labelFor={nameFor} onDrop={onDrop} slot={viewSlot}>
        <DragRegion>
          <Menu>
            {rows.map((v) => (
              <RowShell key={v.id} id={v.id}>
                <MenuItem
                  className={activeId === v.id ? optionRing : undefined}
                  leading={<Icon name={iconNameOr(v.icon, 'table')} size="headline" />}
                  trailing={
                    <Button
                      paddingX="0"
                      icon="chevron-right"
                      iconSize="headline"
                      className={vd.chevronButton}
                      aria-label={`Edit ${v.name}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingId(v.id)
                      }}
                    />
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
      </FrameDnd>
    </MenuScrollFrame>
  )

  const detail = editing ? (
    <LayoutFrame
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
      <FrameSlide
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
        selected={labelColorFor(colorFor?.color)}
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
