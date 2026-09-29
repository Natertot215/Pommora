import { useMemo } from 'react'
import type { Result } from '@pommora/core/Contract/result'
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
  type ViewPatch,
  viewOption,
} from '@pommora/core/Views/views'
import type { ResolvedGroup } from '@pommora/core/Views/viewRow'
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
  rowDropLine,
} from '@pommora/uix/Menus'
import { LineRow, LineZone } from '@pommora/uix/Interactions/drag'
import { EyeToggle } from '@pommora/uix/Elements/EyeToggle'
import { revealDim } from '@pommora/uix/Interactions/hover-reveal.css'
import { DualSwitch } from '@pommora/uix/Controls/DualSwitch'
import { useSaveView } from '../viewWrite'
import { useContainerValues } from '../Host/useContainerValues'
import {
  bucketKey,
  bucketOrder,
  flattenContainer,
  type GroupPlan,
  groupPlan,
  liveBucketOrder,
  orderedChildren,
  type PropertyGroup,
  subGroupKey,
} from '../Pipeline/group'
import { NUMERIC_FORMATS } from '../../Properties/formatValue'
import {
  bandModelOf,
  dateLabeller,
  headContextOf,
  nodeLabel,
  springsInto,
} from '../Bands/bandModel'
import { type BandDrop, type BandRef, dropBand } from '../Bands/bandRouter'
import { bandSpec } from '../Bands/GroupBand'
import { setIndexOf } from '../Bands/setIndex'
import { dropIO, usePainted } from '../Host/pendingView'
import { EntityIcon } from '../../Assets/EntityIcon'
import { cx } from '@pommora/uix/Utilities/cx'
import { useSetting } from '../../Session/store'
import { PickerControl, type PickerOption } from '@pommora/uix/Pickers/PickerControl'
import { schemaTargets, targetOption } from '../../Properties/Cells/PropertyTypes'
import { hiddenRow, middleRegion, optionRow } from '@pommora/uix/Menus/frames.css'
import * as gp from './group-frame.css'
import * as oo from './option-order.css'
import { type HideControls, OptionOrderList, rowEye, SUB_LOOK } from './OptionOrderList'
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

const pickOrder = <C extends SubGroupConfig>(
  config: C,
  def: PropertyDefinition | undefined,
  mode: GroupOrderMode,
): C =>
  mode !== 'manual'
    ? { ...config, order_mode: mode, order: undefined }
    : config.order_mode !== 'manual'
      ? { ...config, order_mode: mode, order: liveBucketOrder(config, def, []) }
      : config

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
  const save = (patch: Partial<SavedView>): void => void saveView(view, patch)
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
  const nests = VIEW_KINDS[view.type].nests
  const plan = groupPlan(view, schema, nests)
  const propertyOptions = schemaTargets(schema, (d) => groupable(d.type), capitalize).map(
    targetOption,
  )
  const activeDef =
    plan.kind === 'property' ? schema.find((d) => d.id === plan.group.property_id) : undefined
  const subGroup = plan.kind === 'sets' ? plan.sub : undefined
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
    plan.kind === 'none' ? 'none' : plan.kind === 'property' ? plan.group.property_id : 'location'
  const groupByOptions: PickerOption<string>[] = [
    ...(nests ? [] : [{ value: 'none', label: 'None', icon: 'circle-off' as const }]),
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
      {plan.kind === 'property' ? (
        <MenuRowView
          row={pickerRow(
            'arrow-up-down',
            'Order',
            plan.group.order_mode,
            orderOptionsFor(activeDef?.type),
            (m) => saveGroup(pickOrder(plan.group, activeDef, m)),
          )}
        />
      ) : plan.kind === 'sets' ? (
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
      ) : null}
      {plan.kind === 'sets' && plan.nests && (
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
                (m) => saveSub(pickOrder(subGroup, subDef, m)),
                SUB_LOOK,
              )}
            />
          )}
        </>
      )}
      <MenuSeparator flush />
      <div className={`${middleRegion} scroll-fade`}>
        {plan.kind === 'property' ? (
          activeDef?.type === 'dateTime' ? (
            <DateBucketList
              source={source}
              view={view}
              group={plan.group}
              def={activeDef}
              schema={schema}
              {...bucketControls('group', plan.group.property_id)}
            />
          ) : (
            <OptionOrderList
              group={plan.group}
              def={activeDef}
              onSave={(order) => saveGroup({ ...plan.group, order_mode: 'manual', order })}
              {...bucketControls('group', plan.group.property_id)}
            />
          )
        ) : (
          <LocationHierarchy
            source={source}
            view={view}
            plan={plan}
            schema={schema}
            sub={subGroup}
            subDef={subDef}
            persist={(patch) => saveView(view, patch)}
            {...setControls}
            subControls={subDef ? bucketControls('sub', subDef.id) : {}}
          />
        )}
      </div>
    </MenuScrollFrame>
  )
}

function LocationHierarchy({
  source,
  view,
  plan,
  schema,
  sub,
  subDef,
  persist,
  isHidden,
  onToggleHidden,
  subControls,
}: {
  source: CollectionNode | SetNode
  view: SavedView
  plan: GroupPlan
  schema: PropertyDefinition[]
  sub: SubGroupConfig | undefined
  subDef: PropertyDefinition | undefined
  persist: (patch: ViewPatch) => Promise<Result<unknown>>
  subControls: HideControls
} & HideControls): React.JSX.Element {
  const hideChevrons = useSetting('hideChevrons')
  const expanded = useDisclosureSet()
  const nexus = useNexusForms()
  const painted = usePainted(source)
  const sets = setIndexOf(painted)

  const subChips = useMemo(() => {
    if (!sub || !subDef) return []
    const byValue = new Map(optionsOf(subDef).map((o) => [o.value, o]))
    return liveBucketOrder(sub, subDef, []).flatMap((v) => {
      const o = byValue.get(v)
      return o ? [o] : []
    })
  }, [sub, subDef])

  const model = useMemo(() => {
    const walk = (parentKey: string | null): ResolvedGroup[] =>
      orderedChildren(sets, parentKey, plan, view).map(
        (id): ResolvedGroup => ({
          key: id,
          kind: 'set',
          items: [],
          children: subDef
            ? subChips.map(
                (o): ResolvedGroup => ({
                  key: subGroupKey(id, o.value),
                  kind: 'bucket',
                  value: o.value,
                  items: [],
                }),
              )
            : walk(id),
        }),
      )
    return bandModelOf(walk(null), headContextOf(painted, sets, sub, schema, view, nexus))
  }, [painted, sets, plan, sub, subDef, subChips, schema, view, nexus])
  const collapsed = useMemo(
    () => new Set(sets.preorder.filter((id) => !expanded.has(id))),
    [sets, expanded],
  )

  const drop = (dragged: BandRef, to: BandDrop): void => {
    const name = nodeLabel(model.byKey.get(dragged.key))
    void dropBand(
      model,
      dragged,
      to,
      { view, plan, schema, sets, sourcePath: painted.path },
      dropIO(name, persist),
    )
  }

  const subChipRow = (setId: string, o: (typeof subChips)[number]): React.JSX.Element => (
    <LineRow
      key={o.value}
      id={subGroupKey(setId, o.value)}
      className={cx(optionRow, gp.subChip, subControls.isHidden?.(o.value) && hiddenRow)}
    >
      <OptionChip type={subDef?.type ?? ''} option={o} />
      {rowEye(o.value, o.value, subControls)}
    </LineRow>
  )

  const setsIn = (parentKey: string | null): SetNode[] =>
    orderedChildren(sets, parentKey, plan, view).map((id) => sets.node.get(id)!)
  const renderSet = (s: SetNode): React.JSX.Element => {
    const body = subDef ? subChips.map((o) => subChipRow(s.id, o)) : setsIn(s.id).map(renderSet)
    const disclosable = body.length > 0
    const setHidden = isHidden?.(s.id) ?? false
    const node = model.byKey.get(s.id)
    const toggle = (): void => expanded.toggle(s.id)
    return (
      <DisclosureRow
        key={s.id}
        title={s.title}
        icon={<EntityIcon kind="set" icon={s.icon} size="body" />}
        dropOutline={disclosable && !hideChevrons ? 'chevron' : 'none'}
        open={expanded.has(s.id)}
        onToggle={toggle}
        onClick={disclosable ? toggle : undefined}
        className={cx(setHidden && hiddenRow)}
        tabIndex={-1}
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
          <LineRow
            id={s.id}
            spring={
              disclosable && !expanded.has(s.id)
                ? (dragged) => {
                    if (node && springsInto(model, dragged, node, true)) toggle()
                  }
                : undefined
            }
            open={disclosable ? toggle : undefined}
          >
            {row}
          </LineRow>
        )}
      >
        {disclosable ? body : undefined}
      </DisclosureRow>
    )
  }

  return (
    <LineZone
      {...bandSpec({
        bands: model,
        collapsed,
        nests: true,
        drop,
        indent: (depth) => rowDropLine(0, depth),
      })}
    >
      {setsIn(null).map(renderSet)}
    </LineZone>
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
  group: PropertyGroup
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
    // A legacy bare key under this grouping is a date bucket when it starts with a year; a leftover Set id or option value never does.
    for (const key of view.hidden_groups ?? []) if (/^\d{4}/.test(key)) set.add(key)
    return set
  }, [source, values, group.property_id, schema, granularity, view.hidden_groups])
  if (present.size === 0) return null

  const labelOf = dateLabeller(
    view,
    group,
    styleFor(group.property_id, schema, view, nexus).date_format,
  )
  return (
    <>
      {bucketOrder(group, def, present).map((key) => {
        const label = labelOf(key)
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
