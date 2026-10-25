import type { CollectionNode, SetNode } from '../../Nexus/tree'
import type { PropertyDefinition } from '../../Properties/properties'
import { LOCATION_SORT, type SavedView, type SortCriterion, VIEW_KINDS, viewOption } from '../views'
import {
  MenuRowView,
  MenuScrollFrame,
  MenuTopRow,
  MenuSeparator,
  pickerRow,
} from '@pommora/uix/Menus'
import { useSaveView } from '../viewWrite'
import { resolveColumn } from '../Pipeline/columns'
import { contextIdsOf } from '../../Contexts/contextIdentity'
import { useSession } from '../../Session/store'
import type { PickerOption } from '@pommora/uix/Pickers/PickerControl'
import { OptionOrderList } from './OptionOrderList'
import { SUB_LOOK } from './paneRows'
import { liveBucketOrder } from '../Pipeline/group'
import { FILEDATA_TARGETS, schemaTargets, targetOption } from '../paneTargets'
import { chipRegion, middleRegion, VIEW_SETTINGS_MAX_HEIGHT } from '@pommora/uix/Menus/frames.css'
import { type SortDirections, viewSpecOf } from '../valueKinds'

type Direction = SortCriterion['direction']

// Each family's words for the two directions; a criterion whose property is gone reads a value's.
const DIRECTIONS: Record<SortDirections, PickerOption<Direction>[]> = {
  option: [
    { value: 'ascending', label: 'Default' },
    { value: 'descending', label: 'Reversed' },
  ],
  text: [
    { value: 'ascending', label: 'A → Z' },
    { value: 'descending', label: 'Z → A' },
  ],
  value: [
    { value: 'ascending', label: 'Ascending' },
    { value: 'descending', label: 'Descending' },
  ],
}
type OrderChoice = Direction | 'custom'
const CUSTOM_OPTION_DIRECTIONS: PickerOption<OrderChoice>[] = [
  ...DIRECTIONS.option,
  { value: 'custom', label: 'Custom' },
]
const LOCATION_ORDERS: PickerOption<'location' | 'custom'>[] = [
  { value: 'location', label: 'Location' },
  { value: 'custom', label: 'Custom' },
]

function directionOptions(
  propertyId: string,
  schema: PropertyDefinition[],
  contextIds: readonly string[],
): PickerOption<Direction>[] {
  const column = resolveColumn(propertyId, schema, contextIds)
  return DIRECTIONS[viewSpecOf(column?.type)?.directions ?? 'value']
}

export function SortFrame({
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
  const saveView = useSaveView(source)
  const contextIds = contextIdsOf(useSession((st) => st.tree))
  const save = (sort: SortCriterion[] | undefined): void => void saveView(view, { sort })

  const primary = view.sort?.[0]
  const sub = view.sort?.[1]
  const targets = [
    FILEDATA_TARGETS.title,
    FILEDATA_TARGETS.createdAt,
    FILEDATA_TARGETS.modifiedAt,
    ...schemaTargets(schema, () => true),
  ]

  const pickPrimary = (id: string | null): void => {
    if (id === null) {
      if (primary) save(undefined)
      return
    }
    if (primary?.property_id === id) return
    const fresh: SortCriterion = { property_id: id, direction: 'ascending' }
    const next = sub && sub.property_id !== id ? [fresh, sub] : [fresh]
    if (id === LOCATION_SORT) void saveView(view, { sort: next, location_order_mode: 'location' })
    else save(next)
  }

  const pickSub = (id: string | null): void => {
    if (!primary) return
    if (id === null) {
      if (sub) save([primary])
      return
    }
    if (sub?.property_id === id) return
    save([primary, { property_id: id, direction: 'ascending' }])
  }

  const primaryDef = primary && schema.find((d) => d.id === primary.property_id)
  const finiteDef =
    primaryDef && viewSpecOf(primaryDef.type)?.directions === 'option' ? primaryDef : undefined

  const savePrimary = (next: SortCriterion): void => save(sub ? [next, sub] : [next])
  const ordering = primary?.order
    ? { order_mode: 'manual' as const, order: primary.order }
    : {
        order_mode:
          primary?.direction === 'descending' ? ('reversed' as const) : ('configured' as const),
      }

  const listed: PickerOption<string>[] = [
    { value: '_none', label: 'None', icon: 'circle-off' as const },
    ...(!VIEW_KINDS[view.type].nests || primary?.property_id === LOCATION_SORT
      ? [{ value: LOCATION_SORT, label: 'Location', icon: 'folder' as const }]
      : []),
    ...targets.filter((t) => t.id !== sub?.property_id).map(targetOption),
  ]
  const sortByOptions =
    primary && !listed.some((o) => o.value === primary.property_id)
      ? [
          ...listed,
          { value: primary.property_id, label: primary.property_id, icon: 'tag' as const },
        ]
      : listed

  const subOptions: PickerOption<string>[] = [
    { value: '_none', label: 'None', icon: 'circle-off' as const },
    ...targets.filter((t) => t.id !== primary?.property_id).map(targetOption),
  ]

  return (
    <MenuScrollFrame
      header={<MenuTopRow label={label} current="Sorting" onBack={onBack} />}
      maxHeight={VIEW_SETTINGS_MAX_HEIGHT}
    >
      <MenuRowView
        row={pickerRow(
          'arrow-up-down',
          'Sort By',
          primary?.property_id ?? '_none',
          sortByOptions,
          (v) => pickPrimary(v === '_none' ? null : v),
        )}
      />
      {primary && (
        <>
          {primary.property_id === LOCATION_SORT ? (
            <MenuRowView
              row={pickerRow(
                'folder',
                'Order',
                viewOption(view, 'location_order_mode'),
                LOCATION_ORDERS,
                (v) => void saveView(view, { location_order_mode: v }),
                sub ? SUB_LOOK : undefined,
              )}
            />
          ) : (
            <MenuRowView
              row={pickerRow(
                'arrow-down-up',
                'Order',
                finiteDef && primary.order ? 'custom' : primary.direction,
                finiteDef
                  ? CUSTOM_OPTION_DIRECTIONS
                  : directionOptions(primary.property_id, schema, contextIds),
                (v: OrderChoice) =>
                  savePrimary(
                    v === 'custom'
                      ? { ...primary, order: liveBucketOrder(ordering, finiteDef, []) }
                      : { property_id: primary.property_id, direction: v },
                  ),
                sub ? SUB_LOOK : undefined,
              )}
            />
          )}
          <MenuRowView
            row={pickerRow(
              'arrow-up-down',
              'Sub-Sort',
              sub?.property_id ?? '_none',
              subOptions,
              (v) => pickSub(v === '_none' ? null : v),
            )}
          />
          {sub && (
            <MenuRowView
              row={pickerRow(
                'arrow-down-up',
                'Order',
                sub.direction,
                directionOptions(sub.property_id, schema, contextIds),
                (d) => save([primary, { ...sub, direction: d }]),
                SUB_LOOK,
              )}
            />
          )}
          {finiteDef && (
            <>
              <MenuSeparator flush />
              <div className={`${middleRegion} ${chipRegion} scroll-fade`}>
                <OptionOrderList
                  group={ordering}
                  def={finiteDef}
                  onSave={(order) => savePrimary({ ...primary, order })}
                />
              </div>
            </>
          )}
        </>
      )}
    </MenuScrollFrame>
  )
}
