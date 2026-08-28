import type { CollectionNode, SetNode } from '@shared/types'
import type { PropertyDefinition } from '@shared/properties'
import { RESERVED_PROPERTY_ID } from '@shared/properties'
import { LOCATION_SORT, type SavedView, type SortCriterion } from '@shared/views'
import { MenuTopRow, MenuSeparator } from '@renderer/DesignSystem/Menus'
import { useSaveView } from '@renderer/Embeds/ViewEmbedScope'
import { declaredType } from '@renderer/Properties/value'
import type { PickerChoice } from '@renderer/DesignSystem/Elements/PickerControl'
import { ValueRow } from '../Properties/ValueRow'
import { CustomList, PropertyPreview, optionsOf } from './GroupFrame'
import { bucketOrder } from '@renderer/Views/pipeline/group'
import { MODIFIED_TARGET, schemaTargets, TITLE_TARGET } from '../Properties/PropertyTypes'
import * as gp from './groupFrame.css'

type Direction = SortCriterion['direction']

/** Context routes to a no-op text key in the sorter, so it is deliberately absent — never offer
 *  what the extractor can't rank. */
const SORTABLE_PANE = new Set([
  'select',
  'status',
  'number',
  'datetime',
  'checkbox',
  'url',
  'multi_select',
  'file',
])

const OPTION_DIRECTIONS: PickerChoice<Direction>[] = [
  { value: 'ascending', label: 'Default' },
  { value: 'descending', label: 'Reversed' },
]
type OrderChoice = Direction | 'custom'
const CUSTOM_OPTION_DIRECTIONS: PickerChoice<OrderChoice>[] = [
  ...OPTION_DIRECTIONS,
  { value: 'custom', label: 'Custom' },
]
const VALUE_DIRECTIONS: PickerChoice<Direction>[] = [
  { value: 'ascending', label: 'Ascending' },
  { value: 'descending', label: 'Descending' },
]
const TEXT_DIRECTIONS: PickerChoice<Direction>[] = [
  { value: 'ascending', label: 'A → Z' },
  { value: 'descending', label: 'Z → A' },
]

function directionOptions(
  propertyId: string,
  schema: PropertyDefinition[],
): PickerChoice<Direction>[] {
  if (propertyId === RESERVED_PROPERTY_ID.title) return TEXT_DIRECTIONS
  if (propertyId === RESERVED_PROPERTY_ID.modifiedAt) return VALUE_DIRECTIONS
  switch (declaredType(propertyId, schema)) {
    case 'select':
    case 'status':
      return OPTION_DIRECTIONS
    case 'url':
    case 'multi_select':
    case 'file':
      return TEXT_DIRECTIONS
    default:
      return VALUE_DIRECTIONS
  }
}

interface SortTarget {
  id: string
  label: string
  icon: PickerChoice<string>['icon']
}

function sortTargets(schema: PropertyDefinition[]): SortTarget[] {
  return [
    TITLE_TARGET,
    MODIFIED_TARGET,
    ...schemaTargets(schema, (d) => SORTABLE_PANE.has(declaredType(d.id, schema) ?? '')),
  ]
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
  const save = (sort: SortCriterion[] | undefined): void => void saveView({ ...view, sort })

  const primary = view.sort?.[0]
  const sub = view.sort?.[1]
  const targets = sortTargets(schema)
  const targetById = new Map(targets.map((t) => [t.id, t]))
  const nameOf = (c: SortCriterion): string =>
    c.property_id === LOCATION_SORT
      ? 'Location'
      : (targetById.get(c.property_id)?.label ?? c.property_id)

  const pickPrimary = (id: string | null): void => {
    if (id === null) {
      if (primary) save(undefined)
      return
    }
    if (primary?.property_id === id) return
    const fresh: SortCriterion = { property_id: id, direction: 'ascending' }
    const next = sub && sub.property_id !== id ? [fresh, sub] : [fresh]
    if (id === LOCATION_SORT)
      void saveView({ ...view, sort: next, location_order_mode: 'location' })
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

  const primaryType = primary ? declaredType(primary.property_id, schema) : undefined
  const finiteDef =
    primaryType === 'select' || primaryType === 'status'
      ? schema.find((d) => d.id === primary?.property_id)
      : undefined

  const savePrimary = (next: SortCriterion): void => save(sub ? [next, sub] : [next])
  const seededOrder = (): string[] =>
    bucketOrder(
      { order_mode: primary?.direction === 'descending' ? 'reversed' : 'configured' },
      finiteDef,
      new Set(optionsOf(finiteDef).map((o) => o.value)),
    )

  const sortByOptions: PickerChoice<string>[] = [
    { value: '_none', label: 'None', icon: 'circle-off' as const },
    ...(view.type === 'cards'
      ? [{ value: LOCATION_SORT, label: 'Location', icon: 'folder' as const }]
      : []),
    ...targets
      .filter((t) => t.id !== sub?.property_id)
      .map((t) => ({ value: t.id, label: t.label, icon: t.icon })),
    ...(primary && !targets.some((t) => t.id === primary.property_id)
      ? [{ value: primary.property_id, label: nameOf(primary), icon: 'tag' as const }]
      : []),
  ]

  const subOptions: PickerChoice<string>[] = [
    { value: '_none', label: 'None', icon: 'circle-off' as const },
    ...targets
      .filter((t) => t.id !== primary?.property_id)
      .map((t) => ({ value: t.id, label: t.label, icon: t.icon })),
  ]

  return (
    <>
      <MenuTopRow label={label} current="Sorting" onBack={onBack} />
      <ValueRow
        icon="arrow-up-down"
        label="Sort By"
        value={primary?.property_id ?? '_none'}
        options={sortByOptions}
        onPick={(v) => pickPrimary(v === '_none' ? null : v)}
      />
      {primary && (
        <>
          {primary.property_id === LOCATION_SORT ? (
            <ValueRow<'location' | 'custom'>
              tier={sub ? 'sub' : 'primary'}
              icon="folder"
              label="Order"
              value={view.location_order_mode ?? 'location'}
              options={[
                { value: 'location', label: 'Location' },
                { value: 'custom', label: 'Custom' },
              ]}
              onPick={(v) => void saveView({ ...view, location_order_mode: v })}
            />
          ) : (
            <ValueRow<OrderChoice>
              tier={sub ? 'sub' : 'primary'}
              icon="arrow-down-up"
              label="Order"
              value={finiteDef && primary.order ? 'custom' : primary.direction}
              options={
                finiteDef ? CUSTOM_OPTION_DIRECTIONS : directionOptions(primary.property_id, schema)
              }
              onPick={(v) =>
                savePrimary(
                  v === 'custom'
                    ? { ...primary, order: seededOrder() }
                    : { property_id: primary.property_id, direction: v },
                )
              }
            />
          )}
          <ValueRow
            icon="arrow-up-down"
            label="Sub-Sort"
            value={sub?.property_id ?? '_none'}
            options={subOptions}
            onPick={(v) => pickSub(v === '_none' ? null : v)}
          />
          {sub && (
            <ValueRow
              tier="sub"
              icon="arrow-down-up"
              label="Order"
              value={sub.direction}
              options={directionOptions(sub.property_id, schema)}
              onPick={(d) => save([primary, { ...sub, direction: d }])}
            />
          )}
          {finiteDef && (
            <>
              <MenuSeparator flush />
              <div className={`${gp.middle} over-scroll`}>
                {primary.order ? (
                  <CustomList
                    group={{ order_mode: 'manual', order: primary.order }}
                    def={finiteDef}
                    onSave={(order) => savePrimary({ ...primary, order })}
                  />
                ) : (
                  <PropertyPreview
                    group={{
                      order_mode: primary.direction === 'descending' ? 'reversed' : 'configured',
                    }}
                    def={finiteDef}
                  />
                )}
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}
