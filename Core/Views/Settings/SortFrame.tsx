import { LOCATION_SORT, type SortCriterion, viewOption } from '../views'
import { presentedKind } from '../Host/viewKinds'
import { MenuRowView, pickerRow } from '@pommora/uix/Menus/MenuIndex'
import { MenuScrollFrame, MenuTopRow, MenuSeparator } from '@pommora/uix/Menus/MenuRows'
import { resolveColumn } from '../Pipeline/columns'
import { contextIdsOf } from '../../Contexts/contextIdentity'
import { useSession } from '../../Session/store'
import type { PickerOption } from '@pommora/uix/Menus/PickerControl'
import { OptionOrderList, orderOptions, SUB_LOOK } from './OptionOrderList'
import { liveBucketOrder } from '../Pipeline/group'
import { FILEDATA_TARGETS, NONE_OPTION, schemaTargets } from '../paneTargets'
import { chipRegion, middleRegion, SETTINGS_PANE_MAX_HEIGHT } from '@pommora/uix/Menus/frames.css'
import { viewSpecOf } from '../valueKinds'
import type { PaneProps } from './ViewPane'

type OrderChoice = SortCriterion['direction'] | 'custom'
const LOCATION_ORDERS: PickerOption<'location' | 'custom'>[] = [
  { value: 'location', label: 'Location' },
  { value: 'custom', label: 'Custom' },
]

export function SortFrame({ view, schema, back, save }: PaneProps): React.JSX.Element {
  const contextIds = contextIdsOf(useSession((st) => st.tree))
  const saveSort = (sort: SortCriterion[] | undefined): void => void save({ sort })

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
      if (primary) saveSort(undefined)
      return
    }
    if (primary?.property_id === id) return
    const fresh: SortCriterion = { property_id: id, direction: 'ascending' }
    const next = sub && sub.property_id !== id ? [fresh, sub] : [fresh]
    if (id === LOCATION_SORT) void save({ sort: next, location_order_mode: 'location' })
    else saveSort(next)
  }

  const pickSub = (id: string | null): void => {
    if (!primary) return
    if (id === null) {
      if (sub) saveSort([primary])
      return
    }
    if (sub?.property_id === id) return
    saveSort([primary, { property_id: id, direction: 'ascending' }])
  }

  const primaryColumn = primary && resolveColumn(primary.property_id, schema, contextIds)
  const finiteDef =
    viewSpecOf(primaryColumn?.type)?.directions === 'option' ? primaryColumn?.def : undefined

  const savePrimary = (next: SortCriterion): void => saveSort(sub ? [next, sub] : [next])
  const ordering = primary?.order
    ? { order_mode: 'manual' as const, order: primary.order }
    : {
        order_mode:
          primary?.direction === 'descending' ? ('reversed' as const) : ('configured' as const),
      }

  const listed: PickerOption<string>[] = [
    NONE_OPTION,
    ...(!presentedKind(view.type).nests || primary?.property_id === LOCATION_SORT
      ? [{ ...FILEDATA_TARGETS.location, value: LOCATION_SORT }]
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
    NONE_OPTION,
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
          primary?.property_id ?? NONE_OPTION.value,
          sortByOptions,
          (v) => pickPrimary(v === NONE_OPTION.value ? null : v),
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
                (v) => void save({ location_order_mode: v }),
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
              sub?.property_id ?? NONE_OPTION.value,
              subOptions,
              (v) => pickSub(v === NONE_OPTION.value ? null : v),
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
                (d) => saveSort([primary, { ...sub, direction: d }]),
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
