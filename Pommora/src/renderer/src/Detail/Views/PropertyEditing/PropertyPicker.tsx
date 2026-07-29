import type { RefObject } from 'react'
import type { ColumnLook } from '@shared/columnStyles'
import { type PropertyDefinition, statusOptions } from '@shared/properties'
import type { PropertyValue } from '@shared/propertyValue'
import { PickerMenu, PickerOption } from '@renderer/design-system/components/PickerMenu/PickerMenu'
import { Chip, chipShapeForType } from '@renderer/Components/Chip'
import { ContextChip } from '@renderer/Components/ContextChip'
import { chipColorFor } from '@renderer/design-system/tokens/colorMap'
import { statusGroupOf } from './statusCycle'
import { StatusCapsule } from './StatusCapsule'

/** A pickable option — status options flatten out of their groups, select/multi read
 *  `select_options`. An option is never filtered by what it's called: the starter options a new
 *  property seeds are ordinary values. Groups are containers, never pickable chips. */
const optionsOf = (
  def: PropertyDefinition,
): Array<{ value: string; label: string; color?: string; icon?: string }> => {
  return def.type === 'status' ? statusOptions(def) : (def.select_options ?? [])
}

const selectedValues = (current: PropertyValue | null): string[] => {
  if (!current) return []
  if (current.kind === 'multiSelect' || current.kind === 'context') return current.value
  if (current.kind === 'select') return [current.value]
  return []
}

export const toggleValue = (selected: string[], value: string): string[] =>
  selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]

/** The minimal def a Context column with no schema entry feeds the picker —
 *  its real options arrive through `contextOptions`, so the name goes unused. */
export const syntheticContextDef = (id: string): PropertyDefinition => ({
  id,
  name: '',
  type: 'context',
})

/**
 * The value dropdown every container view's status/select/multi cells share. Table-agnostic and
 * stateless: props in, `onCommit(PropertyValue)` out — the caller owns the write + the optimistic
 * patch. Self-managed: PickerMenu portals to a body top layer off `triggerRef` (escaping the
 * table's overflow clip), owns its Bloom-in/out off `open`, and dismisses via its own backdrop.
 * Single-value types commit + dismiss on pick; multi toggles against `current` and stays open.
 */
export function PropertyPicker({
  def,
  current,
  open,
  triggerRef,
  anchorX,
  look,
  contextOptions,
  onCommit,
  onDismiss,
}: {
  def: PropertyDefinition
  current: PropertyValue | null
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  /** Click x (viewport px). When set, the pane centres on the click point instead of the trigger's
   *  fixed centre (the card value gesture). Omitted → the default right-anchored dropdown. */
  anchorX?: number
  /** The column's resolved look — a status column on a glyph look (checkbox/capsule) renders
   *  its OPTIONS as capsule chips too (Nathan); pill columns keep labeled pills. */
  look?: ColumnLook
  /** Context columns (the registry Contexts + user context props) pick from the NEXUS's contexts,
   *  not the def — the caller supplies the column's list. Toggles like multi; commits `context`. */
  contextOptions?: Array<{ value: string; label: string; color?: string; icon?: string }>
  onCommit: (value: PropertyValue | null) => void
  onDismiss: () => void
}): React.JSX.Element | null {
  const { options, selected, pick } = pickSemantics(
    def,
    current,
    onCommit,
    onDismiss,
    contextOptions,
  )

  return (
    <PickerMenu
      open={open}
      onDismiss={onDismiss}
      triggerRef={triggerRef}
      solid
      origin={anchorX !== undefined ? 'center' : 'right'}
      anchorX={anchorX}
    >
      <PropertyOptionRows
        def={def}
        look={look}
        contextOptions={contextOptions}
        options={options}
        selected={selected}
        onPick={pick}
      />
    </PickerMenu>
  )
}

/** The picker's option rows, menu-less — shared by PropertyPicker's own menu and any surface
 *  hosting the rows inside another pane (the cards' two-stage add-picker). */
export function PropertyOptionRows({
  def,
  look,
  contextOptions,
  options,
  selected,
  onPick,
}: {
  def: PropertyDefinition
  look?: ColumnLook
  contextOptions?: Array<{ value: string; label: string; color?: string; icon?: string }>
  options: Array<{ value: string; label: string; color?: string; icon?: string }>
  selected: string[]
  onPick: (value: string) => void
}): React.JSX.Element {
  if (options.length === 0)
    // An empty option list (a Select/Multi with all options removed) — the spacer keeps the
    // notch pane's proportions so it doesn't collapse into a degenerate beak. Tune here.
    return <div style={{ minWidth: 96, height: 24 }} />
  return (
    <>
      {options.map((o) => {
        const capsule = def.type === 'status' && (look === 'checkbox' || look === 'capsule')
        const group = capsule ? statusGroupOf(o.value, def) : undefined
        return (
          <PickerOption
            key={o.value}
            selected={selected.includes(o.value)}
            onClick={() => onPick(o.value)}
          >
            {capsule ? (
              <StatusCapsule color={o.color} group={group} />
            ) : contextOptions ? (
              <ContextChip color={chipColorFor(o.color)} title={o.label} icon={o.icon} />
            ) : (
              <Chip
                color={chipColorFor(o.color)}
                label={o.label}
                shape={chipShapeForType(def.type)}
              />
            )}
          </PickerOption>
        )
      })}
    </>
  )
}

/** The picker's shared option plumbing — options + selection + the per-type commit, extracted so
 *  both PropertyPicker's own menu and a host pane (the cards add-picker) run the exact same semantics.
 *  A `contextOptions` list swaps the options source and makes the pick toggle+commit `context` (the
 *  registry Contexts + user context props); without it, def-driven select/status/multi. */
export function pickSemantics(
  def: PropertyDefinition,
  current: PropertyValue | null,
  onCommit: (value: PropertyValue | null) => void,
  onSinglePicked: () => void,
  contextOptions?: Array<{ value: string; label: string; color?: string; icon?: string }>,
): {
  options: Array<{ value: string; label: string; color?: string; icon?: string }>
  selected: string[]
  pick: (value: string) => void
} {
  const options = contextOptions ?? optionsOf(def)
  const multi = def.type === 'multi_select' || contextOptions !== undefined
  const selected = selectedValues(current)
  const pick = (value: string): void => {
    if (multi) {
      const next = toggleValue(selected, value)
      onCommit(
        contextOptions ? { kind: 'context', value: next } : { kind: 'multiSelect', value: next },
      )
      return
    }
    onCommit({ kind: 'select', value })
    onSinglePicked()
  }
  return { options, selected, pick }
}
