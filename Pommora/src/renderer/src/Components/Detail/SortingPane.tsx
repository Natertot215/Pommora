// The pane owns the sort slot WHOLESALE — every write is [primary], [primary, sub], or undefined;
// a foreign 3+-key tail renders by its first two slots until the first write replaces the slot.
import { useState } from 'react'
import type { CollectionNode, SetNode } from '@shared/types'
import type { PropertyDefinition } from '@shared/properties'
import { RESERVED_PROPERTY_ID } from '@shared/properties'
import { LOCATION_SORT, type SavedView, type SortCriterion } from '@shared/views'
import { Icon } from '@renderer/design-system/symbols'
import { MenuItem, MenuPaneTopRow, MenuSeparator } from '../../design-system/components/menu'
import { flushTrailing } from '../../design-system/components/menu/menu.css'
import { Reveal } from '../../design-system/components/Reveal'
import { useSaveView } from '@renderer/Embeds/ViewEmbedScope'
import { declaredType } from '../../Detail/Views/pipeline/value'
import { cx } from '../../design-system/cx'
import { MenuOption } from '@renderer/design-system/components/PickerMenu'
import { PickerControl, type PickerChoice } from './PickerControl'
import { CustomList, PropertyPreview, optionsOf } from './GroupingPane'
import { bucketOrder } from '../../Detail/Views/pipeline/group'
import { MODIFIED_TARGET, schemaTargets, TITLE_TARGET } from './PropertyTypes'
import * as gp from './groupingPane.css'

type Direction = SortCriterion['direction']

/** context/file route to a no-op text key in the sorter, so they're deliberately absent —
 *  never offer what the extractor can't rank. */
const SORTABLE_PANE = new Set([
  'select',
  'status',
  'number',
  'datetime',
  'checkbox',
  'url',
  'multi_select',
])

const OPTION_DIRECTIONS: PickerChoice<Direction>[] = [
  { value: 'ascending', label: 'Default' },
  { value: 'descending', label: 'Reversed' },
]
/** The primary's option-type Order adds Custom (a draggable value order on the criterion) — the
 *  sub Order stays two-choice (no editing surface for a second custom list). */
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

/** Per-type direction vocabulary: option-ordered types read Default/Reversed; temporal/numeric
 *  read Ascending/Descending; text reads A → Z. A dead def falls to the value labels. */
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
      return TEXT_DIRECTIONS
    default:
      return VALUE_DIRECTIONS
  }
}

interface SortTarget {
  id: string
  label: string
  icon: React.ComponentProps<typeof Icon>['name'] | undefined
}

/** Title and Modified sort via buildCriterion's reserved-id branches, not through the schema. */
function sortTargets(schema: PropertyDefinition[]): SortTarget[] {
  return [
    TITLE_TARGET,
    MODIFIED_TARGET,
    ...schemaTargets(schema, (d) => SORTABLE_PANE.has(declaredType(d.id, schema) ?? '')),
  ]
}

function ValueRow<T extends string>({
  tier = 'primary',
  icon,
  label,
  value,
  options,
  onPick,
}: {
  tier?: 'primary' | 'sub'
  icon?: React.ComponentProps<typeof Icon>['name']
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

export function SortingPane({
  source,
  view,
  schema,
  label,
  onBack,
}: {
  source: CollectionNode | SetNode
  view: SavedView
  schema: PropertyDefinition[]
  /** The back-destination breadcrumb — 'Settings' from SettingsPane, 'Views' from ViewSettings. */
  label: string
  onBack: () => void
}): React.JSX.Element {
  const [sortByOpen, setSortByOpen] = useState(false)
  const saveView = useSaveView(source)
  const save = (sort: SortCriterion[] | undefined): void => void saveView({ ...view, sort })

  const primary = view.sort?.[0]
  const sub = view.sort?.[1]
  const targets = sortTargets(schema)
  const targetById = new Map(targets.map((t) => [t.id, t]))
  // A dead criterion (deleted def) renders by its raw id — the pane never silently drops
  // config it didn't write; None clears it like any other. Location is the reserved cards sort.
  const nameOf = (c: SortCriterion): string =>
    c.property_id === LOCATION_SORT
      ? 'Location'
      : (targetById.get(c.property_id)?.label ?? c.property_id)

  const pickPrimary = (id: string | null): void => {
    setSortByOpen(false)
    if (id === null) {
      if (primary) save(undefined)
      return
    }
    if (primary?.property_id === id) return
    const fresh: SortCriterion = { property_id: id, direction: 'ascending' }
    const next = sub && sub.property_id !== id ? [fresh, sub] : [fresh]
    // Picking Location seeds its Order at Location (filesystem) — the flatten's default.
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

  // The example order: only a finite-ordered primary previews — the hasMiddle logic.
  const primaryType = primary ? declaredType(primary.property_id, schema) : undefined
  const finiteDef =
    primaryType === 'select' || primaryType === 'status'
      ? schema.find((d) => d.id === primary?.property_id)
      : undefined

  /** A primary rewrite keeps the sub slot (wholesale two-slot ownership). */
  const savePrimary = (next: SortCriterion): void => save(sub ? [next, sub] : [next])
  // Picking Custom snapshots the CURRENT effective sequence (the first-UI-writer pattern) so the
  // list starts where the preview left off.
  const seededOrder = (): string[] =>
    bucketOrder(
      { order_mode: primary?.direction === 'descending' ? 'reversed' : 'configured' },
      finiteDef,
      new Set(optionsOf(finiteDef).map((o) => o.value)),
    )

  const subOptions: PickerChoice<string>[] = [
    { value: '_none', label: 'None', icon: 'circle-off' as const },
    ...targets
      .filter((t) => t.id !== primary?.property_id)
      .map((t) => ({ value: t.id, label: t.label, icon: t.icon })),
  ]

  return (
    <>
      <MenuPaneTopRow label={label} current="Sorting" onBack={onBack} />
      <MenuItem
        className={flushTrailing}
        leading={<Icon name="arrow-up-down" size={14} />}
        trailing={
          <span className={gp.groupByValue}>
            {primary ? nameOf(primary) : 'None'}
            <Icon name="chevrons-up-down" size={12} />
          </span>
        }
        onClick={() => setSortByOpen((o) => !o)}
      >
        Sort By
      </MenuItem>
      <Reveal open={sortByOpen}>
        <div className={`${gp.middle} overflow-eclipse-y`}>
          <MenuOption
            leading={<Icon name="circle-off" size={13} />}
            selected={!primary}
            onClick={() => pickPrimary(null)}
          >
            None
          </MenuOption>
          {view.type === 'cards' && (
            <MenuOption
              leading={<Icon name="folder" size={13} />}
              selected={primary?.property_id === LOCATION_SORT}
              onClick={() => pickPrimary(LOCATION_SORT)}
            >
              Location
            </MenuOption>
          )}
          {targets
            .filter((t) => t.id !== sub?.property_id)
            .map((t) => (
              <MenuItem
                key={t.id}
                leading={<Icon name={t.icon ?? 'tag'} size={13} />}
                selected={primary?.property_id === t.id}
                onClick={() => pickPrimary(t.id)}
              >
                {t.label}
              </MenuItem>
            ))}
        </div>
      </Reveal>
      {!sortByOpen && primary && (
        <>
          {primary.property_id === LOCATION_SORT ? (
            // The location sort ranks by the filesystem (Location) or the view's manual order
            // (Custom). Its own key, so grouping structurally on the same view can't shadow it.
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
              <div className={`${gp.middle} overflow-eclipse-y`}>
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
