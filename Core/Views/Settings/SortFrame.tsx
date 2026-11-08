import type { CollectionNode, SetNode } from '../../Nexus/tree'
import type { PropertyDefinition } from '../../Properties/properties'
import { LOCATION_SORT, type SavedView, type SortCriterion, viewOption } from '../views'
import { presentedKind } from '../Host/viewKinds'
import { MenuRowView, pickerRow } from '@pommora/uix/Menus/MenuIndex'
import {
  type MenuBack,
  MenuScrollFrame,
  MenuTopRow,
  MenuSeparator,
} from '@pommora/uix/Menus/MenuRows'
import { useSaveView } from '../viewWrite'
import { resolveColumn } from '../Pipeline/columns'
import { contextIdsOf } from '../../Contexts/contextIdentity'
import { useSession } from '../../Session/store'
import type { PickerOption } from '@pommora/uix/Menus/PickerControl'
import { OptionOrderList } from './OptionOrderList'
import { orderOptions, SUB_LOOK } from './paneRows'
import { liveBucketOrder } from '../Pipeline/group'
import { FILEDATA_TARGETS, schemaTargets } from '../paneTargets'
import { chipRegion, middleRegion, SETTINGS_PANE_MAX_HEIGHT } from '@pommora/uix/Menus/frames.css'
import { viewSpecOf } from '../valueKinds'

type OrderChoice = SortCriterion['direction'] | 'custom'
const LOCATION_ORDERS: PickerOption<'location' | 'custom'>[] = [
  { value: 'location', label: 'Location' },
  { value: 'custom', label: 'Custom' },
]

export function SortFrame({
  source,
  view,
  schema,
  back,
}: {
  source: CollectionNode | SetNode
  view: SavedView
  schema: PropertyDefinition[]
  back: MenuBack
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

  const primaryColumn = primary && resolveColumn(primary.property_id, schema, contextIds)
  const finiteDef =
    viewSpecOf(primaryColumn?.type)?.directions === 'option' ? primaryColumn?.def : undefined

  const savePrimary = (next: SortCriterion): void => save(sub ? [next, sub] : [next])
  const ordering = primary?.order
    ? { order_mode: 'manual' as const, order: primary.order }
    : {
        order_mode:
          primary?.direction === 'descending' ? ('reversed' as const) : ('configured' as const),
      }

  const listed: PickerOption<string>[] = [
    { value: '_none', label: 'None', icon: 'circle-off' as const },
    ...(!presentedKind(view.type).nests || primary?.property_id === LOCATION_SORT
      ? [{ value: LOCATION_SORT, label: 'Location', icon: 'folder' as const }]
      : []),
    ...targets.filter((t) => t.value !== sub?.property_id),
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
    ...targets.filter((t) => t.value !== primary?.property_id),
  ]

  return (
    <MenuScrollFrame
      header={<MenuTopRow {...back} current="Sorting" />}
      maxHeight={SETTINGS_PANE_MAX_HEIGHT}
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
                orderOptions(primaryColumn, ['ascending', 'descending', 'custom']),
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
                orderOptions(resolveColumn(sub.property_id, schema, contextIds), [
                  'ascending',
                  'descending',
                ]),
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
