import { useEffect, useMemo, useRef, useState } from 'react'
import type { CollectionNode, SetNode } from '@shared/types'
import type { PageFrontmatter } from '@shared/schemas'
import { type PropertyDefinition, statusOptions } from '@shared/properties'
import type {
  DateGranularity,
  GroupConfig,
  GroupOrderMode,
  SavedView,
  StructuralOrderMode,
  SubGroupConfig,
} from '@shared/views'
import { Icon, asRenderableIcon, type IconName } from '@renderer/design-system/symbols'
import {
  DisclosureRow,
  MenuItem,
  MenuSeparator,
  MenuPaneTopRow,
  MenuScrollFrame,
  MenuBottomRow,
  useDisclosureSet,
} from '../../design-system/components/menu'
import {
  flushTrailing,
  footingLabel,
  footingSymbol,
} from '../../design-system/components/menu/menu.css'
import { Reveal } from '../../design-system/components/Reveal'
import { registerDiscloseTarget } from '../../design-system/interactions/dragDisclose'
import { DragGhost } from '@renderer/design-system/interactions/DragGhost'
import { EyeToggle } from './EyeToggle'
import { Switch } from '../../design-system/components/Switches/Switch'
import { useSaveView } from '@renderer/Embeds/ViewEmbedScope'
import { declaredType } from '../../Detail/Views/pipeline/value'
import {
  bucketKey,
  bucketOrder,
  flattenContainer,
  groupsStructurally,
  subHiddenKey,
} from '../../Detail/Views/pipeline/group'
import { formatBucketLabel, NUMERIC_FORMATS } from '../../Detail/Views/PropertyEditing/formatValue'
import type { Band } from '../../Detail/Views/bandDndModel'
import { reparentFsOrder, structuralOrderAfterDrop } from '../../Detail/Views/bandDndModel'
import { nextOrder } from '@renderer/Sidebar/sidebarDndModel'
import { EntityIcon } from '@renderer/Components/EntityIcon'
import { Chip, chipShapeForType } from '../Chip'
import { chipColorFor } from '../../design-system/tokens/colorMap'
import { cx } from '../../design-system/cx'
import { useSession } from '../../store'
import { MenuOption } from '@renderer/design-system/components/PickerMenu'
import { PickerControl, type PickerChoice } from './PickerControl'
import { propertyTypeIconName } from './PropertyTypes'
import { useGroupingListDrag, type GroupingDrop } from './groupingDnd'
import { hiddenRow, switchScale } from './settingsPane.css'
import * as gp from './groupingPane.css'

/** Checkbox is deliberately absent — the pipeline still renders it from a foreign sidecar; the
 *  pane never authors it. */
const GROUPABLE_PANE = new Set(['select', 'status', 'datetime'])

const STRUCTURAL_ORDER: PickerChoice<StructuralOrderMode>[] = [
  { value: 'custom', label: 'Custom' },
  { value: 'location', label: 'Location' },
]
const OPTION_ORDER: PickerChoice<GroupOrderMode>[] = [
  { value: 'configured', label: 'Default' },
  { value: 'reversed', label: 'Reversed' },
  { value: 'manual', label: 'Custom' },
]
const DATE_ORDER: PickerChoice<GroupOrderMode>[] = [
  { value: 'configured', label: 'Ascending' },
  { value: 'reversed', label: 'Descending' },
]
const GRANULARITY: PickerChoice<DateGranularity>[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
]

const orderOptionsFor = (type: string | undefined): PickerChoice<GroupOrderMode>[] =>
  type === 'datetime' ? DATE_ORDER : OPTION_ORDER

function ValueRow<T extends string>({
  tier = 'primary',
  icon,
  label,
  value,
  options,
  onPick,
}: {
  tier?: 'primary' | 'sub'
  icon?: IconName
  label: string
  value: T
  options: PickerChoice<T>[]
  onPick: (v: T) => void
}): React.JSX.Element {
  return (
    <MenuItem
      className={cx(flushTrailing, gp.pickerTone, tier === 'sub' && gp.subRow)}
      leading={icon ? <Icon name={icon} size={14} /> : undefined}
      trailing={<PickerControl ariaLabel={label} value={value} options={options} onPick={onPick} />}
    >
      {tier === 'sub' ? <span className={gp.subLabel}>{label}</span> : label}
    </MenuItem>
  )
}

export function GroupingPane({
  source,
  view,
  schema,
  label,
  subGrouping = true,
  onBack,
}: {
  source: CollectionNode | SetNode
  view: SavedView
  schema: PropertyDefinition[]
  /** The back-destination breadcrumb — 'Settings' from SettingsPane, 'Views' from ViewSettings. */
  label: string
  /** Cards views drop Sub-Group entirely — same pane, no second grouping level. */
  subGrouping?: boolean
  onBack: () => void
}): React.JSX.Element {
  const load = useSession((st) => st.load)
  const [groupByOpen, setGroupByOpen] = useState(false)
  const saveView = useSaveView(source, load)
  const save = (patch: Partial<SavedView>): void => void saveView({ ...view, ...patch })
  const saveGroup = (group: GroupConfig): void => save({ group })

  // Group hiding — one keyed list shared with collapse (option values, set ids, date bucket
  // keys, sub/<value>); the pipeline drops what it names.
  const hiddenSet = new Set(view.hidden_groups ?? [])
  const toggleHidden = (key: string): void =>
    save({
      hidden_groups: hiddenSet.has(key)
        ? (view.hidden_groups ?? []).filter((k) => k !== key)
        : [...(view.hidden_groups ?? []), key],
    })

  const group = view.group ?? { kind: 'structural' as const }
  // The pipeline's EFFECTIVE mode, not the raw kind — a dead-property grouping renders structurally
  // in the table, so the pane shows the structural chrome for it too (never a phantom "Location"
  // label over property rows).
  const structural = groupsStructurally(group, schema)
  const groupable = schema.filter((d) => GROUPABLE_PANE.has(declaredType(d.id, schema) ?? ''))
  const activeDef =
    group.kind === 'property' ? schema.find((d) => d.id === group.property_id) : undefined
  const subGroup = structural && subGrouping ? view.sub_group : undefined
  // The Separation footing (below) appears only when this property wears a numeric date format.
  const dateHeadingProp =
    group.kind === 'property' && declaredType(group.property_id, schema) === 'datetime'
      ? group.property_id
      : subGroup && declaredType(subGroup.property_id, schema) === 'datetime'
        ? subGroup.property_id
        : undefined

  // Preservation is free: structural_order_mode / sub_group are view-level, so switching the
  // one group slot never touches them — flip back to Location and they're still in force.
  const pickGroupBy = (target: 'location' | 'none' | PropertyDefinition): void => {
    setGroupByOpen(false)
    if (target === 'none') {
      // Group By: None = the flat GroupConfig (cards render it as one headerless band).
      if (group.kind !== 'flat') saveGroup({ kind: 'flat' })
      return
    }
    if (target === 'location') {
      // Keyed on the RAW kind: a dead-property config renders structurally but still sits on disk,
      // and picking Location must heal it.
      if (group.kind !== 'structural') saveGroup({ kind: 'structural' })
      return
    }
    if (group.kind === 'property' && group.property_id === target.id) return
    saveGroup({
      kind: 'property',
      property_id: target.id,
      order_mode: 'configured',
      empty_placement: view.ungrouped_placement ?? 'bottom',
      hide_empty_groups: false,
    })
  }

  const saveSub = (sub: SubGroupConfig | undefined): void => save({ sub_group: sub })
  // View-level with the property config's field as the pre-hoist fallback — resolveView's read.
  const hideEmpty =
    view.hide_empty_groups ?? (group.kind === 'property' && group.hide_empty_groups)

  const footings = groupByOpen ? undefined : (
    <MenuBottomRow>
      <MenuItem
        className={flushTrailing}
        leading={
          <span className={footingSymbol}>
            <Icon name="eye-off" size={12} />
          </span>
        }
        trailing={
          <span className={switchScale}>
            <Switch
              checked={hideEmpty}
              onChange={(next) => save({ hide_empty_groups: next })}
              ariaLabel="Hide Empty Groups"
            />
          </span>
        }
      >
        <span className={footingLabel}>Hide Empty Groups</span>
      </MenuItem>
      <FootingPick
        icon="folder-minus"
        label="Ungrouped"
        value={view.ungrouped_placement ?? 'bottom'}
        options={[
          { value: 'top', label: 'Top' },
          { value: 'bottom', label: 'Bottom' },
        ]}
        onPick={(v) => save({ ungrouped_placement: v })}
      />
      {dateHeadingProp &&
        NUMERIC_FORMATS.has(view.column_styles?.[dateHeadingProp]?.date_format ?? 'full') && (
          <FootingPick
            icon="type"
            label="Separation"
            value={view.date_separator ?? 'dash'}
            options={[
              { value: 'dash', label: 'Dash' },
              { value: 'slash', label: 'Slash' },
            ]}
            onPick={(v) => save({ date_separator: v })}
          />
        )}
    </MenuBottomRow>
  )

  return (
    <MenuScrollFrame
      header={<MenuPaneTopRow label={label} current="Grouping" onBack={onBack} />}
      footer={footings}
    >
      <MenuItem
        className={flushTrailing}
        leading={<Icon name="layers" size={14} />}
        trailing={
          <span className={gp.groupByValue}>
            {group.kind === 'flat'
              ? 'None'
              : structural
                ? 'Location'
                : (activeDef?.name ?? 'Location')}
            <Icon name="chevrons-up-down" size={12} />
          </span>
        }
        onClick={() => setGroupByOpen((o) => !o)}
      >
        Group By
      </MenuItem>
      <Reveal open={groupByOpen}>
        <div>
          {view.type === 'cards' && (
            <MenuOption
              leading={<Icon name="circle-off" size={13} />}
              selected={group.kind === 'flat'}
              onClick={() => pickGroupBy('none')}
            >
              None
            </MenuOption>
          )}
          <MenuOption
            leading={<Icon name="folder" size={13} />}
            selected={structural}
            onClick={() => pickGroupBy('location')}
          >
            Location
          </MenuOption>
          {groupable.map((d) => (
            <MenuItem
              key={d.id}
              leading={
                <Icon
                  name={asRenderableIcon(d.icon) ?? propertyTypeIconName(d.type) ?? 'tag'}
                  size={13}
                />
              }
              selected={group.kind === 'property' && group.property_id === d.id}
              onClick={() => pickGroupBy(d)}
            >
              {d.name}
            </MenuItem>
          ))}
        </div>
      </Reveal>
      {!groupByOpen && (
        <>
          {group.kind === 'property' && declaredType(group.property_id, schema) === 'datetime' && (
            <ValueRow
              icon="calendar"
              label="Date By"
              value={group.date_granularity ?? 'month'}
              options={GRANULARITY}
              onPick={(g) => saveGroup({ ...group, date_granularity: g })}
            />
          )}
          {!structural && group.kind === 'property' ? (
            <ValueRow
              icon="arrow-up-down"
              label="Order"
              value={group.order_mode}
              options={orderOptionsFor(declaredType(group.property_id, schema))}
              onPick={(m) => saveGroup({ ...group, order_mode: m })}
            />
          ) : (
            <ValueRow
              tier={subGroup ? 'sub' : 'primary'}
              icon="arrow-up-down"
              label="Order"
              value={view.structural_order_mode ?? 'custom'}
              options={STRUCTURAL_ORDER}
              onPick={(m) => save({ structural_order_mode: m })}
            />
          )}
          {structural && subGrouping && (
            <>
              <SubGroupRow subGroup={subGroup} groupable={groupable} onSave={saveSub} />
              {subGroup && declaredType(subGroup.property_id, schema) === 'datetime' && (
                <ValueRow
                  icon="calendar"
                  label="Date By"
                  value={subGroup.date_granularity ?? 'month'}
                  options={GRANULARITY}
                  onPick={(g) => saveSub({ ...subGroup, date_granularity: g })}
                />
              )}
              {subGroup && (
                <ValueRow
                  tier="sub"
                  icon="arrow-up-down"
                  label="Order"
                  value={subGroup.order_mode}
                  options={orderOptionsFor(declaredType(subGroup.property_id, schema))}
                  onPick={(m) => saveSub({ ...subGroup, order_mode: m })}
                />
              )}
            </>
          )}
          <MenuSeparator flush />
          <div className={`${gp.middle} overflow-eclipse-y`}>
            {!structural && group.kind === 'property' ? (
              declaredType(group.property_id, schema) === 'datetime' ? (
                <DateBucketList
                  source={source}
                  view={view}
                  group={group}
                  def={activeDef}
                  schema={schema}
                  hiddenSet={hiddenSet}
                  onToggleHidden={toggleHidden}
                />
              ) : group.order_mode === 'manual' ? (
                <CustomList
                  group={group}
                  def={activeDef}
                  onSave={(order) => saveGroup({ ...group, order })}
                  hiddenSet={hiddenSet}
                  onToggleHidden={toggleHidden}
                />
              ) : (
                <PropertyPreview
                  group={group}
                  def={activeDef}
                  hiddenSet={hiddenSet}
                  onToggleHidden={toggleHidden}
                />
              )
            ) : (
              <LocationHierarchy
                source={source}
                view={view}
                subDef={subGroup ? schema.find((d) => d.id === subGroup.property_id) : undefined}
                onSaveView={save}
                hiddenSet={hiddenSet}
                onToggleHidden={toggleHidden}
              />
            )}
          </div>
        </>
      )}
    </MenuScrollFrame>
  )
}

function FootingPick<T extends string>({
  icon,
  label,
  value,
  options,
  onPick,
}: {
  icon: React.ComponentProps<typeof Icon>['name']
  label: string
  value: T
  options: PickerChoice<T>[]
  onPick: (v: T) => void
}): React.JSX.Element {
  return (
    <MenuItem
      className={`${flushTrailing} ${gp.pickerTone}`}
      leading={
        <span className={footingSymbol}>
          <Icon name={icon} size={12} />
        </span>
      }
      trailing={<PickerControl ariaLabel={label} value={value} options={options} onPick={onPick} />}
    >
      <span className={footingLabel}>{label}</span>
    </MenuItem>
  )
}

export const optionsOf = (
  def: PropertyDefinition | undefined,
): { value: string; label: string; color?: string }[] => def?.select_options ?? statusOptions(def)

type PropertyGroupConfig = Extract<GroupConfig, { kind: 'property' }>

/** The Grouping pane's per-row hide affordance — absent for the Sorting pane's usages. */
interface HideControls {
  hiddenSet?: ReadonlySet<string>
  onToggleHidden?: (key: string) => void
}

/** A group row's trailing eye (always shown, ghosted at rest) — null when the host pane
 *  doesn't hide (Sorting). `hideKey` is what the toggle writes; hidden state reads the same key. */
function rowEye(
  label: string,
  hideKey: string,
  { hiddenSet, onToggleHidden }: HideControls,
): React.JSX.Element | null {
  if (!onToggleHidden) return null
  return (
    <span className={gp.eyeSlot}>
      <EyeToggle
        hidden={hiddenSet?.has(hideKey) ?? false}
        name={label}
        onToggle={() => onToggleHidden(hideKey)}
      />
    </span>
  )
}

/** Shared with the Sorting pane's example order — `group` is just the ordering pair. */
export function PropertyPreview({
  group,
  def,
  hiddenSet,
  onToggleHidden,
}: {
  group: Pick<PropertyGroupConfig, 'order_mode' | 'order'>
  def: PropertyDefinition | undefined
} & HideControls): React.JSX.Element | null {
  if (!def) return null
  const type = def.type === 'status' ? 'status' : 'select'
  const chip = (o: { value: string; label: string; color?: string }): React.JSX.Element => (
    <div key={o.value} className={cx(gp.chipRow, hiddenSet?.has(o.value) && hiddenRow)}>
      <Chip color={chipColorFor(o.color)} label={o.label} shape={chipShapeForType(type)} />
      {rowEye(o.label, o.value, { hiddenSet, onToggleHidden })}
    </div>
  )
  if (def.status_groups) {
    const groups =
      group.order_mode === 'reversed' ? [...def.status_groups].reverse() : def.status_groups
    return (
      <>
        {groups.map((g) => (
          <div key={g.id}>
            <div className={gp.previewHeading}>{g.label}</div>
            {(group.order_mode === 'reversed' ? [...g.options].reverse() : g.options).map((o) =>
              chip(o.color ? o : { ...o, color: g.color }),
            )}
          </div>
        ))}
      </>
    )
  }
  const all = optionsOf(def)
  const ordered = bucketOrder(group, def, new Set(all.map((o) => o.value)))
  const byValue = new Map(all.map((o) => [o.value, o]))
  return <>{ordered.flatMap((v) => (byValue.has(v) ? [chip(byValue.get(v)!)] : []))}</>
}

/** Shared with the Sorting pane's Custom order — the caller owns the write. */
export function CustomList({
  group,
  def,
  onSave,
  hiddenSet,
  onToggleHidden,
}: {
  group: Pick<PropertyGroupConfig, 'order_mode' | 'order'>
  def: PropertyDefinition | undefined
  onSave: (order: string[]) => void
} & HideControls): React.JSX.Element | null {
  // Identity-stable across the drag's own re-renders — a per-render rebuild would false-dirty the
  // hook's snapshot on every pointermove.
  const { ordered, byValue, bands } = useMemo(() => {
    const all = optionsOf(def)
    const orderedValues = bucketOrder(group, def, new Set(all.map((o) => o.value)))
    return {
      ordered: orderedValues,
      byValue: new Map(all.map((o) => [o.value, o])),
      bands: orderedValues.map(
        (v): Band => ({ id: v, kind: 'property', depth: 0, parentId: null }),
      ),
    }
  }, [group, def])
  const dnd = useGroupingListDrag({
    bands,
    nestable: false,
    onDrop: (draggedId, drop) => onSave(nextOrder(ordered, draggedId, drop.beforeId)),
  })
  if (!def) return null
  const type = def.type === 'status' ? 'status' : 'select'
  return (
    <div ref={dnd.containerRef} className="drop-line-host">
      <div className={gp.previewHeading}>Options</div>
      {ordered.flatMap((v) => {
        const o = byValue.get(v)
        if (!o) return []
        return [
          <div
            key={v}
            ref={dnd.rowRef(v)}
            {...dnd.rowHandle(v)}
            className={cx(gp.chipRow, hiddenSet?.has(v) && hiddenRow, dnd.draggingId === v && gp.ghosted)}
          >
            <Chip color={chipColorFor(o.color)} label={o.label} shape={chipShapeForType(type)} />
            {rowEye(o.label, v, { hiddenSet, onToggleHidden })}
          </div>,
        ]
      })}
      {dnd.line && <div className={cx('drop-line', gp.dropLineInset)} style={{ top: dnd.line.y }} />}
      <DragGhost
        x={dnd.ghost?.x ?? null}
        y={dnd.ghost?.y ?? null}
        label={dnd.draggingId ? (byValue.get(dnd.draggingId)?.label ?? dnd.draggingId) : null}
      />
    </div>
  )
}

/** A hierarchy row that registers as a spring-open target while collapsed — a drag dwelling
 *  over it expands it, the disclose remeasure re-aiming the live drag. */
function SpringableRow({
  collapsed,
  onExpand,
  className,
  refCb,
  handle,
  dimmed,
  children,
}: {
  collapsed: boolean
  onExpand: () => void
  className: string
  refCb: (el: HTMLElement | null) => void
  handle: { onPointerDown: (e: React.PointerEvent) => void }
  dimmed: boolean
  children: React.ReactNode
}): React.JSX.Element {
  const el = useRef<HTMLDivElement | null>(null)
  const expandRef = useRef(onExpand)
  expandRef.current = onExpand
  useEffect(() => {
    if (!collapsed || !el.current) return
    return registerDiscloseTarget(el.current, () => expandRef.current())
  }, [collapsed])
  return (
    <div
      className={cx(className, dimmed && gp.ghosted)}
      ref={(node) => {
        el.current = node
        refCb(node)
      }}
      data-disclose={collapsed ? '' : undefined}
      {...handle}
    >
      {children}
    </div>
  )
}

/** The band id a disclosed sub-group chip registers under — the registration and the row that
 *  spreads its handle must mint the same string, or the row drags nothing. */
const subBandId = (setId: string, value: string): string => `sub:${setId}:${value}`

/** Drags mirror the table band rules: sibling reorder writes view order in Custom / the
 *  filesystem in Location; a cross-nesting drop is always an fs reparent. */
function LocationHierarchy({
  source,
  view,
  subDef,
  onSaveView,
  hiddenSet,
  onToggleHidden,
}: {
  source: CollectionNode | SetNode
  view: SavedView
  subDef: PropertyDefinition | undefined
  onSaveView: (patch: Partial<SavedView>) => void
} & HideControls): React.JSX.Element {
  const mutate = useSession((st) => st.mutate)
  const hideChevrons = useSession((st) => st.personalization.hideChevrons ?? false)
  const expanded = useDisclosureSet()
  const flat = subDef !== undefined

  // The property sub-group's disclosed chips — the same value run under every top-level set.
  const subChips = useMemo(() => {
    if (!subDef) return []
    const subOptions = optionsOf(subDef)
    const subByValue = new Map(subOptions.map((o) => [o.value, o]))
    return bucketOrder(
      { order_mode: view.sub_group?.order_mode ?? 'configured', order: view.sub_group?.order },
      subDef,
      new Set(subOptions.map((o) => o.value)),
    ).flatMap((v) => {
      const o = subByValue.get(v)
      return o ? [o] : []
    })
  }, [subDef, view.sub_group])

  // Identity-stable across the drag's own re-renders — a per-render rebuild would false-dirty the
  // hook's snapshot on every pointermove.
  const { allIds, childIds, paths, bands, chipValueOf } = useMemo(() => {
    const allIds: string[] = []
    const childIds = new Map<string | null, string[]>()
    const paths = new Map<string, string>()
    const bands: Band[] = []
    const chipValueOf = new Map<string, string>()
    const chipBandId = (setId: string, value: string): string => {
      const id = subBandId(setId, value)
      chipValueOf.set(id, value)
      return id
    }
    const index = (
      sets: SetNode[] | undefined,
      depth: number,
      parentId: string | null,
      visible: boolean,
    ): void => {
      childIds.set(
        parentId,
        (sets ?? []).map((s) => s.id),
      )
      for (const s of sets ?? []) {
        allIds.push(s.id)
        paths.set(s.id, s.path)
        if (visible) {
          bands.push({ id: s.id, kind: 'set', depth, parentId })
          // A disclosed chip run registers as property bands so the SAME gesture drags them (the
          // pane's own drag surface) — the drop resolves back to the value through chipValueOf.
          if (flat && expanded.has(s.id)) {
            for (const o of subChips)
              bands.push({
                id: chipBandId(s.id, o.value),
                kind: 'property',
                depth: depth + 1,
                parentId: s.id,
              })
          }
        }
        index(s.sets, depth + 1, s.id, visible && !flat && expanded.has(s.id))
      }
    }
    index(source.sets, 0, null, true)
    return { allIds, childIds, paths, bands, chipValueOf }
  }, [source.sets, flat, expanded, subChips])

  const onDrop = (draggedId: string, drop: GroupingDrop): void => {
    // A chip drag is a GLOBAL sub-order write regardless of drop kind or target set; dragging
    // also flips the sub-order to Custom (the first-UI-writer pattern).
    if (chipValueOf.has(draggedId)) {
      const value = chipValueOf.get(draggedId)
      const before = drop.beforeId === null ? null : (chipValueOf.get(drop.beforeId) ?? null)
      if (value === undefined || !view.sub_group) return
      onSaveView({
        sub_group: {
          ...view.sub_group,
          order_mode: 'manual',
          order: nextOrder(
            subChips.map((o) => o.value),
            value,
            before,
          ),
        },
      })
      return
    }
    if (drop.kind === 'reorder') {
      if (view.structural_order_mode === 'location') {
        const parentPath =
          drop.targetParentId === null ? source.path : paths.get(drop.targetParentId)
        const siblings = childIds.get(drop.targetParentId) ?? []
        if (!parentPath) return
        void mutate({
          op: 'reorderChildren',
          parentPath,
          key: 'set_order',
          order: nextOrder(siblings, draggedId, drop.beforeId),
        })
        return
      }
      onSaveView({
        group_order: structuralOrderAfterDrop(
          view.group_order ?? [],
          allIds,
          draggedId,
          drop.beforeId,
        ),
      })
      return
    }
    const path = paths.get(draggedId)
    const destPath = drop.targetParentId === null ? source.path : paths.get(drop.targetParentId)
    const destChildren = childIds.get(drop.targetParentId) ?? []
    if (!path || !destPath) return
    const group_order = structuralOrderAfterDrop(
      view.group_order ?? [],
      allIds,
      draggedId,
      drop.beforeId,
    )
    void (async () => {
      if (
        !(await mutate({
          op: 'moveSet',
          path,
          newParentPath: destPath,
          order: reparentFsOrder(destChildren, draggedId),
        }))
      )
        return
      onSaveView({ group_order })
    })()
  }

  const dnd = useGroupingListDrag({ bands, nestable: true, onDrop })
  const subType = subDef?.type === 'status' ? 'status' : 'select'

  const subChipRow = (setId: string, o: (typeof subChips)[number]): React.JSX.Element => {
    const id = subBandId(setId, o.value)
    return (
      <div
        key={o.value}
        ref={dnd.rowRef(id)}
        {...dnd.rowHandle(id)}
        className={cx(
          gp.chipRow,
          gp.subChip,
          hiddenSet?.has(subHiddenKey(o.value)) && hiddenRow,
          dnd.draggingId === id && gp.ghosted,
        )}
      >
        <Chip color={chipColorFor(o.color)} label={o.label} shape={chipShapeForType(subType)} />
        {rowEye(o.label, subHiddenKey(o.value), { hiddenSet, onToggleHidden })}
      </div>
    )
  }

  // The ROW discloses here, so the chevron is decorative and bows to the Hide Chevrons
  // personalization; a leaf takes no spacer in its place.
  const renderSet = (s: SetNode): React.JSX.Element => {
    const body = flat ? subChips.map((o) => subChipRow(s.id, o)) : (s.sets ?? []).map(renderSet)
    const disclosable = body.length > 0
    const isHidden = hiddenSet?.has(s.id) ?? false
    return (
      <DisclosureRow
        key={s.id}
        title={s.title}
        icon={<EntityIcon kind="set" icon={s.icon} size={13} />}
        twisty={disclosable && !hideChevrons ? 'chevron' : 'none'}
        open={expanded.has(s.id)}
        onToggle={() => expanded.toggle(s.id)}
        onClick={disclosable ? () => expanded.toggle(s.id) : undefined}
        selected={dnd.nestTarget === s.id}
        className={cx(flushTrailing, isHidden && hiddenRow)}
        trailing={
          onToggleHidden && (
            <EyeToggle
              hidden={isHidden}
              name={s.title}
              className={isHidden ? undefined : gp.revealEye}
              onToggle={() => onToggleHidden(s.id)}
            />
          )
        }
        wrap={(row) => (
          <SpringableRow
            collapsed={disclosable && !expanded.has(s.id)}
            onExpand={() => expanded.toggle(s.id)}
            className={gp.rowHoverScope}
            refCb={dnd.rowRef(s.id)}
            handle={dnd.rowHandle(s.id)}
            dimmed={dnd.draggingId === s.id}
          >
            {row}
          </SpringableRow>
        )}
      >
        {disclosable ? body : undefined}
      </DisclosureRow>
    )
  }

  const ghostLabel = (): string | null => {
    const id = dnd.draggingId
    if (!id) return null
    if (id.startsWith('sub:')) {
      const value = id.split(':').slice(2).join(':')
      return subChips.find((o) => o.value === value)?.label ?? value
    }
    const bySet = (sets: SetNode[]): string | null => {
      for (const s of sets) {
        if (s.id === id) return s.title
        const hit = bySet(s.sets ?? [])
        if (hit) return hit
      }
      return null
    }
    return bySet(source.sets ?? [])
  }
  return (
    <div ref={dnd.containerRef} className="drop-line-host">
      {(source.sets ?? []).map(renderSet)}
      {dnd.line && <div className={cx('drop-line', gp.dropLineInset)} style={{ top: dnd.line.y }} />}
      <DragGhost x={dnd.ghost?.x ?? null} y={dnd.ghost?.y ?? null} label={ghostLabel()} />
    </div>
  )
}

/** A date grouping's middle region — no finite option list, so the rows are the buckets the
 *  container's values actually produce (plus any hidden key whose bucket has since emptied, so
 *  it can still be unhidden), ordered exactly as the view orders its bands. */
function DateBucketList({
  source,
  view,
  group,
  def,
  schema,
  hiddenSet,
  onToggleHidden,
}: {
  source: CollectionNode | SetNode
  view: SavedView
  group: PropertyGroupConfig
  def: PropertyDefinition | undefined
  schema: PropertyDefinition[]
} & HideControls): React.JSX.Element | null {
  const [values, setValues] = useState<Record<string, PageFrontmatter>>({})
  useEffect(() => {
    let cancelled = false
    void window.nexus.loadValues(source.path).then((v) => {
      if (!cancelled) setValues(v)
    })
    return () => {
      cancelled = true
    }
  }, [source.path])

  const granularity = group.date_granularity ?? 'month'
  const present = new Set<string>()
  for (const row of flattenContainer(source, values).rows) {
    const key = bucketKey(row, group.property_id, schema, granularity)
    if (key) present.add(key)
  }
  // Date bucket keys alone start with a year — the shared hidden list's other vocabularies
  // (option values, set ULIDs, sub/<value>) never do.
  for (const key of view.hidden_groups ?? []) if (/^\d{4}/.test(key)) present.add(key)
  if (present.size === 0) return null

  const dateFormat = view.column_styles?.[group.property_id]?.date_format ?? 'full'
  return (
    <>
      {bucketOrder(group, def, present).map((key) => {
        const label = formatBucketLabel(key, granularity, dateFormat, view.date_separator ?? 'dash')
        return (
          <div key={key} className={cx(gp.chipRow, hiddenSet?.has(key) && hiddenRow)}>
            <span className={gp.subLabel}>{label}</span>
            {rowEye(label, key, { hiddenSet, onToggleHidden })}
          </div>
        )
      })}
    </>
  )
}

/** Location CLEARS the view-level field; a property writes a fresh config — different enough
 *  to stay its own component. */
function SubGroupRow({
  subGroup,
  groupable,
  onSave,
}: {
  subGroup: SubGroupConfig | undefined
  groupable: PropertyDefinition[]
  onSave: (sub: SubGroupConfig | undefined) => void
}): React.JSX.Element {
  const options: PickerChoice<string>[] = [
    { value: '_location', label: 'Location', icon: 'folder' as const },
    ...groupable.map((d) => ({
      value: d.id,
      label: d.name,
      icon: asRenderableIcon(d.icon) ?? propertyTypeIconName(d.type),
    })),
  ]
  return (
    <ValueRow
      icon="layers"
      label="Sub-Group"
      value={subGroup?.property_id ?? '_location'}
      options={options}
      onPick={(v) =>
        onSave(v === '_location' ? undefined : { property_id: v, order_mode: 'configured' })
      }
    />
  )
}
