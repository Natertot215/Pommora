import { useState } from 'react'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import type { PropertyDefinition } from '../../Properties/properties'
import {
  canDeleteView,
  DEFAULT_VIEW_ID,
  mintNewView,
  pickView,
  type SavedView,
  type ViewWriter,
} from '../views'
import { notifyDeleted, reportRefusal } from '../../Interface/Notifications/notifications'
import { askDeleteView } from '../../Interface/Confirm/confirmations'
import { viewGlyph } from '../viewIcon'
import { Button } from '@pommora/uix/Buttons/Button'
import { Icon } from '@pommora/uix/Symbols'
import {
  Menu,
  MenuItem,
  MenuSeparator,
  MenuFooting,
  MenuScrollFrame,
  MenuTopRow,
  type MenuBack,
  AccessoryButton,
  FootingCreate,
  FooterIconButton,
  menuDropLine,
} from '@pommora/uix/Menus/MenuRows'
import { MenuIndex } from '@pommora/uix/Menus/MenuIndex'
import { InlineEditHeader } from '@pommora/uix/Menus/InlineEditHeader'
import { titleInput } from '@pommora/uix/Menus/menu-row.css'
import { FrameSlide } from '@pommora/uix/Menus/FrameSlide'
import { kindRows, kindSwitches, typeGrid } from './LayoutFrame'
import { chevronRows, type PaneProps, VIEW_PANES, ViewPane, type ViewPaneId } from './ViewPane'
import { VisibilityFrame } from './VisibilityFrame'
import { presentedKind } from '../Host/viewKinds'
import { LineRow, LineZone, lineList } from '@pommora/uix/Interactions/drag'
import { moveBefore } from '@pommora/uix/Utilities/moveItem'
import * as s from '@pommora/uix/Menus/frames.css'
import { useLiveView, useSaveView } from '../Host/liveView'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { useIconChoice } from '../../Assets/IdentityChoice'
import { ARCHIVE_ICON, ARCHIVE_TITLE } from '../../Archive/archiveLabel'
import { useSession } from '../../Session/store'
import * as vd from './view-frame.css'
import { dialer } from '../../Platform/dialer'
import { EDITOR_MENU, popMenu } from '../../Actions/menuActions'
import { runViewRowAction, viewItemMenuItems } from '../../Actions/viewMenus'
import type { NameRename } from '../../Interface/RenamableTitle'
import { selectTargetOf } from '../../Navigation/navRef'

async function deleteViewWithUndo(
  source: CollectionNode | SetNode,
  view: SavedView,
): Promise<boolean> {
  if (!(await askDeleteView())) return false
  const res = await dialer().ask('views:delete', source.path, source.kind, view.id)
  if (!reportRefusal(res)) return false
  notifyDeleted(view.name, async () => {
    reportRefusal(await dialer().ask('views:restore', source.path, source.kind, res.value))
  })
  return true
}

export function ViewListRow({
  view,
  picked,
  rename,
  onCommit,
  onSwitch,
  onMenu,
  trailing,
  tabIndex,
}: {
  view: SavedView
  picked: boolean
  rename: Omit<NameRename, 'path'>
  onCommit: (name: string) => void
  onSwitch: () => void
  onMenu: (e: React.MouseEvent<HTMLElement>) => void
  trailing?: React.ReactNode
  tabIndex?: number
}): React.JSX.Element {
  return (
    <MenuItem
      picked={picked ? 'solo' : undefined}
      leading={<Icon name={viewGlyph(view)} size="headline" />}
      trailing={trailing}
      tabIndex={tabIndex}
      onClick={rename.editing ? undefined : onSwitch}
      onContextMenu={onMenu}
    >
      <RenamableLabel
        renames="title"
        editing={rename.editing}
        value={view.name}
        className={titleInput}
        onBegin={rename.onBegin}
        onCommit={(next) => {
          rename.onEnd()
          onCommit(next)
        }}
        onCancel={rename.onEnd}
      />
    </MenuItem>
  )
}

const EDITOR_PANES = VIEW_PANES.filter((p) => p.id !== 'visibility')

function ViewEditor({
  source,
  view,
  schema,
  back,
  onMenu,
}: {
  source: CollectionNode | SetNode
  view: SavedView
  schema: PropertyDefinition[]
  back: MenuBack
  onMenu: (trigger: HTMLElement) => void
}): React.JSX.Element {
  const [pane, setPane] = useState<ViewPaneId | null>(null)
  const saveView = useSaveView(source)
  const save: ViewWriter = (patch) => saveView(view, patch)
  const iconChoice = useIconChoice(view.icon, (icon) => void save({ icon }))

  const root = (
    <MenuScrollFrame
      header={
        <MenuTopRow
          {...back}
          trailing={
            <AccessoryButton
              icon="ellipsis-vertical"
              size={s.ICON.editorMenu}
              ariaLabel="View Menu"
              onClick={(e) => onMenu(e.currentTarget)}
            />
          }
        />
      }
      footer={kindRows(view, save)}
      maxHeight={s.SETTINGS_PANE_MAX_HEIGHT}
    >
      <InlineEditHeader
        value={view.name}
        icon={viewGlyph(view)}
        onCommit={(name) => {
          if (name && name !== view.name) void save({ name })
        }}
        {...iconChoice}
      />
      <MenuSeparator flush />
      {typeGrid(view, save)}
      <MenuIndex sections={[{ rows: chevronRows(EDITOR_PANES, setPane) }]} />
    </MenuScrollFrame>
  )

  const toViews: MenuBack = { label: 'Views', onBack: () => setPane(null) }
  const leaf: PaneProps = { view, schema, back: toViews, save }
  const detail =
    pane !== 'layout' ? (
      pane && <ViewPane id={pane} source={source} {...leaf} />
    ) : presentedKind(view.type).layout.leaf === 'visibility' ? (
      <VisibilityFrame
        {...leaf}
        current="Layout"
        footer={
          <>
            <MenuSeparator flush />
            {kindSwitches(view, save)}
          </>
        }
      />
    ) : (
      <MenuScrollFrame
        header={<MenuTopRow {...toViews} current="Layout" />}
        maxHeight={s.SETTINGS_PANE_MAX_HEIGHT}
      >
        {kindSwitches(view, save)}
      </MenuScrollFrame>
    )

  return <FrameSlide {...s.SETTINGS_PANE_FLOOR} open={pane !== null} root={root} detail={detail} />
}

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
  const select = useSession((s) => s.select)
  const inArchive = useSession((s) => s.selection.kind === 'archive')
  const saveView = useSaveView(node)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const views = node.views ?? []
  const active = pickView(node)
  const rows = views.length ? views : [active]
  const editing = editingId
    ? (rows.find((v) => v.id === editingId) ??
      (editingId === DEFAULT_VIEW_ID ? views[0] : undefined))
    : undefined
  const editingLive = useLiveView(node.id, editing ?? active)

  // In place: under New Tab, `select`'s default would open a tab per press.
  const showArchive = (shown: boolean): void =>
    void select(shown ? { kind: 'archive', id: node.id } : selectTargetOf(node), { newTab: false })
  const switchTo = (id: string): void => {
    if (inArchive) showArchive(false)
    if (id === active.id) return
    void mutate({ op: 'setActiveView', path: node.path, kind: node.kind, viewId: id })
  }
  const createView = async (): Promise<void> => {
    reportRefusal(
      await dialer().ask('views:save', node.path, node.kind, mintNewView('Untitled'), {}),
    )
  }

  const viewOf = (id: string): SavedView | undefined => rows.find((v) => v.id === id)

  const itemContext = { deletable: canDeleteView(views.length), duplicable: views.length > 0 }
  const duplicate = (v: SavedView): void =>
    void dialer().ask('views:duplicate', node.path, node.kind, v.id).then(reportRefusal)
  const editorMenu = async (v: SavedView, trigger: HTMLElement): Promise<void> => {
    const action = await popMenu(viewItemMenuItems(itemContext), trigger, EDITOR_MENU)
    if (action === 'duplicate') duplicate(v)
    else if (action === 'delete' && (await deleteViewWithUndo(node, v))) onClose()
  }
  const rowMenu = (v: SavedView, e: React.MouseEvent<HTMLElement>): void => {
    e.preventDefault()
    void runViewRowAction(itemContext, v, e.currentTarget, {
      rename: () => setRenamingId(v.id),
      save: (patch) => void saveView(v, patch),
      duplicate: () => duplicate(v),
      remove: () => void deleteViewWithUndo(node, v),
    })
  }

  const list = (
    <MenuScrollFrame
      footer={
        <MenuFooting
          leading={<FootingCreate ariaLabel="New View" onClick={() => void createView()} />}
          trailing={
            // PLACEHOLDER
            <FooterIconButton
              icon="ellipsis"
              ariaLabel="More actions"
              onClick={() => {}}
              disabled
            />
          }
        />
      }
    >
      <LineZone
        className={s.frameZone}
        {...lineList({
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
          line: menuDropLine,
          label: (id) => viewOf(id)?.name ?? '',
          glyph: (id) => {
            const v = viewOf(id)
            return v && <Icon name={viewGlyph(v)} />
          },
          watch: [views],
        })}
      >
        <Menu>
          {rows.map((v) => {
            const renaming = renamingId === v.id
            return (
              <LineRow key={v.id} id={v.id} open={renaming ? undefined : () => switchTo(v.id)}>
                <ViewListRow
                  view={v}
                  picked={!inArchive && active.id === v.id}
                  rename={{
                    editing: renaming,
                    onBegin: () => setRenamingId(v.id),
                    onEnd: () => setRenamingId(null),
                  }}
                  onCommit={(name) => void saveView(v, { name })}
                  onSwitch={() => switchTo(v.id)}
                  onMenu={(e) => rowMenu(v, e)}
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
                />
              </LineRow>
            )
          })}
          <MenuSeparator className={vd.archiveDivider} />
          <MenuItem
            className={vd.archiveRow}
            picked={inArchive ? 'solo' : undefined}
            leading={<Icon name={ARCHIVE_ICON} size="headline" className={vd.archiveGlyph} />}
            trailing={<Icon name="locked" size="headline" className={vd.archiveGlyph} />}
            onClick={() => showArchive(true)}
          >
            {ARCHIVE_TITLE}
          </MenuItem>
        </Menu>
      </LineZone>
    </MenuScrollFrame>
  )

  const detail = editing ? (
    <ViewEditor
      source={node}
      view={editingLive}
      schema={schema}
      back={{ label: 'Views', onBack: () => setEditingId(null) }}
      onMenu={(trigger) => void editorMenu(editingLive, trigger)}
    />
  ) : null

  return <FrameSlide {...s.SETTINGS_PANE_FLOOR} open={!!editing} root={list} detail={detail} />
}
