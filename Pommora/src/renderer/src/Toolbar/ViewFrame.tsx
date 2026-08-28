import { type ReactNode, useRef, useState } from 'react'
import type { CollectionNode, SetNode } from '@shared/types'
import type { PropertyDefinition } from '@shared/properties'
import { mintDefaultView, mintNewView, type SavedView } from '@shared/views'
import { Button } from '@renderer/DesignSystem/Components/Controls/Button'
import { Icon, iconNameOr } from '@renderer/DesignSystem/Symbols'
import {
  Menu,
  MenuItem,
  MenuFooting,
  MenuScrollFrame,
  AccessoryButton,
} from '@renderer/DesignSystem/Menus'
import { titleInput } from '@renderer/DesignSystem/Menus/menu-base.css'
import { FrameSlide } from '@renderer/DesignSystem/Menus/frame-slide'
import { LayoutFrame } from '../Frames/LayoutFrame'
import { FrameDnd, RowShell, useFrameRegions } from '../Frames/frameDnd'
import type { PaneDrop, FrameRow, frameSlot } from '../Frames/frameDndModel'
import { useSaveView, useViewEmbedScope } from '@renderer/Embeds/ViewEmbedScope'
import { ColorPicker } from '@renderer/DesignSystem/Components/Pickers/ColorPicker/ColorPicker'
import { labelColorFor } from '@renderer/DesignSystem/Tokens/colorMap'
import { RenamableLabel } from '@renderer/DesignSystem/Components/Fields'
import { IconPicker } from '@renderer/Settings/IconPicker'
import { useSession } from '../store'
import { optionRing } from '@renderer/DesignSystem/Components/Pickers/PickerMenu/pickerMenu.css'
import * as vd from './toolbarMenu.css'

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
  const scope = useViewEmbedScope()
  // Never mounts inside a view embed until the payload switcher lands — CRUD here would bypass the scope.
  if (scope) return null
  const views = node.views ?? []
  const rows = views.length ? views : [mintDefaultView(schema)]
  const activeId = rows.some((v) => v.id === storedActive) ? storedActive : rows[0]?.id
  const editing = editingId ? rows.find((v) => v.id === editingId) : undefined

  const switchTo = (id: string): void => void setActiveView(node.id, id)
  const createView = async (): Promise<void> => {
    await window.nexus.views.save(node.path, node.kind, mintNewView('Untitled', schema))
  }

  const paneRows: FrameRow[] = rows.map((v) => ({ id: v.id, group: 'assigned' as const }))
  const nameFor = (id: string): string => rows.find((v) => v.id === id)?.name ?? ''
  const onDrop = (drop: PaneDrop): void => {
    if (drop.kind !== 'reorder-assigned' || views.length < 2) return
    const order = rows.map((v) => v.id).filter((id) => id !== drop.propId)
    order.splice(drop.toIndex, 0, drop.propId)
    void (async () => {
      const res = await window.nexus.views.reorder(node.path, node.kind, order)
      if (!res.ok) return void window.nexus.showError(res.error.message)
    })()
  }

  const commitRename = (v: SavedView, next: string): void => {
    setRenamingId(null)
    void saveView({ ...v, name: next })
  }
  const rowMenu = async (v: SavedView, e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    menuAnchorRef.current = e.currentTarget as HTMLElement
    const action = await window.nexus.viewRowMenu({ deletable: views.length > 1 })
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
