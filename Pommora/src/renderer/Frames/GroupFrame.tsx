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
import { Icon } from '@renderer/DesignSystem/Symbols'
import {
  DisclosureRow,
  MenuItem,
  MenuRowView,
  type MenuRow,
  MenuSeparator,
  MenuTopRow,
  MenuScrollFrame,
  MenuFooting,
  useDisclosureSet,
  heading,
} from '@renderer/DesignSystem/Menus'
import { footingLabel, footingSymbol, side } from '@renderer/DesignSystem/Menus/menu-base.css'
import { registerDiscloseTarget } from '@renderer/DesignSystem/Interactions/dragDisclose'
import { EyeToggle } from '@renderer/DesignSystem/Elements/EyeToggle'
import { DualSwitch } from '@renderer/DesignSystem/Controls/Switches/DualSwitch'
import { useSaveView } from '@renderer/SurfacePM/ViewTileScope'
import { declaredType } from '@renderer/Properties/value'
import {
  bucketKey,
  bucketOrder,
  flattenContainer,
  groupsStructurally,
  subHiddenKey,
} from '@renderer/Views/Pipeline/group'
import { formatBucketLabel, NUMERIC_FORMATS } from '@renderer/Properties/Assignment/formatValue'
import type { Band } from '@renderer/Views/bandDndModel'
import { reparentFsOrder, structuralOrderAfterDrop } from '@renderer/Views/bandDndModel'
import { nextOrder } from '@renderer/Sidebar/sidebarDndModel'
import { EntityIcon } from '@renderer/Utilities/EntityIcon'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { useSession } from '../store'
import type { PickerChoice } from '@renderer/DesignSystem/Elements/PickerControl'
import { propertyIcon } from '../Properties/PropertyTypes'
import { useGroupingListDrag, type GroupingDrop } from './groupDnd'
import { hiddenRow, optionRow } from './frames.css'
import * as gp from './groupFrame.css'
import { OptionChip } from '@renderer/Properties/Assignment/OptionChip'

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

const pickerRow = <T extends string>(
  glyph: string,
  label: string,
  value: T,
  options: readonly PickerChoice<T>[],
  onPick: (v: T) => void,
  sub = false,
): MenuRow => ({
  kind: 'item',
  icon: <Icon name={glyph} size="body" />,
  label: sub ? <span className={gp.subLabel}>{label}</span> : label,
  trailing: { kind: 'picker', ariaLabel: label, value, options, onPick },
  className: sub ? gp.subRow : undefined,
})

export function GroupFrame({
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
  label: string
  subGrouping?: boolean
  onBack: () => void
}): React.JSX.Element {
  const saveView = useSaveView(source)
  const save = (patch: Partial<SavedView>): void => void saveView({ ...view, ...patch })
  const saveGroup = (group: GroupConfig): void => save({ group })

  const hiddenSet = new Set(view.hidden_groups ?? [])
  const toggleHidden = (key: string): void =>
    save({
      hidden_groups: hiddenSet.has(key)
        ? (view.hidden_groups ?? []).filter((k) => k !== key)
        : [...(view.hidden_groups ?? []), key],
    })

  const group = view.group ?? { kind: 'structural' as const }
  const structural = groupsStructurally(group, schema)
  const groupable = schema.filter((d) => GROUPABLE_PANE.has(declaredType(d.id, schema) ?? ''))
  const activeDef =
    group.kind === 'property' ? schema.find((d) => d.id === group.property_id) : undefined
  const subGroup = structural && subGrouping ? view.sub_group : undefined
  const dateHeadingProp =
    group.kind === 'property' && declaredType(group.property_id, schema) === 'datetime'
      ? group.property_id
      : subGroup && declaredType(subGroup.property_id, schema) === 'datetime'
        ? subGroup.property_id
        : undefined

  const pickGroupBy = (target: 'location' | 'none' | PropertyDefinition): void => {
    if (target === 'none') {
      if (group.kind !== 'flat') saveGroup({ kind: 'flat' })
      return
    }
    if (target === 'location') {
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

  const groupByValue =
    group.kind === 'flat'
      ? 'none'
      : !structural && group.kind === 'property'
        ? group.property_id
        : 'location'
  const groupByOptions: PickerChoice<string>[] = [
    ...(view.type === 'cards'
      ? [{ value: 'none', label: 'None', icon: 'circle-off' as const }]
      : []),
    { value: 'location', label: 'Location', icon: 'folder' as const },
    ...groupable.map((d) => ({
      value: d.id,
      label: d.name,
      icon: propertyIcon(d),
    })),
  ]
  const pickGroupByValue = (v: string): void => {
    if (v === 'none' || v === 'location') {
      pickGroupBy(v)
      return
    }
    const def = groupable.find((d) => d.id === v)
    if (def) pickGroupBy(def)
  }

  const saveSub = (sub: SubGroupConfig | undefined): void => save({ sub_group: sub })
  const hideEmpty = view.hide_empty_groups ?? (group.kind === 'property' && group.hide_empty_groups)

  const footings = (
    <MenuFooting>
      <MenuItem
        leading={
          <span className={footingSymbol}>
            <Icon name="eye-off" size="control" />
          </span>
        }
        trailing={
          <DualSwitch
            checked={hideEmpty}
            onChange={(next) => save({ hide_empty_groups: next })}
            ariaLabel="Hide Empty Groups"
          />
        }
      >
        <span className={footingLabel}>Hide Empty Groups</span>
      </MenuItem>
      <MenuRowView
        row={{
          kind: 'item',
          icon: (
            <span className={footingSymbol}>
              <Icon name="folder-minus" size="control" />
            </span>
          ),
          label: <span className={footingLabel}>Ungrouped</span>,
          trailing: {
            kind: 'picker',
            ariaLabel: 'Ungrouped',
            value: view.ungrouped_placement ?? 'bottom',
            options: [
              { value: 'top', label: 'Top' },
              { value: 'bottom', label: 'Bottom' },
            ],
            onPick: (v: 'top' | 'bottom') => save({ ungrouped_placement: v }),
          },
        }}
      />
      {dateHeadingProp &&
        NUMERIC_FORMATS.has(view.column_styles?.[dateHeadingProp]?.date_format ?? 'full') && (
          <MenuRowView
            row={{
              kind: 'item',
              icon: (
                <span className={footingSymbol}>
                  <Icon name="type" size="control" />
                </span>
              ),
              label: <span className={footingLabel}>Separation</span>,
              trailing: {
                kind: 'picker',
                ariaLabel: 'Separation',
                value: view.date_separator ?? 'dash',
                options: [
                  { value: 'dash', label: 'Dash' },
                  { value: 'slash', label: 'Slash' },
                ],
                onPick: (v: 'dash' | 'slash') => save({ date_separator: v }),
              },
            }}
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
        row={pickerRow('layers', 'Group By', groupByValue, groupByOptions, pickGroupByValue)}
      />
      {group.kind === 'property' && declaredType(group.property_id, schema) === 'datetime' && (
        <MenuRowView
          row={pickerRow(
            'calendar',
            'Date By',
            group.date_granularity ?? 'month',
            GRANULARITY,
            (g) => saveGroup({ ...group, date_granularity: g }),
          )}
        />
      )}
      {!structural && group.kind === 'property' ? (
        <MenuRowView
          row={pickerRow(
            'arrow-up-down',
            'Order',
            group.order_mode,
            orderOptionsFor(declaredType(group.property_id, schema)),
            (m) => saveGroup({ ...group, order_mode: m }),
          )}
        />
      ) : (
        <MenuRowView
          row={pickerRow(
            'arrow-up-down',
            'Order',
            view.structural_order_mode ?? 'custom',
            STRUCTURAL_ORDER,
            (m) => save({ structural_order_mode: m }),
            Boolean(subGroup),
          )}
        />
      )}
      {structural && subGrouping && (
        <>
          <SubGroupRow subGroup={subGroup} groupable={groupable} onSave={saveSub} />
          {subGroup && declaredType(subGroup.property_id, schema) === 'datetime' && (
            <MenuRowView
              row={pickerRow(
                'calendar',
                'Date By',
                subGroup.date_granularity ?? 'month',
                GRANULARITY,
                (g) => saveSub({ ...subGroup, date_granularity: g }),
              )}
            />
          )}
          {subGroup && (
            <MenuRowView
              row={pickerRow(
                'arrow-up-down',
                'Order',
                subGroup.order_mode,
                orderOptionsFor(declaredType(subGroup.property_id, schema)),
                (m) => saveSub({ ...subGroup, order_mode: m }),
                true,
              )}
            />
          )}
        </>
      )}
      <MenuSeparator flush />
      <div className={`${gp.middle} over-scroll`}>
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
    </MenuScrollFrame>
  )
}

export const optionsOf = (
  def: PropertyDefinition | undefined,
): { value: string; label: string; color?: string }[] => def?.select_options ?? statusOptions(def)

type PropertyGroupConfig = Extract<GroupConfig, { kind: 'property' }>

interface HideControls {
  hiddenSet?: ReadonlySet<string>
  onToggleHidden?: (key: string) => void
}

function rowEye(
  label: string,
  hideKey: string,
  { hiddenSet, onToggleHidden }: HideControls,
): React.JSX.Element | null {
  if (!onToggleHidden) return null
  return (
    <span className={side}>
      <EyeToggle
        hidden={hiddenSet?.has(hideKey) ?? false}
        name={label}
        onToggle={() => onToggleHidden(hideKey)}
      />
    </span>
  )
}

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
    <div key={o.value} className={cx(optionRow, hiddenSet?.has(o.value) && hiddenRow)}>
      <OptionChip type={type} option={o} />
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
            <div className={heading}>{g.label}</div>
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
    labelFor: (id) => byValue.get(id)?.label ?? id,
    lineClassName: gp.dropLineInset,
    onDrop: (draggedId, drop) => onSave(nextOrder(ordered, draggedId, drop.beforeId)),
  })
  if (!def) return null
  const type = def.type === 'status' ? 'status' : 'select'
  return (
    <div ref={dnd.containerRef} className="drop-line-host">
      <div className={heading}>Options</div>
      {ordered.flatMap((v) => {
        const o = byValue.get(v)
        if (!o) return []
        return [
          <div
            key={v}
            ref={dnd.rowRef(v)}
            {...dnd.rowHandle(v)}
            className={cx(
              optionRow,
              hiddenSet?.has(v) && hiddenRow,
              dnd.draggingId === v && gp.ghosted,
            )}
          >
            <OptionChip type={type} option={o} />
            {rowEye(o.label, v, { hiddenSet, onToggleHidden })}
          </div>,
        ]
      })}
      {dnd.line}
      {dnd.ghost}
    </div>
  )
}

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

const subBandId = (setId: string, value: string): string => `sub:${setId}:${value}`

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
    lineClassName: gp.dropLineInset,
    onDrop,
  })
  const subType = subDef?.type === 'status' ? 'status' : 'select'

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
          hiddenSet?.has(subHiddenKey(o.value)) && hiddenRow,
          dnd.draggingId === id && gp.ghosted,
        )}
      >
        <OptionChip type={subType} option={o} />
        {rowEye(o.label, subHiddenKey(o.value), { hiddenSet, onToggleHidden })}
      </div>
    )
  }

  const renderSet = (s: SetNode): React.JSX.Element => {
    const body = flat ? subChips.map((o) => subChipRow(s.id, o)) : (s.sets ?? []).map(renderSet)
    const disclosable = body.length > 0
    const isHidden = hiddenSet?.has(s.id) ?? false
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
        className={cx(isHidden && hiddenRow)}
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
    let canceled = false
    void window.nexus.loadValues(source.path).then((v) => {
      if (!canceled) setValues(v)
    })
    return () => {
      canceled = true
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
          <div key={key} className={cx(optionRow, hiddenSet?.has(key) && hiddenRow)}>
            <span className={gp.subLabel}>{label}</span>
            {rowEye(label, key, { hiddenSet, onToggleHidden })}
          </div>
        )
      })}
    </>
  )
}

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
      icon: propertyIcon(d),
    })),
  ]
  return (
    <MenuRowView
      row={pickerRow('layers', 'Sub-Group', subGroup?.property_id ?? '_location', options, (v) =>
        onSave(v === '_location' ? undefined : { property_id: v, order_mode: 'configured' }),
      )}
    />
  )
}
