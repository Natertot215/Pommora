import { useRef, useState } from 'react'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { DEFAULT_VIEW_ID, mintNewView, type SavedView } from '@pommora/core/Views/views'
import { reportRefusal } from '../../Interface/Notifications/notifications'
import { deleteViewWithUndo } from '../deleteViewWithUndo'
import { viewGlyph } from '../viewIcon'
import { Button } from '@pommora/uix/Buttons/Button'
import { Icon } from '@pommora/uix/Symbols'
import {
  Menu,
  MenuItem,
  MenuFooting,
  MenuScrollFrame,
  AccessoryButton,
  laneSpec,
} from '@pommora/uix/Menus'
import { titleInput } from '@pommora/uix/Menus/menu-row.css'
import { FrameSlide } from '@pommora/uix/Menus/FrameSlide'
import { LayoutFrame } from './LayoutFrame'
import { LineRow, LineZone } from '@pommora/uix/Interactions/drag'
import { moveBefore } from '@pommora/uix/Utilities/moveItem'
import * as s from '@pommora/uix/Menus/frames.css'
import { useSaveView } from '../viewWrite'
import { pickView } from '../Pipeline/pickView'
import { useLiveView } from '../Host/pendingView'
import { ColorPicker } from '@pommora/uix/Pickers/ColorPicker'
import { colorNameFor } from '@pommora/uix/Theme/ramp'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { IconChoice } from '../../Assets/IconChoice'
import { useSession } from '../../Session/store'
import { optionRing } from '@pommora/uix/Pickers/picker-base.css'
import * as vd from '../../Interface/Toolbar/toolbar-menu.css'
import { dialer } from '../../Platform/dialer'
import { popMenu } from '../../Actions/menuActions'
import { viewRowMenuItems } from '@pommora/core/Actions/viewRowMenu'

const PANE_SQUARE = 225

export function ViewFrame({
  node,
  schema,
  onClose,
}: {
  node: CollectionNode | SetNode
  schema: PropertyDefinition[]
  onClose: () => void
}): React.JSX.Element {
  const mutate = useSession((s) => s.mutate)
  const saveView = useSaveView(node)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [iconFor, setIconFor] = useState<SavedView | null>(null)
  const [colorFor, setColorFor] = useState<SavedView | null>(null)
  const menuAnchorRef = useRef<HTMLElement | null>(null)
  const views = node.views ?? []
  const active = pickView(node, schema)
  const rows = views.length ? views : [active]
  const editing = editingId
    ? (rows.find((v) => v.id === editingId) ??
      (editingId === DEFAULT_VIEW_ID ? views[0] : undefined))
    : undefined
  const editingLive = useLiveView(node.id, editing ?? active)

  // The placeholder row a viewless container shows carries the sentinel id, which must never reach a legible sidecar.
  const switchTo = (id: string): void => {
    if (id === DEFAULT_VIEW_ID) return
    void mutate({ op: 'setActiveView', path: node.path, kind: node.kind, viewId: id })
  }
  const createView = async (): Promise<void> => {
    reportRefusal(
      await dialer().ask('views:save', node.path, node.kind, mintNewView('Untitled', schema), {}),
    )
  }

  const viewOf = (id: string): SavedView | undefined => rows.find((v) => v.id === id)

  const commitRename = (v: SavedView, next: string): void => {
    setRenamingId(null)
    void saveView(v, { name: next })
  }
  const rowMenu = async (v: SavedView, e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    menuAnchorRef.current = e.currentTarget as HTMLElement
    const action = await popMenu(
      viewRowMenuItems({ deletable: views.length > 1, duplicable: views.length > 0 }),
    )
    switch (action) {
      case 'rename':
        return setRenamingId(v.id)
      case 'icon':
        return setIconFor(v)
      case 'color':
        return setColorFor(v)
      case 'duplicate':
        return void dialer().ask('views:duplicate', node.path, node.kind, v.id).then(reportRefusal)
      case 'delete':
        return void deleteViewWithUndo(node, v)
      default:
        return
    }
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
            // PLACEHOLDER
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
      <LineZone
        className={s.frameDnd}
        {...laneSpec({
          locked: views.length < 2,
          commit: (id, slot) => {
            const order = moveBefore(
              views.map((v) => v.id),
              (v) => v,
              id,
              slot.before,
            )
            if (order)
              void dialer().ask('views:reorder', node.path, node.kind, order).then(reportRefusal)
          },
          label: (id) => viewOf(id)?.name ?? '',
          chip: (id) => {
            const v = viewOf(id)
            return (
              v && (
                <>
                  <Icon name={viewGlyph(v)} size="body" />
                  {v.name}
                </>
              )
            )
          },
          watch: [views],
        })}
      >
        <Menu>
          {rows.map((v) => (
            <LineRow
              key={v.id}
              id={v.id}
              open={renamingId === v.id ? undefined : () => switchTo(v.id)}
            >
              <MenuItem
                className={active.id === v.id ? optionRing : undefined}
                leading={<Icon name={viewGlyph(v)} size="headline" />}
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
                tabIndex={-1}
                onClick={renamingId === v.id ? undefined : () => switchTo(v.id)}
                onContextMenu={(e) => void rowMenu(v, e)}
              >
                <RenamableLabel
                  renames="title"
                  editing={renamingId === v.id}
                  value={v.name}
                  className={titleInput}
                  onBegin={() => setRenamingId(v.id)}
                  onCommit={(next) => commitRename(v, next)}
                  onCancel={() => setRenamingId(null)}
                />
              </MenuItem>
            </LineRow>
          ))}
        </Menu>
      </LineZone>
    </MenuScrollFrame>
  )

  const detail = editing ? (
    <LayoutFrame
      source={node}
      view={editingLive}
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
      <IconChoice
        open={!!iconFor}
        onClose={() => setIconFor(null)}
        value={iconFor?.icon}
        onSelect={(icon) => {
          if (iconFor) void saveView(iconFor, { icon })
        }}
      />
      <ColorPicker
        open={colorFor !== null}
        selected={colorNameFor(colorFor?.color)}
        onPick={(picked) => {
          if (colorFor) void saveView(colorFor, { color: picked })
          setColorFor(null)
        }}
        onDismiss={() => setColorFor(null)}
        triggerRef={menuAnchorRef}
      />
    </>
  )
}
