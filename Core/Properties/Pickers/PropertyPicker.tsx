import { type RefObject, useEffect, useState } from 'react'
import type { ColumnStyle } from '../columnStyles'
import {
  optionsOf,
  type OptionPickKind,
  pickKindOf,
  type PickOption,
  PROPERTY_TYPES,
  type PropertyDefinition,
  SELECT_GROUP,
} from '../properties'
import { NULL_VALUE, type PropertyValue } from '../propertyValue'
import { OptionDraft, type OptionStyleControl, useOptionEdit } from '../Schema/useOptionEdit'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import { PICKER_MAX_HEIGHT } from '@pommora/uix/Pickers/picker-base.css'
import { colorNameFor } from '@pommora/uix/Theme/ramp'
import { NeutralChip } from '@pommora/uix/Labels/recipes'
import {
  FootingCreate,
  MenuFooting,
  MenuItem,
  MenuScrollFrame,
  MenuSeparator,
  MenuTopRow,
  menuDropLine,
} from '@pommora/uix/Menus'
import { FrameSlide } from '@pommora/uix/Menus/FrameSlide'
import { LineRow, LineZone, lineList } from '@pommora/uix/Interactions/drag'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { Icon } from '@pommora/uix/Symbols'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { DateTimeValuePicker } from './DateTimeValuePicker'
import { adoptPathInto, pickFileInto } from './filePick'
import { OptionChip } from '../Cells/OptionChip'
import { chooserTop, emptyPane } from './property-picker.css'
import { PathField } from '@pommora/uix/Fields/PathField'

export type PickTarget = { def: PropertyDefinition; current: PropertyValue | null } & (
  | { kind: 'options'; style?: OptionStyleControl; contextOptions?: PickOption[] }
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
): { options: PickOption[]; kind: OptionPickKind } => ({
  options: contextOptions ?? optionsOf(def).map((o) => ({ ...o, label: o.value })),
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
          style={t.style}
          contextOptions={t.contextOptions}
          options={options}
          selected={selected}
          onPick={pick}
          editable
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
  style,
  contextOptions,
  options,
  selected,
  onPick,
  editable,
}: {
  def: PropertyDefinition
  style?: OptionStyleControl
  contextOptions?: PickOption[]
  options: PickOption[]
  selected: string[]
  onPick: (value: string) => void
  editable?: boolean
}): React.JSX.Element {
  if (editable && PROPERTY_TYPES[def.type].options === 'select')
    return (
      <EditableOptionRows
        key={def.id}
        def={def}
        style={style}
        options={options}
        selected={selected}
        onPick={onPick}
      />
    )
  if (options.length === 0) return <div className={emptyPane} />
  const look = style?.current.look
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
            <OptionChip type={def.type} look={look} option={o} def={def} />
          )}
        </MenuItem>
      ))}
    </>
  )
}

function EditableOptionRows({
  def,
  style,
  options,
  selected,
  onPick,
}: {
  def: PropertyDefinition
  style?: OptionStyleControl
  options: PickOption[]
  selected: string[]
  onPick: (value: string) => void
}): React.JSX.Element {
  const look = style?.current.look
  const edit = useOptionEdit({ def, options, style })
  return (
    <>
      <MenuScrollFrame
        maxHeight={PICKER_MAX_HEIGHT}
        footer={
          <>
            {edit.draft && (
              <MenuItem inert checked={false} centered>
                <OptionDraft edit={edit} type={def.type} />
              </MenuItem>
            )}
            <MenuFooting
              centered={look === 'compact'}
              leading={
                <FootingCreate
                  ariaLabel="New Option"
                  onClick={() => edit.beginDraft(SELECT_GROUP)}
                />
              }
            />
          </>
        }
      >
        <LineZone
          {...lineList({
            commit: (value, slot) =>
              void edit.editOption({
                op: 'move',
                value,
                groupId: SELECT_GROUP,
                toIndex: slot.index,
              }),
            line: menuDropLine,
            label: (value) => value,
            chip: (value) => (
              <OptionChip
                type={def.type}
                look={look}
                option={options.find((o) => o.value === value)}
                def={def}
              />
            ),
            watch: [def],
          })}
        >
          {options.length === 0 && <div className={emptyPane} />}
          {options.map((o) => (
            <Reveal key={edit.keyOf(o.value)} open enterOnMount={edit.entering(o.value)} fill>
              <LineRow
                id={o.value}
                open={() => onPick(o.value)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  void edit.openMenu(o.value, e.currentTarget)
                }}
              >
                <MenuItem
                  checked={selected.includes(o.value)}
                  centered
                  onClick={() => onPick(o.value)}
                >
                  <OptionChip type={def.type} look={look} option={o} def={def} />
                </MenuItem>
              </LineRow>
            </Reveal>
          ))}
        </LineZone>
      </MenuScrollFrame>
      {edit.popup}
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
