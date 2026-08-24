import { useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from '@renderer/DesignSystem/Symbols'
import { useSession } from '../../store'
import {
  DEFAULT_LINK_DISPLAY,
  hasSelectOptions,
  isReservedPropertyId,
  type LinkConfig,
  type NumberConfig,
  type PropertyDefinition,
  type PropertyType,
  type StatusGroup,
} from '@shared/properties'
import type { Option } from '@shared/optionModel'
import type { Result } from '@shared/result'
import type { ColumnStyle } from '@shared/columnStyles'
import type { CollectionNode, SetNode } from '@shared/types'
import { useActiveView } from '../../Detail/Views/useActiveView'
import { useSaveView } from '@renderer/Embeds/ViewEmbedScope'
import { useStyleFor } from '../../Detail/Views/Table/columnStyles'
import { DateTimeEditor } from './DateTimeEditor'
import { CheckboxEditor } from './CheckboxEditor'
import { FileEditor } from './FileEditor'
import { NumberEditor } from './NumberEditor'
import {
  MenuItem,
  MenuCaption,
  MenuPaneTopRow,
  MenuScrollFrame,
  MenuBottomRow,
  MenuSeparator,
  AccessoryButton,
} from '@renderer/DesignSystem/Components/Menu'
import { flushTrailing, titleInput } from '@renderer/DesignSystem/Components/Menu/menu.css'
import { Reveal } from '@renderer/DesignSystem/Animation/Reveal'
import { duration } from '@renderer/DesignSystem/Animation'
import { IconPicker } from '../IconPicker'
import { RenamableLabel } from '@renderer/DesignSystem/Components/Fields'
import { InlineEditHeader } from './InlineEditHeader'
import { OptionEditor } from './OptionEditor'
import { StatusEditor } from './StatusEditor'
import { URLEditor } from './URLEditor'
import { PaneSlider } from '@renderer/DesignSystem/Components/PaneSlider/PaneSlider'
import { PaneDnd, RowShell, usePaneRegions } from './paneDnd'
import { nexusReorderIndex, type PaneDrop, type PaneRow } from './paneDndModel'
import { CREATABLE_TYPES, PropertyTypeIcon, propertyTypeLabel } from './PropertyTypes'
import { cx } from '@renderer/DesignSystem/Util/cx'
import * as s from './settingsPane.css'
import {
  dropOutline,
  dropOutlineOpen,
} from '@renderer/DesignSystem/Elements/DropOutline/dropOutline.css'
import { normalizePropertyName, wrapKey } from '@shared/governedKeys'

type DetailView = { kind: 'type' } | { kind: 'edit'; id: string }
type SubView = { kind: 'list' } | DetailView
type WriteResult = Result<null>

/** Lives outside PropertiesPane so rows never remount on its re-renders. */
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
  onRenameCommit: (next: string) => void
  onRenameCancel: () => void
}): React.JSX.Element {
  const { assignedRef, allRef, allHighlighted } = usePaneRegions()
  // The row title swaps to the inline rename input over the property-keyed channel
  // (properties are registry ids, not paths).
  const title = (d: PropertyDefinition): ReactNode => (
    <RenamableLabel
      renames="row"
      editing={renamingId === d.id}
      value={d.name}
      className={cx(titleInput, 'row-title-input')}
      onCommit={onRenameCommit}
      onCancel={onRenameCancel}
    />
  )
  return (
    <>
      <div data-group="assigned" ref={assignedRef}>
        {assigned.length === 0 ? (
          <MenuCaption>No properties yet.</MenuCaption>
        ) : (
          assigned.map((d) => (
            <RowShell key={d.id} id={d.id}>
              <MenuItem
                className={flushTrailing}
                leading={<PropertyTypeIcon type={d.type} size={s.ICON.doc} />}
                detail={propertyTypeLabel(d.type)}
                trailing={<Icon name="chevron-right" />}
                onClick={() => onOpenEditor(d.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  onRowMenu(d, 'assigned')
                }}
              >
                {title(d)}
              </MenuItem>
            </RowShell>
          ))
        )}
      </div>
      {/* Closed, the elastic spacer holds the block at the pane's bottom; opening collapses it on
          the same beat as the Reveal, so the heading RISES to meet the assigned rows. */}
      <div className={cx(s.allSpacer, allOpen && s.allSpacerCollapsed)} aria-hidden />
      <div data-group="all" ref={allRef} className={cx(allHighlighted && s.allHighlight)}>
        <button type="button" className={s.allHeadingRow} onClick={onToggleAll}>
          <Icon
            name="chevron-right"
            size={s.ICON.dropOutline}
            className={cx(dropOutline, allOpen && dropOutlineOpen)}
            data-drop-outline
          />
          <span className={s.allPropertiesLabel}>All Properties</span>
        </button>
        <Reveal open={allOpen} duration={duration.base}>
          <div>
            {unassigned.map((d) => (
              <RowShell key={d.id} id={d.id}>
                <MenuItem
                  className={cx(s.allRow, flushTrailing)}
                  leading={<PropertyTypeIcon type={d.type} size={s.ICON.doc} />}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    onRowMenu(d, 'all')
                  }}
                  trailing={
                    <button
                      type="button"
                      className={s.rowPlus}
                      data-create
                      aria-label={`Assign ${d.name}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onAssign(d.id)
                      }}
                    >
                      <Icon name="plus" size={s.ICON.rowPlus} />
                    </button>
                  }
                >
                  {title(d)}
                </MenuItem>
              </RowShell>
            ))}
          </div>
        </Reveal>
      </div>
    </>
  )
}

/**
 * A list of user-defined properties → a type picker for new ones → a per-property editor, riding
 * an inner PaneSlider nested in the ViewPane's outer one. Writes route to the `schema:*` IPC; the
 * tree refresh after each write re-flows the live schema back in as `schema`, so the editor
 * re-reads the property by id.
 */
export function PropertiesPane({
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
  const saveView = useSaveView(source)
  const { view: activeView } = useActiveView(source, schema)
  const registry = useSession((st) => st.tree?.registry) ?? []
  const bumpValuesEpoch = useSession((st) => st.bumpValuesEpoch)
  const renamingProperty = useSession((st) => st.renamingProperty)
  const beginPropertyRename = useSession((st) => st.beginPropertyRename)
  const cancelPropertyRename = useSession((st) => st.cancelPropertyRename)
  const submitPropertyRename = useSession((st) => st.submitPropertyRename)
  const [view, setView] = useState<SubView>({ kind: 'list' })
  const [iconOpen, setIconOpen] = useState(false)
  const iconRef = useRef<HTMLButtonElement>(null)
  const [allOpen, setAllOpen] = useState(false)
  const lastDetail = useRef<DetailView>({ kind: 'type' })

  const props = schema.filter((d) => !isReservedPropertyId(d.id))
  const assignedIds = new Set(schema.map((d) => d.id))
  const unassigned = registry.filter((d) => !assignedIds.has(d.id) && !isReservedPropertyId(d.id))
  const backToList = (): void => setView({ kind: 'list' })
  const openDetail = (v: DetailView): void => {
    lastDetail.current = v
    setView(v)
  }
  // Slot B keeps rendering the last-opened detail while sliding back, so it doesn't blank mid-retract.
  const detailView = view.kind === 'list' ? lastDetail.current : view

  const backHeader = (label: string, onClick: () => void): React.JSX.Element => (
    <MenuPaneTopRow label={label} onBack={onClick} />
  )
  // stopPropagation keeps the action's click off the row's back-nav.
  const actionHeader = (
    label: string,
    onBackClick: () => void,
    action: {
      icon: IconName
      size: React.ComponentProps<typeof Icon>['size']
      ariaLabel: string
      onClick: () => void
    },
  ): React.JSX.Element => (
    <MenuPaneTopRow
      label={label}
      onBack={onBackClick}
      trailing={
        <button
          type="button"
          className={s.topRowAction}
          aria-label={action.ariaLabel}
          onClick={(e) => {
            e.stopPropagation()
            action.onClick()
          }}
        >
          <Icon name={action.icon} size={action.size} />
        </button>
      }
    />
  )

  const commit = async (res: WriteResult): Promise<boolean> => {
    if (!res.ok) {
      await window.nexus.showError(res.error.message)
      return false
    }
    return true
  }

  const create = async (type: PropertyType): Promise<void> => {
    const res = await window.nexus.schema.add(collectionPath, {
      id: '',
      name: `New ${propertyTypeLabel(type)}`,
      type,
    })
    if (res.ok) {
      openDetail({ kind: 'edit', id: res.value.id })
    } else await window.nexus.showError(res.error.message)
  }
  const rename = async (id: string, name: string): Promise<void> => {
    // The second of the two rename entry points; both must tell mounted views to refetch, or the
    // renamed column reads blank until the container is switched.
    const before = registry.find((d) => d.id === id)?.name
    // The epoch keys must name what main actually STORED, and main normalizes before it writes —
    // an un-normalized key here re-keys nothing and blanks every touched row.
    const after = normalizePropertyName(name)
    if (await commit(await window.nexus.schema.rename(collectionPath, id, name)))
      if (before !== undefined && before !== after)
        bumpValuesEpoch(wrapKey('property', before), wrapKey('property', after))
  }
  const remove = async (id: string): Promise<void> => {
    if (await commit(await window.nexus.schema.delete(collectionPath, id))) backToList()
  }
  const assign = async (id: string): Promise<void> => {
    await commit(await window.nexus.schema.assign(collectionPath, id))
  }
  const saveOptions = async (id: string, next: Option[]): Promise<void> => {
    await commit(await window.nexus.property.setOptions(id, next))
  }
  const saveStatusGroups = async (id: string, next: StatusGroup[]): Promise<void> => {
    await commit(await window.nexus.property.setStatusGroups(id, next))
  }
  const saveLinkConfig = async (id: string, patch: LinkConfig): Promise<void> => {
    await commit(await window.nexus.property.setLinkConfig(id, patch))
  }
  // A checkbox property's color is def-level (property-wide), unlike its per-view look — so it writes
  // the nexus def through its own IPC, not the active view's column_styles.
  const saveCheckboxColor = async (id: string, color: string | undefined): Promise<void> => {
    await commit(await window.nexus.property.setCheckboxColor(id, color))
  }
  // A number property's format is def-level (property-wide) — its own IPC, not the view's column_styles.
  const saveNumberFormat = async (id: string, patch: Partial<NumberConfig>): Promise<void> => {
    await commit(await window.nexus.property.setNumberFormat(id, patch))
  }
  // Where a file property's uploads land is def-level (property-wide) — its own IPC. Main refuses
  // a folder that escapes the asset root or that the map could never index; the field simply
  // reverts, since the folder is not one this property accepts.
  const saveFileDirectory = async (id: string, dir: string): Promise<void> => {
    await commit(await window.nexus.property.setFileDirectory(id, { file_directory: dir }))
  }
  // A property's icon is def-level (registry) — its own IPC, like the color/format config above.
  const savePropertyIcon = async (id: string, icon: string): Promise<void> => {
    await commit(await window.nexus.property.setIcon(id, icon))
  }
  // The datetime display format is per-VIEW, not schema: it writes the active view's column_styles
  // (through the one view writer), NOT the nexus property def. Merges per-key like the column menu.
  // The refusal surfaces — this pane's other rows write the schema and land, so a silently-dropped
  // style would read as the same success they give.
  const saveColumnStyle = async (propId: string, patch: Partial<ColumnStyle>): Promise<void> => {
    const next = { ...activeView.column_styles?.[propId], ...patch }
    const res = await saveView({
      ...activeView,
      column_styles: { ...activeView.column_styles, [propId]: next },
    })
    if (!res.ok) await window.nexus.showError(res.error.message)
  }
  const renameOption = async (id: string, oldValue: string, newTitle: string): Promise<void> => {
    await commit(await window.nexus.property.renameOption(id, oldValue, newTitle))
  }
  const removeOption = async (id: string, value: string): Promise<void> => {
    await commit(await window.nexus.property.removeOption(id, value))
  }
  const clearOption = async (id: string, value: string): Promise<void> => {
    await commit(await window.nexus.property.clearOption(id, value))
  }
  const renameStatusOption = async (
    id: string,
    oldValue: string,
    newTitle: string,
  ): Promise<void> => {
    await commit(await window.nexus.property.renameStatusOption(id, oldValue, newTitle))
  }
  const removeStatusOption = async (id: string, value: string): Promise<void> => {
    await commit(await window.nexus.property.removeStatusOption(id, value))
  }
  const clearStatusOption = async (id: string, value: string): Promise<void> => {
    await commit(await window.nexus.property.clearStatusOption(id, value))
  }
  // The reorder-nexus branch translates the visible slot into the full registry's order
  // index — assigned ids stay in it.
  const handleDrop = async (drop: PaneDrop): Promise<void> => {
    const r =
      drop.kind === 'reorder-assigned'
        ? await window.nexus.schema.reorder(collectionPath, drop.propId, drop.toIndex)
        : drop.kind === 'reorder-nexus'
          ? await window.nexus.registry.reorder(
              drop.propId,
              nexusReorderIndex(
                registry.map((d) => d.id),
                unassigned.map((d) => d.id),
                drop.propId,
                drop.toIndex,
              ),
            )
          : drop.kind === 'assign'
            ? await window.nexus.schema.assign(collectionPath, drop.propId, drop.toIndex)
            : await window.nexus.schema.delete(collectionPath, drop.propId)
    await commit(r)
  }

  const paneRows: PaneRow[] = [
    ...props.map((d) => ({ id: d.id, group: 'assigned' as const })),
    ...unassigned.map((d) => ({ id: d.id, group: 'all' as const })),
  ]
  const nameFor = (id: string): string =>
    props.find((d) => d.id === id)?.name ?? unassigned.find((d) => d.id === id)?.name ?? ''

  // The editor's ⋮: Remove, or the pane-gated Delete (main confirms before resolving).
  const editorMenu = async (def: PropertyDefinition): Promise<void> => {
    const action = await window.nexus.propertyMenu({ kind: 'editor', name: def.name })
    if (action === 'property:remove') await remove(def.id)
    else if (
      action === 'property:destroy' &&
      (await commit(await window.nexus.property.delete(def.id)))
    )
      backToList()
  }
  // A row's right-click: Rename (both groups) · Remove (assigned only).
  const rowMenu = async (d: PropertyDefinition, group: 'assigned' | 'all'): Promise<void> => {
    const action = await window.nexus.propertyMenu({
      kind: group === 'assigned' ? 'assigned-row' : 'registry-row',
      name: d.name,
    })
    if (action === 'property:rename') beginPropertyRename({ collectionPath, propertyId: d.id })
    else if (action === 'property:remove')
      await commit(await window.nexus.schema.delete(collectionPath, d.id))
  }

  const typePicker = (
    <>
      {backHeader('Properties', backToList)}
      {CREATABLE_TYPES.map((type) => (
        <MenuItem
          key={type}
          className={flushTrailing}
          leading={<PropertyTypeIcon type={type} size={s.ICON.doc} />}
          trailing={<Icon name="chevron-right" />}
          onClick={() => void create(type)}
        >
          {propertyTypeLabel(type)}
        </MenuItem>
      ))}
    </>
  )

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
    return (
      <MenuScrollFrame
        header={actionHeader('Properties', backToList, {
          icon: 'ellipsis-vertical',
          size: s.ICON.editorMenu,
          ariaLabel: 'Property Menu',
          onClick: () => void editorMenu(def),
        })}
      >
        <InlineEditHeader
          value={def.name}
          icon={def.icon}
          iconRef={iconRef}
          onIconClick={() => setIconOpen(true)}
          onCommit={(next) => void rename(def.id, next)}
        />
        <MenuSeparator flush />
        {hasSelectOptions(def.type) ? (
          <OptionEditor
            type={def.type}
            options={def.select_options ?? []}
            onSetOptions={(next) => void saveOptions(def.id, next)}
            onRenameOption={(oldValue, newTitle) => void renameOption(def.id, oldValue, newTitle)}
            onRemoveOption={(value) => void removeOption(def.id, value)}
            onClearOption={(value) => void clearOption(def.id, value)}
          />
        ) : def.type === 'status' ? (
          <StatusEditor
            groups={def.status_groups ?? []}
            onSetGroups={(next) => void saveStatusGroups(def.id, next)}
            onRenameOption={(oldValue, newTitle) =>
              void renameStatusOption(def.id, oldValue, newTitle)
            }
            onRemoveOption={(value) => void removeStatusOption(def.id, value)}
            onClearOption={(value) => void clearStatusOption(def.id, value)}
          />
        ) : def.type === 'url' ? (
          <URLEditor
            underline={def.link_underline ?? false}
            display={def.link_display ?? DEFAULT_LINK_DISPLAY}
            color={def.link_color}
            onSetConfig={(patch) => void saveLinkConfig(def.id, patch)}
          />
        ) : def.type === 'datetime' ? (
          <DateTimeEditor
            style={styleFor(def.id, schema, activeView)}
            onChange={(patch) => void saveColumnStyle(def.id, patch)}
          />
        ) : def.type === 'checkbox' ? (
          <CheckboxEditor
            color={def.checkbox_color}
            look={styleFor(def.id, schema, activeView).look === 'switch' ? 'switch' : 'checkbox'}
            onSetColor={(next) => void saveCheckboxColor(def.id, next)}
            onSetStyle={(look) => void saveColumnStyle(def.id, { look })}
          />
        ) : def.type === 'number' ? (
          <NumberEditor
            config={{
              number_family: def.number_family,
              number_currency: def.number_currency,
              number_separators: def.number_separators,
              number_decimals: def.number_decimals,
              number_fraction: def.number_fraction,
              number_denominator: def.number_denominator,
            }}
            look={styleFor(def.id, schema, activeView).look === 'bar' ? 'bar' : 'number'}
            onSetConfig={(patch) => void saveNumberFormat(def.id, patch)}
            onSetStyle={(look) => void saveColumnStyle(def.id, { look })}
          />
        ) : def.type === 'file' ? (
          <FileEditor
            directory={def.file_directory}
            onSetDirectory={(dir) => void saveFileDirectory(def.id, dir)}
            onBrowse={() => {
              void window.nexus.chooseAssetDir('property', def.file_directory).then((picked) => {
                if (picked.ok && picked.value !== null) void saveFileDirectory(def.id, picked.value)
              })
            }}
          />
        ) : (
          // Blank body until this type's options UI ships (Guidelines/UI-Copy.md).
          <div style={{ minHeight: 8 }} />
        )}
      </MenuScrollFrame>
    )
  }

  const list = (
    <MenuScrollFrame
      header={<MenuPaneTopRow label="Settings" current="Properties" onBack={onBack} />}
      footer={
        <MenuBottomRow
          leading={
            <AccessoryButton
              icon="plus"
              size="control"
              box={20}
              create
              ariaLabel="New Property"
              onClick={() => openDetail({ kind: 'type' })}
            />
          }
        />
      }
    >
      <PaneDnd rows={paneRows} labelFor={nameFor} onDrop={(drop) => void handleDrop(drop)}>
        <ListGroups
          assigned={props}
          unassigned={unassigned}
          allOpen={allOpen}
          renamingId={
            renamingProperty?.collectionPath === collectionPath ? renamingProperty.propertyId : null
          }
          onToggleAll={() => setAllOpen((o) => !o)}
          onOpenEditor={(id) => openDetail({ kind: 'edit', id })}
          onAssign={(id) => void assign(id)}
          onRowMenu={(d, group) => void rowMenu(d, group)}
          onRenameCommit={(next) => void submitPropertyRename(next)}
          onRenameCancel={cancelPropertyRename}
        />
      </PaneDnd>
    </MenuScrollFrame>
  )

  const editingId = detailView.kind === 'edit' ? detailView.id : undefined
  const editingIcon = editingId ? registry.find((d) => d.id === editingId)?.icon : undefined

  return (
    <>
      <PaneSlider
        open={view.kind !== 'list'}
        root={list}
        detail={detailView.kind === 'type' ? typePicker : editor(detailView.id)}
        minWidth={225}
        minHeight={245}
      />
      <IconPicker
        open={iconOpen}
        onClose={() => setIconOpen(false)}
        triggerRef={iconRef}
        value={editingIcon}
        onSelect={(icon) => {
          if (editingId) void savePropertyIcon(editingId, icon)
        }}
      />
    </>
  )
}
