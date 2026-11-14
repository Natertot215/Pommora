import { useMemo } from 'react'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import type { PropertyDefinition, SelectOption, ResolvedColumn } from '../../Properties/properties'
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
  type ViewFlag,
  type ViewWriter,
  viewOption,
} from '../views'
import { type ResolvedGroup, flattenContainer } from '../viewRow'
import { presentedKind } from '../Host/viewKinds'
import { DisclosureRow, useDisclosureSet } from '@pommora/uix/Menus/DisclosureRow'
import { navigationTree } from '@pommora/uix/Elements/disclosure.css'
import { MenuRowView, pickerRow } from '@pommora/uix/Menus/MenuIndex'
import {
  FootingItem,
  MenuSeparator,
  MenuTopRow,
  MenuScrollFrame,
  MenuFooting,
  menuDropLine,
} from '@pommora/uix/Menus/MenuRows'
import { LineRow, LineZone } from '@pommora/uix/Interactions/drag'
import { DualSwitch } from '@pommora/uix/Controls/DualSwitch'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import type { IconName } from '@pommora/uix/Symbols'
import { useContainerValues } from '../Host/useContainerValues'
import {
  bucketGroupingOf,
  bucketKey,
  bucketOrder,
  type GroupPlan,
  type Grouping,
  groupPlan,
  liveBucketOrder,
  orderSetTree,
  type PropertyGroup,
  viewSetOrder,
} from '../Pipeline/group'
import { NUMERIC_FORMATS } from '../../Properties/formatValue'
import { bandModelOf, dateLabeller, nodeLabel, springsInto } from '../Bands/bandModel'
import { bandRouting } from '../Bands/bandRouter'
import { bandSpec } from '../Bands/GroupBand'
import { dropIO } from '../Host/liveView'
import { useBandSource } from '../Bands/useBandSource'
import { EntityIcon } from '../../Assets/EntityIcon'
import { cx } from '@pommora/uix/Utilities/cx'
import { useDateForms } from '../../Session/store'
import { PickerControl, type PickerOption } from '@pommora/uix/Menus/PickerControl'
import { FILEDATA_TARGETS, NONE_OPTION, schemaTargets } from '../paneTargets'
import {
  chipRegion,
  hiddenRow,
  middleRegion,
  SETTINGS_PANE_MAX_HEIGHT,
} from '@pommora/uix/Menus/frames.css'
import * as oo from './option-order.css'
import {
  type HideControls,
  HideableRow,
  hideEye,
  OptionOrderList,
  orderOptions,
  SUB_LOOK,
} from './OptionOrderList'
import { OptionChip } from '../../Properties/Cells/OptionChip'
import { styleFor } from '../../Properties/columnStyles'
import { groupable } from '../valueKinds'
import type { PaneProps } from './ViewPane'

const STRUCTURAL_ORDER: PickerOption<StructuralOrderMode>[] = [
  { value: 'custom', label: 'Custom' },
  { value: 'location', label: 'Location' },
]
const GROUP_ORDERS = ['configured', 'reversed', 'manual'] as const
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
  back,
  save,
}: PaneProps & { source: CollectionNode | SetNode }): React.JSX.Element {
  const forms = useDateForms()
  const saveGroup = (group: GroupConfig): void => void save({ group })

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
  const { nests, outlines } = presentedKind(view.type)
  const plan = useMemo(() => groupPlan(view, schema, nests), [view, schema, nests])
  const propertyOptions = schemaTargets(schema, (d) => groupable(d.type))
  const activeDef = plan.kind === 'property' ? plan.group.column.def : undefined
  const sub = plan.kind === 'sets' ? plan.sub : undefined
  const subGroup = sub?.config
  const subDef = sub?.column.def
  const topByDate = activeDef?.type === 'dateTime'
  const subByDate = subDef?.type === 'dateTime'
  const bucketColumn = bucketGroupingOf(plan)?.column
  const dateColumn = topByDate || subByDate ? bucketColumn : undefined

  const pickGroupBy = (id: string): void => {
    if (id === NONE_OPTION.value) {
      if (group.kind !== 'flat') saveGroup({ kind: 'flat' })
      return
    }
    if (id === FILEDATA_TARGETS.location.value) {
      if (group.kind !== 'structural') saveGroup({ kind: 'structural' })
      return
    }
    if (group.kind === 'property' && group.property_id === id) return
    saveGroup({ kind: 'property', property_id: id, order_mode: 'configured' })
  }

  const groupByValue =
    plan.kind === 'none'
      ? NONE_OPTION.value
      : plan.kind === 'property'
        ? plan.group.config.property_id
        : FILEDATA_TARGETS.location.value
  const groupByOptions: PickerOption<string>[] = [
    ...(nests && plan.kind !== 'none' ? [] : [NONE_OPTION]),
    FILEDATA_TARGETS.location,
    ...propertyOptions,
  ]

  const saveSub = (sub: SubGroupConfig | undefined): void => void save({ sub_group: sub })

  const switchFooting = (icon: IconName, label: string, key: ViewFlag): React.JSX.Element => (
    <FootingItem
      icon={icon}
      label={label}
      trailing={
        <DualSwitch
          checked={viewOption(view, key)}
          onChange={(next) => save({ [key]: next })}
          ariaLabel={label}
        />
      }
    />
  )
  const footings = (
    <MenuFooting>
      {switchFooting('eye-off', 'Hide Empty Groups', 'hide_empty_groups')}
      <Reveal
        open={outlines && !viewOption(view, 'hide_outlines') && !!bucketColumn && !dateColumn}
        fill
      >
        {switchFooting('palette', 'Colored Outlines', 'colored_outlines')}
      </Reveal>
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
      <Reveal
        open={!!dateColumn && NUMERIC_FORMATS.has(styleFor(dateColumn, view, forms).date_format)}
        fill
      >
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
      </Reveal>
    </MenuFooting>
  )

  return (
    <MenuScrollFrame
      header={<MenuTopRow {...back} current="Grouping" />}
      footer={footings}
      maxHeight={SETTINGS_PANE_MAX_HEIGHT}
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
            'arrow-down-up',
            'Order',
            plan.group.config.order_mode,
            orderOptions(plan.group.column, GROUP_ORDERS),
            (m) => saveGroup(pickOrder(plan.group.config, activeDef, m)),
          )}
        />
      ) : plan.kind === 'sets' ? (
        <MenuRowView
          row={pickerRow(
            'folder',
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
              subGroup?.property_id ?? FILEDATA_TARGETS.location.value,
              [FILEDATA_TARGETS.location, ...propertyOptions],
              (v) =>
                saveSub(
                  v === FILEDATA_TARGETS.location.value
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
                'arrow-down-up',
                'Order',
                subGroup.order_mode,
                orderOptions(sub?.column, GROUP_ORDERS),
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
              hide={bucketControls('group', plan.group.config.property_id)}
            />
          ) : (
            <OptionOrderList
              group={plan.group.config}
              def={activeDef}
              onSave={(order) => saveGroup({ ...plan.group.config, order_mode: 'manual', order })}
              hide={bucketControls('group', plan.group.config.property_id)}
            />
          )
        ) : (
          <LocationHierarchy
            source={source}
            view={view}
            plan={plan}
            sub={sub}
            save={save}
            hide={setControls}
            subHide={subDef ? bucketControls('sub', subDef.id) : undefined}
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
  save,
  hide,
  subHide,
}: {
  source: CollectionNode | SetNode
  view: SavedView
  plan: GroupPlan
  sub: Grouping | undefined
  save: ViewWriter
  hide: HideControls
  subHide?: HideControls
}): React.JSX.Element {
  const expanded = useDisclosureSet()
  const { painted, sets, heads } = useBandSource(source, sub, view)
  const subDef = sub?.column.def

  const subChips = useMemo(() => {
    if (!sub || !subDef) return []
    return liveBucketOrder(sub.config, subDef, []).flatMap((v) => {
      const o = findOption(subDef, v)
      return o ? [o] : []
    })
  }, [sub, subDef])

  const ordered = useMemo(
    () => orderSetTree(painted.sets ?? [], viewSetOrder(plan, view)),
    [painted.sets, plan, view],
  )
  const model = useMemo(() => {
    const walk = (nodes: SetNode[]): ResolvedGroup[] =>
      nodes.map(
        (s): ResolvedGroup => ({
          key: s.id,
          kind: 'set',
          items: [],
          children: subDef
            ? subChips.map(
                (o): ResolvedGroup => ({
                  key: bandKey(subDef.id, o.id, s.id),
                  kind: 'bucket',
                  value: o.id,
                  items: [],
                }),
              )
            : walk(s.sets ?? []),
        }),
      )
    return bandModelOf(walk(ordered), heads)
  }, [heads, ordered, subDef, subChips])

  const routing = bandRouting(
    { view, plan, sets, sourcePath: painted.path, bands: model },
    (dragged, prior) =>
      dropIO(
        { id: dragged.key, name: nodeLabel(model.byKey.get(dragged.key)), prior },
        { source, view, persistView: save },
      ),
  )

  const subChipRow = (
    setId: string,
    o: SelectOption,
    def: PropertyDefinition,
  ): React.JSX.Element => (
    <HideableRow
      key={o.id}
      line={bandKey(def.id, o.id, setId)}
      hideKey={o.id}
      label={o.label}
      hide={subHide}
      className={oo.subChip}
    >
      <OptionChip type={def.type} option={o} />
    </HideableRow>
  )

  const renderSet = (s: SetNode): React.JSX.Element => {
    const body = subDef
      ? subChips.map((o) => subChipRow(s.id, o, subDef))
      : (s.sets ?? []).map(renderSet)
    const disclosable = body.length > 0
    const setHidden = hide.isHidden(s.id)
    const node = model.byKey.get(s.id)
    const toggle = (): void => expanded.toggle(s.id)
    return (
      <DisclosureRow
        key={s.id}
        title={s.title}
        icon={<EntityIcon kind="set" icon={s.icon} size="body" />}
        chevron={disclosable ? 'chevron' : 'none'}
        open={expanded.isOpen(s.id)}
        onToggle={toggle}
        onClick={disclosable ? toggle : undefined}
        className={cx(setHidden && hiddenRow)}
        tabIndex={-1}
        trailing={hideEye(s.title, s.id, hide)}
        wrap={(row) => (
          <LineRow
            id={s.id}
            spring={
              disclosable && !expanded.isOpen(s.id)
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
      className={navigationTree}
      {...bandSpec({
        bands: model,
        disclosure: expanded,
        // The pane's tree arranges the folders themselves, so a Set drops into a Set whatever the view's kind draws.
        nests: true,
        routing,
        indent: (depth) => menuDropLine({ edge: 0, depth }),
      })}
    >
      {ordered.map(renderSet)}
    </LineZone>
  )
}

function DateBucketList({
  source,
  view,
  group,
  column,
  hide,
}: {
  source: CollectionNode | SetNode
  view: SavedView
  group: PropertyGroup
  column: ResolvedColumn
  hide: HideControls
}): React.JSX.Element | null {
  // The Settings frame mounts from the toolbar and beside a tile's view host, never under one, so the list reads the container's values itself.
  const { values } = useContainerValues(source.path)
  const forms = useDateForms()

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

  const labelOf = dateLabeller(view, group, styleFor(column, view, forms).date_format)
  return (
    <>
      {bucketOrder(group, column.def, present).map((key) => {
        const label = labelOf(key)
        return (
          <HideableRow key={key} hideKey={key} label={label} hide={hide}>
            <span className={oo.orderLabel}>{label}</span>
          </HideableRow>
        )
      })}
    </>
  )
}
