import { type RefObject, useEffect, useState } from 'react'
import type { ColumnLook, ColumnStyle } from '@pommora/core/Properties/columnStyles'
import {
  optionsOf,
  type PickKind,
  pickKindOf,
  type PickOption,
  type PropertyDefinition,
} from '@pommora/core/Properties/properties'
import { NULL_VALUE, type PropertyValue } from '@pommora/core/Properties/propertyValue'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import { colorNameFor } from '@pommora/uix/Theme/ramp'
import { NeutralChip } from '@pommora/uix/Labels/recipes'
import { MenuItem, MenuSeparator, MenuTopRow } from '@pommora/uix/Menus'
import { FrameSlide } from '@pommora/uix/Menus/FrameSlide'
import { Icon } from '@pommora/uix/Symbols'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { DateTimeValuePicker } from './DateTimeValuePicker'
import { adoptPathInto, pickFileInto } from './filePick'
import { OptionChip } from '../Cells/OptionChip'
import { chooserTop, emptyPane } from './property-picker.css'
import { PathField } from '@pommora/uix/Fields/PathField'

export type PickTarget = { def: PropertyDefinition; current: PropertyValue | null } & (
  | { kind: 'options'; look?: ColumnLook; contextOptions?: PickOption[] }
  | {
      kind: 'dateTime'
      dateFormat?: ColumnStyle['date_format']
      timeFormat?: ColumnStyle['time_format']
    }
  | { kind: 'file' }
)

export type PickEntry = {
  id: string
  name: string
  icon: string
  revealOnly: boolean
  drillable: boolean
  group?: 'Spaces' | 'Properties'
}

export const selectedValues = (current: PropertyValue | null): string[] => {
  if (!current) return []
  if (current.kind === 'multiSelect' || current.kind === 'context') return current.value
  if (current.kind === 'select') return [current.value]
  return []
}

export const pickShape = (
  def: PropertyDefinition,
  contextOptions?: PickOption[],
): { options: PickOption[]; kind: PickKind } => ({
  options: contextOptions ?? optionsOf(def),
  kind: pickKindOf(def.type) ?? 'select',
})

export const toggleValue = (selected: string[], value: string): string[] =>
  selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]

export const syntheticContextDef = (id: string): PropertyDefinition => ({
  id,
  name: '',
  type: 'context',
})

export function PropertyPicker({
  target,
  chooser,
  open,
  triggerRef,
  anchorX,
  onCommit,
  onReveal,
  onDismiss,
  resolveTarget,
}: {
  target: PickTarget | null
  chooser?: PickEntry[]
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  anchorX?: number
  onCommit: (value: PropertyValue | null, entry?: PickEntry) => void
  onReveal?: (entry: PickEntry) => void
  onDismiss: () => void
  resolveTarget?: (entry: PickEntry) => PickTarget | null
}): React.JSX.Element | null {
  const held = useHeld(target, open)
  const [picked, setPicked] = useState<PickEntry | null>(null)
  useEffect(() => {
    setPicked(null)
  }, [open])

  const t = picked ? (resolveTarget?.(picked) ?? null) : held
  const commit = (v: PropertyValue | null): void => (picked ? onCommit(v, picked) : onCommit(v))

  const origin = t?.kind !== 'options' ? 'auto' : anchorX !== undefined ? 'center' : 'right'

  const pane = !t ? null : t.kind === 'options' ? (
    (() => {
      const { options, selected, pick } = pickSemantics(
        t.def,
        t.current,
        commit,
        onDismiss,
        t.contextOptions,
      )
      return (
        <PropertyOptionRows
          def={t.def}
          look={t.look}
          contextOptions={t.contextOptions}
          options={options}
          selected={selected}
          onPick={pick}
        />
      )
    })()
  ) : t.kind === 'dateTime' ? (
    <DateTimeValuePicker
      value={t.current}
      dateFormat={t.dateFormat}
      timeFormat={t.timeFormat}
      onCommit={commit}
    />
  ) : (
    <PathField
      label={t.def.name}
      value=""
      empty="Choose a file"
      browseLabel="Choose File"
      onBrowse={() =>
        pickFileInto(t.def, t.current ?? NULL_VALUE, null, (v) => {
          commit(v)
          onDismiss()
        })
      }
      onCommit={(raw) => {
        if (raw.trim()) adoptPathInto(t.def, t.current ?? NULL_VALUE, raw.trim(), commit)
        onDismiss()
      }}
    />
  )

  const entryRow = (e: PickEntry): React.JSX.Element => (
    <MenuItem
      key={e.id}
      leading={<Icon name={e.icon} size="body" />}
      trailing={e.revealOnly ? undefined : <Icon name="chevron-right" />}
      onClick={() => {
        if (e.drillable) return setPicked(e)
        onReveal?.(e)
        if (e.revealOnly) onDismiss()
      }}
    >
      {e.name}
    </MenuItem>
  )
  const spaces = chooser?.filter((e) => e.group === 'Spaces') ?? []
  const rest = chooser?.filter((e) => e.group !== 'Spaces') ?? []

  return (
    <PickerMenu
      solid
      open={open}
      onDismiss={onDismiss}
      triggerRef={triggerRef}
      origin={chooser ? 'auto' : origin}
      anchorX={anchorX}
    >
      {chooser ? (
        <FrameSlide
          open={picked !== null}
          minWidth={120}
          minHeight={0}
          root={
            chooser.length === 0 ? (
              <div className={emptyPane} />
            ) : (
              <div>
                {spaces.map(entryRow)}
                {spaces.length > 0 && rest.length > 0 && <MenuSeparator />}
                {rest.map(entryRow)}
              </div>
            )
          }
          detail={
            picked && (
              <div>
                <MenuTopRow
                  label={picked.group ?? 'Properties'}
                  current={picked.name}
                  onBack={() => setPicked(null)}
                  className={chooserTop}
                />
                {pane}
              </div>
            )
          }
        />
      ) : (
        pane
      )}
    </PickerMenu>
  )
}

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
  contextOptions?: PickOption[]
  options: PickOption[]
  selected: string[]
  onPick: (value: string) => void
}): React.JSX.Element {
  if (options.length === 0) return <div className={emptyPane} />
  return (
    <>
      {options.map((o) => (
        <MenuItem
          key={o.value}
          checked={selected.includes(o.value)}
          centered
          onClick={() => onPick(o.value)}
        >
          {contextOptions ? (
            <NeutralChip color={colorNameFor(o.color)} title={o.label} icon={o.icon} />
          ) : (
            <OptionChip
              type={def.type}
              look={def.type === 'status' ? look : undefined}
              option={o}
              def={def}
            />
          )}
        </MenuItem>
      ))}
    </>
  )
}

function pickSemantics(
  def: PropertyDefinition,
  current: PropertyValue | null,
  onCommit: (value: PropertyValue | null) => void,
  onSinglePicked: () => void,
  contextOptions?: PickOption[],
): {
  options: PickOption[]
  selected: string[]
  pick: (value: string) => void
} {
  const { options, kind } = pickShape(def, contextOptions)
  const selected = selectedValues(current)
  const pick = (value: string): void => {
    onCommit(pickedValue(def, current, value, contextOptions))
    if (kind === 'select') onSinglePicked()
  }
  return { options, selected, pick }
}

/** The value a pick lands on, independent of the surface that offered it: a repeat select clears, every other kind toggles. */
export function pickedValue(
  def: PropertyDefinition,
  current: PropertyValue | null,
  value: string,
  contextOptions?: PickOption[],
): PropertyValue | null {
  const { kind } = pickShape(def, contextOptions)
  const selected = selectedValues(current)
  if (kind !== 'select') return { kind, value: toggleValue(selected, value) }
  return selected.includes(value) ? null : { kind: 'select', value }
}
