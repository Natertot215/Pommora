import { useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from '@pommora/uix/Symbols'
import type { IconSize } from '@pommora/uix/Theme'
import { useSession } from '../../Session/store'
import {
  CREATABLE_TYPES,
  type PropertyConfig,
  type PropertyDefinition,
  PROPERTY_TYPES,
  type PropertyType,
} from '../properties'
import type { FormatChange } from '../keyFormat'
import { FormatRows } from './FormatRows'
import { type ColumnStyle, LOOKS, lookIn } from '../columnStyles'
import { lookOptions } from '../displayLabels'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import { useActiveView } from '../../Views/Host/useActiveView'
import { useSaveView } from '../../Views/viewWrite'
import { columnStylePatch, styleFor, useNexusForms } from '../../Views/Host/useColumnStyles'
import { propertyColumn } from '../../Views/Pipeline/columns'
import {
  MenuItem,
  MenuCaption,
  MenuIndex,
  MenuTopRow,
  MenuScrollFrame,
  MenuFooting,
  FootingItem,
  MenuSeparator,
  AccessoryButton,
  FootingCreate,
  DropOutline,
} from '@pommora/uix/Menus'
import { titleInput, actionRow } from '@pommora/uix/Menus/menu-row.css'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import { IconChoice } from '../../Assets/IconChoice'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { InlineEditHeader } from '@pommora/uix/Menus/InlineEditHeader'
import { OptionEditor } from './OptionEditor'
import { PickerControl } from '@pommora/uix/Pickers/PickerControl'
import { rowsFor } from './typeRows'
import { FrameSlide } from '@pommora/uix/Menus/FrameSlide'
import { PANE_MIN_H, PANE_MIN_W } from '@pommora/uix/Menus/frame-slide.css'
import { LineGroup, LineRow, LineZone } from '@pommora/uix/Interactions/drag'
import { PaneRestGroup, type PaneDrop, paneSpec } from '@pommora/uix/Menus/paneDrop'
import { fullOrderIndex } from '@pommora/uix/Utilities/moveItem'
import { propertyIcon, propertyTypeIconName, propertyTypeLabel } from '../typeDisplay'
import { cx } from '@pommora/uix/Utilities/cx'
import * as s from '@pommora/uix/Menus/frames.css'
import { askRewrite, confirmDelete } from '../../Interface/Confirm/confirmations'
import { popMenu } from '../../Actions/menuActions'
import { propertyMenuModel } from '../../Actions/propertyMenu'

type SubView = { kind: 'list' } | { kind: 'type' } | { kind: 'edit'; id: string }
const OPTION_STYLE_OPTIONS = lookOptions(LOOKS.select)

const TITLES = { members: 'Properties', rest: 'All Properties' }

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
  onRowMenu: (d: PropertyDefinition) => void
  onRenameCommit: (id: string, next: string) => void
  onRenameCancel: () => void
}): React.JSX.Element {
  const enteringAssigned = useEntrance(assigned, (d) => d.id)
  const enteringAll = useEntrance(unassigned, (d) => d.id)
  const title = (d: PropertyDefinition): ReactNode => (
    <RenamableLabel
      renames="row"
      editing={renamingId === d.id}
      value={d.label}
      className={cx(titleInput, 'row-title-input')}
      onCommit={(next) => onRenameCommit(d.id, next)}
      onCancel={onRenameCancel}
    />
  )
  return (
    <>
      <LineGroup id="members" className={cx(s.assignedFill, allOpen && s.assignedFillNone)}>
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
                      onRowMenu(d)
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
      <PaneRestGroup>
        <button type="button" className={cx(actionRow, s.allHeading)} onClick={onToggleAll}>
          <DropOutline open={allOpen} />
          <span>{TITLES.rest}</span>
        </button>
        <Reveal open={allOpen} duration="base">
          <div>
            {unassigned.map((d) => (
              <Reveal key={d.id} open enterOnMount={enteringAll(d.id)} fill>
                <LineRow id={d.id}>
                  <MenuItem
                    className={s.allRow}
                    leading={<Icon name={propertyIcon(d)} size={s.ICON.doc} />}
                    trailing={
                      <AccessoryButton
                        icon="plus"
                        size={s.ICON.rowPlus}
                        ariaLabel={`Assign ${d.label}`}
                        create
                        onClick={() => onAssign(d.id)}
                      />
                    }
                  >
                    {d.label}
                  </MenuItem>
                </LineRow>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </PaneRestGroup>
    </>
  )
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
  const nexus = useNexusForms()
  const saveView = useSaveView(source)
  const activeView = useActiveView(source)
  const registry = useSession((st) => st.tree?.config.registry) ?? []
  const assetRoot = useSession((st) => st.tree?.config.assetDirectory ?? '')
  const mutate = useSession((st) => st.mutate)
  const bumpValuesEpoch = useSession((st) => st.bumpValuesEpoch)
  const [view, setView] = useState<SubView>({ kind: 'list' })
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [iconOpen, setIconOpen] = useState(false)
  const iconRef = useRef<HTMLButtonElement>(null)
  const [allOpen, setAllOpen] = useState(false)

  const assignedIds = new Set(schema.map((d) => d.id))
  const unassigned = registry.filter((d) => !assignedIds.has(d.id))
  // An editor whose property leaves this Collection, by any route, gives way to the list.
  const editing = view.kind === 'edit' ? schema.find((d) => d.id === view.id) : undefined
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
    const draft = { label: `New ${propertyTypeLabel(type)}`, type }
    const created = (await mutate({ op: 'addProperty', containerPath: collectionPath, draft }))
      ?.created
    if (created && 'propertyId' in created) setView({ kind: 'edit', id: created.propertyId })
  }
  const rename = async (id: string, label: string): Promise<void> => {
    if (!(await askRewrite(id, { of: 'rename', label }))) return
    if ((await mutate({ op: 'renameProperty', propertyId: id, label }))?.cascade) bumpValuesEpoch()
  }
  const setFormat = async (id: string, change: FormatChange): Promise<void> => {
    if (!(await askRewrite(id, { of: 'format', change }))) return
    const done = await mutate({ op: 'setFormat', propertyId: id, change })
    if (done?.cascade && 'key_format' in change) bumpValuesEpoch()
  }
  const remove = async (id: string): Promise<void> => {
    if (await mutate({ op: 'unassignProperty', containerPath: collectionPath, propertyId: id }))
      backToList()
  }
  const configure = (propertyId: string, patch: PropertyConfig): void =>
    void mutate({ op: 'configureProperty', propertyId, patch })
  const saveColumnStyle = async (
    def: PropertyDefinition,
    patch: Partial<ColumnStyle>,
  ): Promise<void> => {
    await saveView(activeView, columnStylePatch(activeView, propertyColumn(def), nexus, patch))
  }
  const handleDrop = (drop: PaneDrop): void => {
    const at = { containerPath: collectionPath, propertyId: drop.id }
    switch (drop.kind) {
      case 'reorder-members':
        return void mutate({ op: 'reorderAssigned', ...at, toIndex: drop.toIndex })
      case 'reorder-rest': {
        const ids = (defs: PropertyDefinition[]): string[] => defs.map((d) => d.id)
        const toIndex = fullOrderIndex(ids(registry), ids(unassigned), drop.id, drop.toIndex)
        return void mutate({ op: 'reorderProperty', propertyId: drop.id, toIndex })
      }
      case 'join':
        return void mutate({ op: 'assignProperty', ...at, toIndex: drop.toIndex })
      case 'leave':
        return void mutate({ op: 'unassignProperty', ...at })
    }
  }

  const defOf = (id: string): PropertyDefinition | undefined =>
    schema.find((d) => d.id === id) ?? unassigned.find((d) => d.id === id)
  const labelFor = (id: string): string => defOf(id)?.label ?? ''
  const glyphFor = (id: string): ReactNode => {
    const d = defOf(id)
    return d && <Icon name={propertyIcon(d)} />
  }

  const editorMenu = async (def: PropertyDefinition): Promise<void> => {
    const action = await popMenu(propertyMenuModel({ kind: 'editor' }))
    if (action === 'property:remove') await remove(def.id)
    else if (
      action === 'property:destroy' &&
      (await confirmDelete({ propertyId: def.id, title: def.label }))
    )
      backToList()
  }
  const rowMenu = async (d: PropertyDefinition): Promise<void> => {
    const action = await popMenu(propertyMenuModel({ kind: 'assigned-row' }))
    if (action === 'property:rename') setRenamingId(d.id)
    else if (action === 'property:remove') await remove(d.id)
  }

  const typePicker = (
    <>
      {backHeader('Properties', backToList)}
      {CREATABLE_TYPES.map((type) => (
        <MenuItem
          key={type}
          leading={<Icon name={propertyTypeIconName(type)} size={s.ICON.doc} />}
          trailing={<Icon name="chevron-right" />}
          onClick={() => void create(type)}
        >
          {propertyTypeLabel(type)}
        </MenuItem>
      ))}
    </>
  )

  const editor = (def: PropertyDefinition): React.JSX.Element => {
    const columnStyle = styleFor(propertyColumn(def), activeView, nexus)
    const options = PROPERTY_TYPES[def.type].options !== undefined
    const rows = rowsFor(def, {
      style: columnStyle,
      setStyle: (patch) => void saveColumnStyle(def, patch),
      configure: (patch) => configure(def.id, patch),
      assetRoot,
    })
    const settings = options ? (
      <div className={cx(s.middleRegion, s.chipRegion, 'scroll-fade')}>
        <OptionEditor
          def={def}
          style={{
            current: columnStyle,
            set: (key, value) => void saveColumnStyle(def, { [key]: value }),
          }}
        />
      </div>
    ) : rows.length > 0 ? (
      <div className={s.configEditor}>
        <MenuIndex sections={[{ rows }]} />
      </div>
    ) : null
    const optionLook = lookIn(LOOKS.select, columnStyle.look)
    const styleFooting = options ? (
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
              onPick={(look) => void saveColumnStyle(def, { look })}
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
        maxHeight={s.VIEW_SETTINGS_MAX_HEIGHT}
      >
        <InlineEditHeader
          value={def.label}
          icon={propertyIcon(def)}
          iconRef={iconRef}
          iconOpen={iconOpen}
          onIconClick={() => setIconOpen(true)}
          onCommit={(next) => void rename(def.id, next)}
        />
        <MenuSeparator flush />
        <FormatRows def={def} onPick={(change) => void setFormat(def.id, change)} />
        {settings && <MenuSeparator flush />}
        {settings}
      </MenuScrollFrame>
    )
  }

  const list = (
    <MenuScrollFrame
      header={<MenuTopRow label="Settings" current="Properties" onBack={onBack} />}
      footer={
        <MenuFooting
          leading={
            <FootingCreate ariaLabel="New Property" onClick={() => setView({ kind: 'type' })} />
          }
        />
      }
    >
      <LineZone
        className={s.frameZone}
        {...paneSpec({
          members: schema.map((d) => d.id),
          ordersRest: true,
          titles: TITLES,
          label: labelFor,
          glyph: glyphFor,
          onDrop: handleDrop,
          watch: [schema, registry],
        })}
      >
        <ListGroups
          assigned={schema}
          unassigned={unassigned}
          allOpen={allOpen}
          renamingId={renamingId}
          onToggleAll={() => setAllOpen((o) => !o)}
          onOpenEditor={(id) => setView({ kind: 'edit', id })}
          onAssign={(id) =>
            void mutate({ op: 'assignProperty', containerPath: collectionPath, propertyId: id })
          }
          onRowMenu={(d) => void rowMenu(d)}
          onRenameCommit={(id, next) => {
            setRenamingId(null)
            void rename(id, next)
          }}
          onRenameCancel={() => setRenamingId(null)}
        />
      </LineZone>
    </MenuScrollFrame>
  )

  return (
    <>
      <FrameSlide
        open={view.kind === 'type' || editing !== undefined}
        root={list}
        detail={view.kind === 'type' ? typePicker : editing && editor(editing)}
        minWidth={PANE_MIN_W}
        minHeight={PANE_MIN_H}
      />
      <IconChoice
        open={iconOpen}
        onClose={() => setIconOpen(false)}
        triggerRef={iconRef}
        value={editing?.icon}
        onSelect={(icon) => {
          if (editing) configure(editing.id, { icon })
        }}
      />
    </>
  )
}
