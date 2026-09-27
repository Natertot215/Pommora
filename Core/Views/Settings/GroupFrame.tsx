import { useMemo } from 'react'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import {
  groupable,
  type PropertyDefinition,
  type PropertyType,
  optionsOf,
} from '@pommora/core/Properties/properties'
import {
  type DateGranularity,
  type GroupConfig,
  type GroupLevel,
  type GroupOrderMode,
  granularityOf,
  hiddenBuckets,
  isBucketHidden,
  type SavedView,
  type StructuralOrderMode,
  type SubGroupConfig,
  toggleHiddenBucket,
  VIEW_KINDS,
  viewOption,
} from '@pommora/core/Views/views'
import {
  DisclosureRow,
  FootingItem,
  MenuRowView,
  MenuSeparator,
  MenuTopRow,
  MenuScrollFrame,
  MenuFooting,
  useDisclosureSet,
  pickerRow,
} from '@pommora/uix/Menus'
import { useDiscloseTarget } from '@pommora/uix/Interactions/dragDisclose'
import { EyeToggle } from '@pommora/uix/Elements/EyeToggle'
import { revealDim } from '@pommora/uix/Interactions/hover-reveal.css'
import { DualSwitch } from '@pommora/uix/Controls/DualSwitch'
import { useSaveView } from '../ViewTileScope'
import { useContainerValues } from '../Host/useContainerValues'
import {
  bucketKey,
  bucketOrder,
  drawnSubGroup,
  flattenContainer,
  groupsStructurally,
} from '../Pipeline/group'
import { formatBucketLabel, NUMERIC_FORMATS } from '../../Properties/formatValue'
import type { Band } from '../Bands/bandDndModel'
import { reparentFsOrder, structuralOrderAfterDrop } from '../Bands/bandDndModel'
import { nextOrder } from '@pommora/uix/Interactions/reorderModel'
import { EntityIcon } from '../../Assets/EntityIcon'
import { cx } from '@pommora/uix/Utilities/cx'
import { useSession, useSetting } from '../../Session/store'
import { PickerControl, type PickerOption } from '@pommora/uix/Pickers/PickerControl'
import { schemaTargets, targetOption } from '../../Properties/Cells/PropertyTypes'
import { useGroupingListDrag, type GroupingDrop } from './groupDnd'
import { hiddenRow, middleRegion, optionRow } from '@pommora/uix/Menus/frames.css'
import * as gp from './group-frame.css'
import * as oo from './option-order.css'
import {
  CustomList,
  type HideControls,
  PropertyPreview,
  type PropertyGroupConfig,
  rowEye,
  SUB_LOOK,
} from './OptionOrderList'
import { OptionChip } from '../../Properties/Cells/OptionChip'
import { useCapitalizeMetadata } from '../../Properties/Cells/columnLabel'
import { styleFor, useNexusForms } from '../Host/useColumnStyles'

const STRUCTURAL_ORDER: PickerOption<StructuralOrderMode>[] = [
  { value: 'custom', label: 'Custom' },
  { value: 'location', label: 'Location' },
]
const OPTION_ORDER: PickerOption<GroupOrderMode>[] = [
  { value: 'configured', label: 'Default' },
  { value: 'reversed', label: 'Reversed' },
  { value: 'manual', label: 'Custom' },
]
const DATE_ORDER: PickerOption<GroupOrderMode>[] = [
  { value: 'configured', label: 'Ascending' },
  { value: 'reversed', label: 'Descending' },
]
const GRANULARITY: PickerOption<DateGranularity>[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
]

const UNGROUPED: PickerOption<'top' | 'bottom'>[] = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
]
const SEPARATION: PickerOption<'dash' | 'slash'>[] = [
  { value: 'dash', label: 'Dash' },
  { value: 'slash', label: 'Slash' },
]

const orderOptionsFor = (type: PropertyType | undefined): PickerOption<GroupOrderMode>[] =>
  type === 'dateTime' ? DATE_ORDER : OPTION_ORDER

export function GroupFrame({
  source,
  view,
  schema,
  label,
  onBack,
}: {
  source: CollectionNode | SetNode
  view: SavedView
  schema: PropertyDefinition[]
  label: string
  onBack: () => void
}): React.JSX.Element {
  const capitalize = useCapitalizeMetadata()
  const nexus = useNexusForms()
  const saveView = useSaveView(source)
  const save = (patch: Partial<SavedView>): void => void saveView({ ...view, ...patch })
  const saveGroup = (group: GroupConfig): void => save({ group })

  const hidden = new Set(view.hidden_groups ?? [])
  const setControls: HideControls = {
    isHidden: (id) => hidden.has(id),
    onToggleHidden: (id) =>
      save({
        hidden_groups: hidden.has(id) ? [...hidden].filter((k) => k !== id) : [...hidden, id],
      }),
  }
  const bucketControls = (level: GroupLevel, propertyId: string): HideControls => ({
    isHidden: (bucket) => isBucketHidden(view, hidden, level, propertyId, bucket),
    onToggleHidden: (bucket) =>
      save({ hidden_groups: toggleHiddenBucket(view, level, propertyId, bucket) }),
  })

  const group = view.group ?? { kind: 'structural' as const }
  const structural = groupsStructurally(group, schema)
  const flat = VIEW_KINDS[view.type].flat
  const propertyOptions = schemaTargets(schema, (d) => groupable(d.type), capitalize).map(
    targetOption,
  )
  const activeDef =
    group.kind === 'property' ? schema.find((d) => d.id === group.property_id) : undefined
  const subGroup = flat ? undefined : drawnSubGroup(view, schema)
  const subDef = subGroup && schema.find((d) => d.id === subGroup.property_id)
  const dateHeadingProp = [activeDef, subDef].find((d) => d?.type === 'dateTime')?.id

  const pickGroupBy = (id: string): void => {
    if (id === 'none') {
      if (group.kind !== 'flat') saveGroup({ kind: 'flat' })
      return
    }
    if (id === 'location') {
      if (group.kind !== 'structural') saveGroup({ kind: 'structural' })
      return
    }
    if (group.kind === 'property' && group.property_id === id) return
    saveGroup({ kind: 'property', property_id: id, order_mode: 'configured' })
  }

  const groupByValue =
    group.kind === 'flat'
      ? 'none'
      : !structural && group.kind === 'property'
        ? group.property_id
        : 'location'
  const groupByOptions: PickerOption<string>[] = [
    ...(flat ? [{ value: 'none', label: 'None', icon: 'circle-off' as const }] : []),
    { value: 'location', label: 'Location', icon: 'folder' as const },
    ...propertyOptions,
  ]

  const saveSub = (sub: SubGroupConfig | undefined): void => save({ sub_group: sub })

  const footings = (
    <MenuFooting>
      <FootingItem
        icon="eye-off"
        label="Hide Empty Groups"
        trailing={
          <DualSwitch
            checked={viewOption(view, 'hide_empty_groups')}
            onChange={(next) => save({ hide_empty_groups: next })}
            ariaLabel="Hide Empty Groups"
          />
        }
      />
      <FootingItem
        icon="folder-minus"
        label="Ungrouped"
        trailing={
          <PickerControl
            ariaLabel="Ungrouped"
            value={viewOption(view, 'ungrouped_placement')}
            options={UNGROUPED}
            onPick={(v) => save({ ungrouped_placement: v })}
          />
        }
      />
      {dateHeadingProp &&
        NUMERIC_FORMATS.has(styleFor(dateHeadingProp, schema, view, nexus).date_format) && (
          <FootingItem
            icon="type"
            label="Separation"
            trailing={
              <PickerControl
                ariaLabel="Separation"
                value={viewOption(view, 'date_separator')}
                options={SEPARATION}
                onPick={(v) => save({ date_separator: v })}
              />
            }
          />
        )}
    </MenuFooting>
  )

  return (
    <MenuScrollFrame
      header={<MenuTopRow label={label} current="Grouping" onBack={onBack} />}
      footer={footings}
    >
      <MenuRowView
        row={pickerRow('layers', 'Group By', groupByValue, groupByOptions, pickGroupBy)}
      />
      {group.kind === 'property' && activeDef?.type === 'dateTime' && (
        <MenuRowView
          row={pickerRow('calendar', 'Date By', granularityOf(group), GRANULARITY, (g) =>
            saveGroup({ ...group, date_granularity: g }),
          )}
        />
      )}
      {!structural && group.kind === 'property' ? (
        <MenuRowView
          row={pickerRow(
            'arrow-up-down',
            'Order',
            group.order_mode,
            orderOptionsFor(activeDef?.type),
            (m) => saveGroup({ ...group, order_mode: m }),
          )}
        />
      ) : (
        <MenuRowView
          row={pickerRow(
            'arrow-up-down',
            'Order',
            viewOption(view, 'structural_order_mode'),
            STRUCTURAL_ORDER,
            (m) => save({ structural_order_mode: m }),
            subGroup ? SUB_LOOK : undefined,
          )}
        />
      )}
      {structural && !flat && (
        <>
          <MenuRowView
            row={pickerRow(
              'layers',
              'Sub-Group',
              subGroup?.property_id ?? '_location',
              [{ value: '_location', label: 'Location', icon: 'folder' }, ...propertyOptions],
              (v) =>
                saveSub(
                  v === '_location' ? undefined : { property_id: v, order_mode: 'configured' },
                ),
            )}
          />
          {subGroup && subDef?.type === 'dateTime' && (
            <MenuRowView
              row={pickerRow('calendar', 'Date By', granularityOf(subGroup), GRANULARITY, (g) =>
                saveSub({ ...subGroup, date_granularity: g }),
              )}
            />
          )}
          {subGroup && (
            <MenuRowView
              row={pickerRow(
                'arrow-up-down',
                'Order',
                subGroup.order_mode,
                orderOptionsFor(subDef?.type),
                (m) => saveSub({ ...subGroup, order_mode: m }),
                SUB_LOOK,
              )}
            />
          )}
        </>
      )}
      <MenuSeparator flush />
      <div className={`${middleRegion} scroll-fade`}>
        {!structural && group.kind === 'property' ? (
          activeDef?.type === 'dateTime' ? (
            <DateBucketList
              source={source}
              view={view}
              group={group}
              def={activeDef}
              schema={schema}
              {...bucketControls('group', group.property_id)}
            />
          ) : group.order_mode === 'manual' ? (
            <CustomList
              group={group}
              def={activeDef}
              onSave={(order) => saveGroup({ ...group, order })}
              {...bucketControls('group', group.property_id)}
            />
          ) : (
            <PropertyPreview
              group={group}
              def={activeDef}
              {...bucketControls('group', group.property_id)}
            />
          )
        ) : (
          <LocationHierarchy
            source={source}
            view={view}
            subDef={subDef}
            onSaveView={save}
            {...setControls}
            subControls={subDef ? bucketControls('sub', subDef.id) : {}}
          />
        )}
      </div>
    </MenuScrollFrame>
  )
}

function SpringableRow({
  collapsed,
  onExpand,
  refCb,
  handle,
  dimmed,
  children,
}: {
  collapsed: boolean
  onExpand: () => void
  refCb: (el: HTMLElement | null) => void
  handle: { onPointerDown: (e: React.PointerEvent) => void }
  dimmed: boolean
  children: React.ReactNode
}): React.JSX.Element {
  const discloseRef = useDiscloseTarget(collapsed && !dimmed, onExpand)
  return (
    <div
      className={dimmed ? oo.ghosted : undefined}
      ref={(node) => {
        discloseRef.current = node
        refCb(node)
      }}
      {...handle}
    >
      {children}
    </div>
  )
}

const subBandId = (setId: string, value: string): string => `sub:${setId}:${value}`

function LocationHierarchy({
  source,
  view,
  subDef,
  onSaveView,
  isHidden,
  onToggleHidden,
  subControls,
}: {
  source: CollectionNode | SetNode
  view: SavedView
  subDef: PropertyDefinition | undefined
  onSaveView: (patch: Partial<SavedView>) => void
  subControls: HideControls
} & HideControls): React.JSX.Element {
  const mutate = useSession((st) => st.mutate)
  const hideChevrons = useSetting('hideChevrons')
  const expanded = useDisclosureSet()
  const subGrouped = subDef !== undefined

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
          if (subGrouped && expanded.has(s.id)) {
            for (const o of subChips)
              bands.push({
                id: chipBandId(s.id, o.value),
                kind: 'property',
                depth: depth + 1,
                parentId: s.id,
              })
          }
        }
        index(s.sets, depth + 1, s.id, visible && !subGrouped && expanded.has(s.id))
      }
    }
    index(source.sets, 0, null, true)
    return { allIds, childIds, paths, bands, chipValueOf }
  }, [source.sets, subGrouped, expanded, subChips])

  const onDrop = (draggedId: string, drop: GroupingDrop): void => {
    if (chipValueOf.has(draggedId)) {
      const value = chipValueOf.get(draggedId)
      const before = drop.beforeId === null ? null : (chipValueOf.get(drop.beforeId) ?? null)
      if (value === undefined || !view.sub_group) return
      if (before === value) return
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
      if (viewOption(view, 'structural_order_mode') === 'location') {
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

  const labelFor = (id: string): string => {
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
    return bySet(source.sets ?? []) ?? id
  }
  const dnd = useGroupingListDrag({
    bands,
    nestable: true,
    labelFor,
    onDrop,
  })

  const subChipRow = (setId: string, o: (typeof subChips)[number]): React.JSX.Element => {
    const id = subBandId(setId, o.value)
    return (
      <div
        key={o.value}
        ref={dnd.rowRef(id)}
        {...dnd.rowHandle(id)}
        className={cx(
          optionRow,
          gp.subChip,
          subControls.isHidden?.(o.value) && hiddenRow,
          dnd.draggingId === id && oo.ghosted,
        )}
      >
        <OptionChip type={subDef?.type ?? ''} option={o} />
        {rowEye(o.label, o.value, subControls)}
      </div>
    )
  }

  const renderSet = (s: SetNode): React.JSX.Element => {
    const body = subGrouped
      ? subChips.map((o) => subChipRow(s.id, o))
      : (s.sets ?? []).map(renderSet)
    const disclosable = body.length > 0
    const setHidden = isHidden?.(s.id) ?? false
    return (
      <DisclosureRow
        key={s.id}
        title={s.title}
        icon={<EntityIcon kind="set" icon={s.icon} size="body" />}
        dropOutline={disclosable && !hideChevrons ? 'chevron' : 'none'}
        open={expanded.has(s.id)}
        onToggle={() => expanded.toggle(s.id)}
        onClick={disclosable ? () => expanded.toggle(s.id) : undefined}
        selected={dnd.nestTarget === s.id}
        className={cx(setHidden && hiddenRow)}
        trailing={
          onToggleHidden && (
            <EyeToggle
              hidden={setHidden}
              name={s.title}
              className={setHidden ? undefined : revealDim}
              onToggle={() => onToggleHidden(s.id)}
            />
          )
        }
        wrap={(row) => (
          <SpringableRow
            collapsed={disclosable && !expanded.has(s.id)}
            onExpand={() => expanded.toggle(s.id)}
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

  return (
    <div ref={dnd.containerRef} className="drop-line-host">
      {(source.sets ?? []).map(renderSet)}
      {dnd.line}
      {dnd.ghost}
    </div>
  )
}

function DateBucketList({
  source,
  view,
  group,
  def,
  schema,
  isHidden,
  onToggleHidden,
}: {
  source: CollectionNode | SetNode
  view: SavedView
  group: PropertyGroupConfig
  def: PropertyDefinition | undefined
  schema: PropertyDefinition[]
} & HideControls): React.JSX.Element | null {
  const { values } = useContainerValues(source.path)
  const nexus = useNexusForms()

  const granularity = granularityOf(group)
  const present = useMemo(() => {
    const set = new Set<string>()
    for (const row of flattenContainer(source, values, {}).rows) {
      const key = bucketKey(row, group.property_id, schema, granularity)
      if (key) set.add(key)
    }
    for (const b of hiddenBuckets(view, 'group', group.property_id)) set.add(b)
    return set
  }, [source, values, group.property_id, schema, granularity, view.hidden_groups])
  if (present.size === 0) return null

  const dateFormat = styleFor(group.property_id, schema, view, nexus).date_format
  return (
    <>
      {bucketOrder(group, def, present).map((key) => {
        const label = formatBucketLabel(
          key,
          granularity,
          dateFormat,
          viewOption(view, 'date_separator'),
        )
        return (
          <div key={key} className={cx(optionRow, isHidden?.(key) && hiddenRow)}>
            <span className={oo.orderLabel}>{label}</span>
            {rowEye(label, key, { isHidden, onToggleHidden })}
          </div>
        )
      })}
    </>
  )
}
