import {
  notifyReport,
  notifyRetry,
  reportRefusal,
} from '../../Interface/Notifications/notifications'
import { useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from '@pommora/uix/Symbols'
import type { IconSize } from '@pommora/uix/Theme'
import { useSession } from '../../Session/store'
import { trashChanged } from '../../Session/nexusSlice'
import {
  DEFAULT_LINK_DISPLAY,
  isReservedPropertyId,
  optionGroupsOf,
  type PropertyDefinition,
  PROPERTY_TYPES,
  type PropertyType,
} from '../properties'
import type { Result } from '../../Contract/result'
import type { SchemaCascade, SchemaJournal } from '../propertyJournal'
import type { ColumnStyle } from '../columnStyles'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import { useActiveView } from '../../Views/Host/useActiveView'
import { useSaveView } from '../../Views/viewWrite'
import { pickedStyle, useNexusForms, useStyleFor } from '../../Views/Host/useColumnStyles'
import { DateTimeEditor } from './DateTimeEditor'
import { CheckboxEditor } from './CheckboxEditor'
import { FileEditor } from './FileEditor'
import { NumberEditor } from './NumberEditor'
import {
  MenuItem,
  MenuCaption,
  MenuTopRow,
  MenuScrollFrame,
  MenuFooting,
  FootingItem,
  MenuSeparator,
  AccessoryButton,
  DropOutline,
} from '@pommora/uix/Menus'
import { titleInput, actionRow } from '@pommora/uix/Menus/menu-row.css'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import { IconChoice } from '../../Assets/IconChoice'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { InlineEditHeader } from '@pommora/uix/Menus/InlineEditHeader'
import { OptionEditor } from './OptionEditor'
import { OPTION_STYLE_OPTIONS, type OptionStyle } from './OptionRow'
import { PickerControl } from '@pommora/uix/Pickers/PickerControl'
import { LinkEditor } from './LinkEditor'
import { FrameSlide } from '@pommora/uix/Menus/FrameSlide'
import { PANE_MIN_H, PANE_MIN_W } from '@pommora/uix/Menus/frame-slide.css'
import { LineGroup, LineRow, LineZone } from '@pommora/uix/Interactions/drag'
import { nexusReorderIndex, PaneAllGroup, type PaneDrop, paneSpec } from '../paneDrop'
import {
  CREATABLE_TYPES,
  PropertyTypeIcon,
  propertyIcon,
  propertyTypeLabel,
} from '../Cells/PropertyTypes'
import { cx } from '@pommora/uix/Utilities/cx'
import * as s from '@pommora/uix/Menus/frames.css'
import { askDestroyProperty, notifyTrashed } from '../../Interface/Confirm/confirmations'
import { dialer } from '../../Platform/dialer'
import { popMenu } from '../../Actions/menuActions'
import { propertyMenuModel } from '../../Actions/propertyMenu'

type SubView = { kind: 'list' } | { kind: 'type' } | { kind: 'edit'; id: string }
type WriteResult = Result<null>

const TITLES = { assigned: 'Properties', all: 'All Properties' }

/** Lives outside PropertyFrame so rows never remount on its re-renders. */
function ListGroups({
  assigned,
  unassigned,
  allOpen,
  renamingId,
  onToggleAll,
  onOpenEditor,
  onAssign,
  onRowMenu,
  onRenameCommit,
  onRenameCancel,
}: {
  assigned: PropertyDefinition[]
  unassigned: PropertyDefinition[]
  allOpen: boolean
  renamingId: string | null
  onToggleAll: () => void
  onOpenEditor: (id: string) => void
  onAssign: (id: string) => void
  onRowMenu: (d: PropertyDefinition, group: 'assigned' | 'all') => void
  onRenameCommit: (id: string, next: string) => void
  onRenameCancel: () => void
}): React.JSX.Element {
  const enteringAssigned = useEntrance(assigned, (d) => d.id)
  const enteringAll = useEntrance(unassigned, (d) => d.id)
  const title = (d: PropertyDefinition): ReactNode => (
    <RenamableLabel
      renames="row"
      editing={renamingId === d.id}
      value={d.name}
      className={cx(titleInput, 'row-title-input')}
      onCommit={(next) => onRenameCommit(d.id, next)}
      onCancel={onRenameCancel}
    />
  )
  return (
    <>
      <LineGroup id="assigned" className={cx(s.assignedFill, allOpen && s.assignedFillNone)}>
        {assigned.length === 0 ? (
          <MenuCaption>No properties yet.</MenuCaption>
        ) : (
          assigned.map((d) => {
            const open = (): void => onOpenEditor(d.id)
            return (
              <Reveal key={d.id} open enterOnMount={enteringAssigned(d.id)} fill>
                <LineRow id={d.id} open={open}>
                  <MenuItem
                    leading={<Icon name={propertyIcon(d)} size={s.ICON.doc} />}
                    detail={propertyTypeLabel(d.type)}
                    trailing={<Icon name="chevron-right" />}
                    tabIndex={-1}
                    onClick={open}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      onRowMenu(d, 'assigned')
                    }}
                  >
                    {title(d)}
                  </MenuItem>
                </LineRow>
              </Reveal>
            )
          })
        )}
      </LineGroup>
      <PaneAllGroup>
        <button type="button" className={cx(actionRow, s.allHeading)} onClick={onToggleAll}>
          <DropOutline open={allOpen} />
          <span>{TITLES.all}</span>
        </button>
        <Reveal open={allOpen} duration="base">
          <div>
            {unassigned.map((d) => (
              <Reveal key={d.id} open enterOnMount={enteringAll(d.id)} fill>
                <LineRow id={d.id}>
                  <MenuItem
                    className={s.allRow}
                    leading={<Icon name={propertyIcon(d)} size={s.ICON.doc} />}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      onRowMenu(d, 'all')
                    }}
                    trailing={
                      <AccessoryButton
                        icon="plus"
                        size={s.ICON.rowPlus}
                        ariaLabel={`Assign ${d.name}`}
                        create
                        onClick={() => onAssign(d.id)}
                      />
                    }
                  >
                    {title(d)}
                  </MenuItem>
                </LineRow>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </PaneAllGroup>
    </>
  )
}

const replay = (record: SchemaJournal) => (): void =>
  void dialer()
    .ask('property:replay', record)
    .then((r) => {
      if (!r.ok) notifyRetry(r.error.message, replay(record))
    })

const retryOwed = ({ cascade, owed }: SchemaCascade): void => {
  if (!cascade.warning) return
  if (owed) notifyRetry(cascade.warning, replay(owed))
  else notifyReport(cascade.warning, true)
}

async function warnOwed(res: Promise<Result<SchemaCascade>>): Promise<void> {
  const r = await res
  if (reportRefusal(r)) retryOwed(r.value)
}

export function PropertyFrame({
  collectionPath,
  schema,
  onBack,
  source,
}: {
  collectionPath: string
  schema: PropertyDefinition[]
  onBack: () => void
  source: CollectionNode | SetNode
}): React.JSX.Element {
  const styleFor = useStyleFor()
  const nexus = useNexusForms()
  const saveView = useSaveView(source)
  const activeView = useActiveView(source, schema)
  const registry = useSession((st) => st.tree?.config.registry) ?? []
  const bumpValuesEpoch = useSession((st) => st.bumpValuesEpoch)
  const renamingProperty = useSession((st) => st.renamingProperty)
  const beginPropertyRename = useSession((st) => st.beginPropertyRename)
  const cancelPropertyRename = useSession((st) => st.cancelPropertyRename)
  const [view, setView] = useState<SubView>({ kind: 'list' })
  const [iconOpen, setIconOpen] = useState(false)
  const iconRef = useRef<HTMLButtonElement>(null)
  const [allOpen, setAllOpen] = useState(false)

  const props = schema.filter((d) => !isReservedPropertyId(d.id))
  const assignedIds = new Set(schema.map((d) => d.id))
  const unassigned = registry.filter((d) => !assignedIds.has(d.id) && !isReservedPropertyId(d.id))
  const backToList = (): void => setView({ kind: 'list' })

  const backHeader = (label: string, onClick: () => void): React.JSX.Element => (
    <MenuTopRow label={label} onBack={onClick} />
  )
  const actionHeader = (
    label: string,
    onBackClick: () => void,
    action: {
      icon: IconName
      size: IconSize
      ariaLabel: string
      onClick: () => void
    },
  ): React.JSX.Element => (
    <MenuTopRow
      label={label}
      onBack={onBackClick}
      trailing={
        <AccessoryButton
          icon={action.icon}
          size={action.size}
          ariaLabel={action.ariaLabel}
          onClick={action.onClick}
        />
      }
    />
  )

  const create = async (type: PropertyType): Promise<void> => {
    const res = await dialer().ask('schema:add', collectionPath, {
      id: '',
      name: `New ${propertyTypeLabel(type)}`,
      type,
    })
    if (reportRefusal(res)) setView({ kind: 'edit', id: res.value.id })
  }
  const rename = async (id: string, name: string): Promise<void> => {
    const res = await dialer().ask('property:rename', id, name)
    if (!reportRefusal(res) || !res.value) return
    bumpValuesEpoch(res.value.from, res.value.to)
    retryOwed(res.value)
  }
  const remove = async (id: string): Promise<void> => {
    if (reportRefusal(await dialer().ask('schema:unassign', collectionPath, id))) backToList()
  }
  // Every property write is the same round trip; only the channel and its arguments differ.
  const write = async (res: Promise<WriteResult>): Promise<void> => {
    reportRefusal(await res)
  }
  const saveFileDirectory = (id: string, dir: string): Promise<void> =>
    write(dialer().ask('property:setFileDirectory', id, { file_directory: dir }))
  const saveColumnStyle = async (propId: string, patch: Partial<ColumnStyle>): Promise<void> => {
    const picks = Object.entries(patch).map(([key, value]) => [
      key,
      pickedStyle(propId, schema, nexus, key as keyof ColumnStyle, String(value)),
    ])
    const next = { ...activeView.column_styles?.[propId], ...Object.fromEntries(picks) }
    await saveView(activeView, { column_styles: { [propId]: next } })
  }
  const handleDrop = (drop: PaneDrop): Promise<void> =>
    write(
      drop.kind === 'reorder-assigned'
        ? dialer().ask('schema:reorder', collectionPath, drop.propId, drop.toIndex)
        : drop.kind === 'reorder-nexus'
          ? dialer().ask(
              'registry:reorder',
              drop.propId,
              nexusReorderIndex(
                registry.map((d) => d.id),
                unassigned.map((d) => d.id),
                drop.propId,
                drop.toIndex,
              ),
            )
          : drop.kind === 'assign'
            ? dialer().ask('schema:assign', collectionPath, drop.propId, drop.toIndex)
            : dialer().ask('schema:unassign', collectionPath, drop.propId),
    )

  const defOf = (id: string): PropertyDefinition | undefined =>
    props.find((d) => d.id === id) ?? unassigned.find((d) => d.id === id)
  const nameFor = (id: string): string => defOf(id)?.name ?? ''
  const glyphFor = (id: string): ReactNode => {
    const d = defOf(id)
    return d && <Icon name={propertyIcon(d)} />
  }

  const editorMenu = async (def: PropertyDefinition): Promise<void> => {
    const action = await popMenu(propertyMenuModel({ kind: 'editor', name: def.name }))
    if (action === 'property:remove') await remove(def.id)
    else if (action === 'property:destroy' && (await askDestroyProperty(def.name))) {
      const deleted = await dialer().ask('property:delete', def.id)
      if (!reportRefusal(deleted)) return
      trashChanged.emit()
      backToList()
      notifyTrashed(def.name, deleted.value, deleted.value.owed && replay(deleted.value.owed))
    }
  }
  const rowMenu = async (d: PropertyDefinition, group: 'assigned' | 'all'): Promise<void> => {
    const action = await popMenu(
      propertyMenuModel({
        kind: group === 'assigned' ? 'assigned-row' : 'registry-row',
        name: d.name,
      }),
    )
    if (action === 'property:rename') beginPropertyRename({ collectionPath, propertyId: d.id })
    else if (action === 'property:remove')
      reportRefusal(await dialer().ask('schema:unassign', collectionPath, d.id))
  }

  const typePicker = (
    <>
      {backHeader('Properties', backToList)}
      {CREATABLE_TYPES.map((type) => (
        <MenuItem
          key={type}
          leading={<PropertyTypeIcon type={type} size={s.ICON.doc} />}
          trailing={<Icon name="chevron-right" />}
          onClick={() => void create(type)}
        >
          {propertyTypeLabel(type)}
        </MenuItem>
      ))}
    </>
  )

  const NO_SETTINGS = (): React.JSX.Element => <div style={{ minHeight: 8 }} />
  const optionSettings = (
    def: PropertyDefinition,
    _style: ColumnStyle,
    look: OptionStyle,
  ): React.JSX.Element => (
    <OptionEditor
      type={def.type}
      groups={optionGroupsOf(def)}
      look={look}
      onEdit={(edit) => void write(dialer().ask('property:editOption', def.id, edit))}
      onRenameOption={(oldValue, newTitle) =>
        void warnOwed(dialer().ask('property:renameOption', def.id, oldValue, newTitle))
      }
      onRemoveOption={(value) =>
        void warnOwed(dialer().ask('property:removeOption', def.id, value))
      }
      onClearOption={(value) => void write(dialer().ask('property:clearOption', def.id, value))}
    />
  )

  // One arm per property type, so a type added to the schema is a compile error here rather than a blank panel at runtime.
  const SETTINGS: Record<
    PropertyType,
    (def: PropertyDefinition, style: ColumnStyle, look: OptionStyle) => React.JSX.Element
  > = {
    select: optionSettings,
    multiSelect: optionSettings,
    status: optionSettings,
    link: (def) => (
      <LinkEditor
        underline={def.link_underline ?? false}
        display={def.link_display ?? DEFAULT_LINK_DISPLAY}
        color={def.link_color}
        onSetConfig={(patch) => void write(dialer().ask('property:setLinkConfig', def.id, patch))}
      />
    ),
    dateTime: (def, style) => (
      <DateTimeEditor style={style} onChange={(patch) => void saveColumnStyle(def.id, patch)} />
    ),
    checkbox: (def, style) => (
      <CheckboxEditor
        color={def.checkbox_color}
        look={style.look === 'switch' ? 'switch' : 'checkbox'}
        onSetColor={(next) => void write(dialer().ask('property:setCheckboxColor', def.id, next))}
        onSetStyle={(look) => void saveColumnStyle(def.id, { look })}
      />
    ),
    number: (def, style) => (
      <NumberEditor
        config={def}
        look={style.look === 'bar' ? 'bar' : 'number'}
        onSetConfig={(patch) => void write(dialer().ask('property:setNumberFormat', def.id, patch))}
        onSetStyle={(look) => void saveColumnStyle(def.id, { look })}
      />
    ),
    file: (def) => (
      <FileEditor
        directory={def.file_directory}
        onSetDirectory={(dir) => void saveFileDirectory(def.id, dir)}
        onBrowse={() => {
          void dialer()
            .ask('assets:chooseDir', 'property', def.file_directory)
            .then((picked) => {
              if (reportRefusal(picked) && picked.value !== null)
                void saveFileDirectory(def.id, picked.value)
            })
        }}
      />
    ),
    // A registry Context and the two stamps carry no settings of their own.
    context: NO_SETTINGS,
    createdTime: NO_SETTINGS,
    lastEditedTime: NO_SETTINGS,
  }

  const editor = (id: string): React.JSX.Element => {
    const def = props.find((d) => d.id === id)
    if (!def) {
      return (
        <>
          {backHeader('Properties', backToList)}
          <MenuCaption>Property not found.</MenuCaption>
        </>
      )
    }
    const columnStyle = styleFor(def.id, schema, activeView)
    const optionLook: OptionStyle = columnStyle.look === 'compact' ? 'compact' : 'standard'
    const styleFooting =
      PROPERTY_TYPES[def.type].options !== undefined ? (
        <MenuFooting>
          <FootingItem
            icon="palette"
            label="Style"
            trailing={
              <PickerControl
                ariaLabel="Chip style"
                solid
                value={optionLook}
                options={OPTION_STYLE_OPTIONS}
                onPick={(look) => void saveColumnStyle(def.id, { look })}
              />
            }
          />
        </MenuFooting>
      ) : undefined
    return (
      <MenuScrollFrame
        header={actionHeader('Properties', backToList, {
          icon: 'ellipsis-vertical',
          size: s.ICON.editorMenu,
          ariaLabel: 'Property Menu',
          onClick: () => void editorMenu(def),
        })}
        footer={styleFooting}
      >
        <InlineEditHeader
          value={def.name}
          icon={propertyIcon(def)}
          iconRef={iconRef}
          iconOpen={iconOpen}
          onIconClick={() => setIconOpen(true)}
          onCommit={(next) => void rename(def.id, next)}
        />
        <MenuSeparator flush />
        {SETTINGS[def.type](def, columnStyle, optionLook)}
      </MenuScrollFrame>
    )
  }

  const list = (
    <MenuScrollFrame
      header={<MenuTopRow label="Settings" current="Properties" onBack={onBack} />}
      footer={
        <MenuFooting
          leading={
            <AccessoryButton
              icon="plus"
              size="control"
              box={20}
              create
              ariaLabel="New Property"
              onClick={() => setView({ kind: 'type' })}
            />
          }
        />
      }
    >
      <LineZone
        className={s.frameZone}
        {...paneSpec({
          assigned: props.map((d) => d.id),
          ordersAll: true,
          titles: TITLES,
          label: nameFor,
          glyph: glyphFor,
          onDrop: (drop) => void handleDrop(drop),
          watch: [schema, registry],
        })}
      >
        <ListGroups
          assigned={props}
          unassigned={unassigned}
          allOpen={allOpen}
          renamingId={
            renamingProperty?.collectionPath === collectionPath ? renamingProperty.propertyId : null
          }
          onToggleAll={() => setAllOpen((o) => !o)}
          onOpenEditor={(id) => setView({ kind: 'edit', id })}
          onAssign={(id) => void write(dialer().ask('schema:assign', collectionPath, id))}
          onRowMenu={(d, group) => void rowMenu(d, group)}
          onRenameCommit={(id, next) => {
            cancelPropertyRename()
            void rename(id, next)
          }}
          onRenameCancel={cancelPropertyRename}
        />
      </LineZone>
    </MenuScrollFrame>
  )

  const editingId = view.kind === 'edit' ? view.id : undefined
  const editingIcon = editingId ? registry.find((d) => d.id === editingId)?.icon : undefined

  return (
    <>
      <FrameSlide
        open={view.kind !== 'list'}
        root={list}
        detail={view.kind === 'list' ? null : view.kind === 'type' ? typePicker : editor(view.id)}
        minWidth={PANE_MIN_W}
        minHeight={PANE_MIN_H}
      />
      <IconChoice
        open={iconOpen}
        onClose={() => setIconOpen(false)}
        triggerRef={iconRef}
        value={editingIcon}
        onSelect={(icon) => {
          if (editingId) void write(dialer().ask('property:setIcon', editingId, icon))
        }}
      />
    </>
  )
}
