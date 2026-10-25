import { useMemo } from 'react'
import type { Result } from '../../Contract/result'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import type { PropertyDefinition, SelectOption } from '../../Properties/properties'
import { findOption } from '../../Properties/propertyValue'
import {
  bandKey,
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
} from '../views'
import type { ResolvedColumn, ResolvedGroup } from '../viewRow'
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
  menuDropLine,
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
  type Grouping,
  groupPlan,
  liveBucketOrder,
  orderedChildren,
  type PropertyGroup,
} from '../Pipeline/group'
import { NUMERIC_FORMATS } from '../../Properties/formatValue'
import { bandModelOf, dateLabeller, nodeLabel, springsInto } from '../Bands/bandModel'
import { bandRouting } from '../Bands/bandRouter'
import { bandSpec } from '../Bands/GroupBand'
import { dropIO } from '../Host/pendingView'
import { useBandHeads } from '../Host/useBandHeads'
import { EntityIcon } from '../../Assets/EntityIcon'
import { cx } from '@pommora/uix/Utilities/cx'
import { useSetting } from '../../Session/store'
import { PickerControl, type PickerOption } from '@pommora/uix/Pickers/PickerControl'
import { FILEDATA_TARGETS, schemaTargets, targetOption } from '../paneTargets'
import {
  chipRegion,
  hiddenRow,
  middleRegion,
  optionRow,
  VIEW_SETTINGS_MAX_HEIGHT,
} from '@pommora/uix/Menus/frames.css'
import * as gp from './group-frame.css'
import * as oo from './option-order.css'
import { OptionOrderList } from './OptionOrderList'
import { type HideControls, rowEye, SUB_LOOK } from './paneRows'
import { OptionChip } from '../../Properties/Cells/OptionChip'
import { styleFor, useNexusForms } from '../Host/useColumnStyles'
import { groupable } from '../valueKinds'

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

const orderOptionsFor = (byDate: boolean): PickerOption<GroupOrderMode>[] =>
  byDate ? DATE_ORDER : OPTION_ORDER

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
  const nexus = useNexusForms()
  const saveView = useSaveView(source)
  const save = (patch: Partial<SavedView>): void => void saveView(view, patch)
  const saveGroup = (group: GroupConfig): void => save({ group })

  const held = view.hidden_groups ?? []
  const hidden = new Set(held)
  const setControls: HideControls = {
    isHidden: (id) => hidden.has(id),
    onToggleHidden: (id) =>
      save({
        hidden_groups: hidden.has(id) ? [...hidden].filter((k) => k !== id) : [...hidden, id],
      }),
  }
  const bucketControls = (level: GroupLevel, propertyId: string): HideControls => ({
    isHidden: (bucket) => isBucketHidden(hidden, level, propertyId, bucket),
    onToggleHidden: (bucket) =>
      save({ hidden_groups: toggleHiddenBucket(held, level, propertyId, bucket) }),
  })

  const group = view.group ?? { kind: 'structural' as const }
  const nests = VIEW_KINDS[view.type].nests
  const plan = useMemo(() => groupPlan(view, schema, nests), [view, schema, nests])
  const propertyOptions = schemaTargets(schema, (d) => groupable(d.type)).map(targetOption)
  const activeDef = plan.kind === 'property' ? plan.group.column.def : undefined
  const sub = plan.kind === 'sets' ? plan.sub : undefined
  const subGroup = sub?.config
  const subDef = sub?.column.def
  const topByDate = activeDef?.type === 'dateTime'
  const subByDate = subDef?.type === 'dateTime'
  const dateColumn =
    plan.kind === 'property' && topByDate ? plan.group.column : subByDate ? sub?.column : undefined

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
    plan.kind === 'none'
      ? 'none'
      : plan.kind === 'property'
        ? plan.group.config.property_id
        : 'location'
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
      {dateColumn && NUMERIC_FORMATS.has(styleFor(dateColumn, view, nexus).date_format) && (
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
      maxHeight={VIEW_SETTINGS_MAX_HEIGHT}
    >
      <MenuRowView
        row={pickerRow('layers', 'Group By', groupByValue, groupByOptions, pickGroupBy)}
      />
      {group.kind === 'property' && topByDate && (
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
            plan.group.config.order_mode,
            orderOptionsFor(topByDate),
            (m) => saveGroup(pickOrder(plan.group.config, activeDef, m)),
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
              subGroup?.property_id ?? FILEDATA_TARGETS.location.id,
              [targetOption(FILEDATA_TARGETS.location), ...propertyOptions],
              (v) =>
                saveSub(
                  v === FILEDATA_TARGETS.location.id
                    ? undefined
                    : { property_id: v, order_mode: 'configured' },
                ),
            )}
          />
          {subGroup && subByDate && (
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
                orderOptionsFor(subByDate),
                (m) => saveSub(pickOrder(subGroup, subDef, m)),
                SUB_LOOK,
              )}
            />
          )}
        </>
      )}
      <MenuSeparator flush />
      <div
        className={cx(
          middleRegion,
          plan.kind === 'property' && !topByDate && chipRegion,
          'scroll-fade',
        )}
      >
        {plan.kind === 'property' ? (
          topByDate ? (
            <DateBucketList
              source={source}
              view={view}
              group={plan.group.config}
              column={plan.group.column}
              {...bucketControls('group', plan.group.config.property_id)}
            />
          ) : (
            <OptionOrderList
              group={plan.group.config}
              def={activeDef}
              onSave={(order) => saveGroup({ ...plan.group.config, order_mode: 'manual', order })}
              {...bucketControls('group', plan.group.config.property_id)}
            />
          )
        ) : (
          <LocationHierarchy
            source={source}
            view={view}
            plan={plan}
            sub={sub}
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
  sub,
  persist,
  isHidden,
  onToggleHidden,
  subControls,
}: {
  source: CollectionNode | SetNode
  view: SavedView
  plan: GroupPlan
  sub: Grouping | undefined
  persist: (patch: ViewPatch) => Promise<Result<unknown>>
  subControls: HideControls
} & HideControls): React.JSX.Element {
  const hideChevrons = useSetting('hideChevrons')
  const expanded = useDisclosureSet()
  const { painted, sets, heads } = useBandHeads(source, sub, view)
  const subDef = sub?.column.def

  const subChips = useMemo(() => {
    if (!sub || !subDef) return []
    return liveBucketOrder(sub.config, subDef, []).flatMap((v) => {
      const o = findOption(subDef, v)
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
                  key: bandKey(subDef.id, o.id, id),
                  kind: 'bucket',
                  value: o.id,
                  items: [],
                }),
              )
            : walk(id),
        }),
      )
    return bandModelOf(walk(null), heads)
  }, [heads, sets, plan, subDef, subChips, view])
  const collapsed = useMemo(
    () => new Set(sets.preorder.filter((id) => !expanded.has(id))),
    [sets, expanded],
  )

  const base = { view, plan, sets, sourcePath: painted.path }
  const routing = bandRouting(model, base, (dragged) =>
    dropIO(nodeLabel(model.byKey.get(dragged.key)), persist),
  )

  const subChipRow = (
    setId: string,
    o: SelectOption,
    def: PropertyDefinition,
  ): React.JSX.Element => (
    <LineRow
      key={o.id}
      id={bandKey(def.id, o.id, setId)}
      className={cx(optionRow, gp.subChip, subControls.isHidden?.(o.id) && hiddenRow)}
    >
      <OptionChip type={def.type} option={o} />
      {rowEye(o.label, o.id, subControls)}
    </LineRow>
  )

  const setsIn = (parentKey: string | null): SetNode[] =>
    orderedChildren(sets, parentKey, plan, view).map((id) => sets.node.get(id)!)
  const renderSet = (s: SetNode): React.JSX.Element => {
    const body = subDef
      ? subChips.map((o) => subChipRow(s.id, o, subDef))
      : setsIn(s.id).map(renderSet)
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
        routing,
        indent: (depth) => menuDropLine({ edge: 0, depth }),
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
  column,
  isHidden,
  onToggleHidden,
}: {
  source: CollectionNode | SetNode
  view: SavedView
  group: PropertyGroup
  column: ResolvedColumn
} & HideControls): React.JSX.Element | null {
  // The Settings frame mounts from the toolbar and beside a tile's view host, never under one, so the list reads the container's values itself.
  const { values } = useContainerValues(source.path)
  const nexus = useNexusForms()

  const granularity = granularityOf(group)
  const present = useMemo(() => {
    const set = new Set<string>()
    for (const row of flattenContainer(source, values, {}).rows) {
      const key = bucketKey(row, column, granularity)
      if (key) set.add(key)
    }
    for (const b of hiddenBuckets(view.hidden_groups ?? [], 'group', group.property_id)) set.add(b)
    return set
  }, [source, values, group.property_id, column, granularity, view.hidden_groups])
  if (present.size === 0) return null

  const labelOf = dateLabeller(view, group, styleFor(column, view, nexus).date_format)
  return (
    <>
      {bucketOrder(group, column.def, present).map((key) => {
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
