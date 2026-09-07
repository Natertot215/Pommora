import { type RefObject, useEffect, useState } from 'react'
import type { ColumnLook, ColumnStyle } from '@pommora/core/Properties/columnStyles'
import { type PropertyDefinition, statusOptions } from '@pommora/core/Properties/properties'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import { PickerMenu, PickerRow } from '@pommora/uix/Pickers/picker-base'
import { labelColorFor } from '@pommora/uix/Theme/ramp'
import { NeutralChip } from '@pommora/uix/Labels/recipes'
import { MenuItem, MenuTopRow } from '@pommora/uix/Menus'
import { FrameSlide } from '@pommora/uix/Menus/frame-slide'
import { Icon } from '@pommora/uix/Symbols'
import { useHeld } from '@pommora/uix/Animations/useHeld'
import type { PickKind } from './massAssign'
import { DatetimeValuePicker } from './DatetimeValuePicker'
import { adoptPathInto, pickFileInto } from './filePick'
import { OptionChip } from '../Cells/OptionChip'
import { chooserTop } from './property-picker.css'
import { PathField } from '@pommora/uix/Fields/PathField'

export type PickOption = { value: string; label: string; color?: string; icon?: string }

export type PickTarget = { def: PropertyDefinition; current: PropertyValue | null } & (
  | { kind: 'options'; look?: ColumnLook; contextOptions?: PickOption[] }
  | { kind: 'datetime'; dateFormat?: ColumnStyle['date_format'] }
  | { kind: 'file' }
)

export type PickEntry = {
  id: string
  name: string
  icon: string
  revealOnly: boolean
  drillable: boolean
}

/** An option is never filtered by what it's called: the starter options a new property seeds are ordinary values. Groups are containers, never pickable chips. */
export const optionsOf = (def: PropertyDefinition): PickOption[] => {
  return def.type === 'status' ? statusOptions(def) : (def.select_options ?? [])
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
  kind: contextOptions ? 'context' : def.type === 'multi_select' ? 'multiSelect' : 'select',
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
  chooserInitial,
  open,
  triggerRef,
  anchorX,
  onCommit,
  onReveal,
  onDismiss,
  resolveTarget,
  def,
  current,
  look,
  contextOptions,
}: {
  target?: PickTarget | null
  chooser?: PickEntry[]
  chooserInitial?: string
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  anchorX?: number
  onCommit: (value: PropertyValue | null, entry?: PickEntry) => void
  onReveal?: (entry: PickEntry) => void
  onDismiss: () => void
  resolveTarget?: (entry: PickEntry) => PickTarget | null
  def?: PropertyDefinition
  current?: PropertyValue | null
  look?: ColumnLook
  contextOptions?: PickOption[]
}): React.JSX.Element | null {
  const held = useHeld(target ?? null, open)
  const [picked, setPicked] = useState<PickEntry | null>(null)
  useEffect(() => {
    setPicked(open ? (chooser?.find((e) => e.id === chooserInitial) ?? null) : null)
  }, [open, chooserInitial])

  // A drilled entry resolves its target LIVE through resolveTarget, so toggling a multi-value option keeps reading the row after the first commit reveals (and so filters) the entry.
  const t = picked
    ? (resolveTarget?.(picked) ?? null)
    : (held ??
      (def
        ? ({ kind: 'options', def, current: current ?? null, look, contextOptions } as const)
        : null))
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
  ) : t.kind === 'datetime' ? (
    <DatetimeValuePicker value={t.current} dateFormat={t.dateFormat} onCommit={commit} />
  ) : (
    <PathField
      label={t.def.name}
      value=""
      empty="Choose a file"
      browseLabel="Choose File"
      onBrowse={() =>
        pickFileInto(t.def, t.current ?? { kind: 'null' }, null, (v) => {
          commit(v)
          onDismiss()
        })
      }
      onCommit={(raw) => {
        if (raw.trim()) adoptPathInto(t.def, t.current ?? { kind: 'null' }, raw.trim(), commit)
        onDismiss()
      }}
    />
  )

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
              <div style={{ minWidth: 96, height: 24 }} />
            ) : (
              <div>
                {chooser.map((e) => (
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
                ))}
              </div>
            )
          }
          detail={
            picked && (
              <div>
                <MenuTopRow
                  label="Properties"
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
  if (options.length === 0)
    // The spacer keeps the pane's proportions so an emptied option list doesn't collapse to nothing.
    return <div style={{ minWidth: 96, height: 24 }} />
  return (
    <>
      {options.map((o) => (
        <PickerRow
          key={o.value}
          selected={selected.includes(o.value)}
          onClick={() => onPick(o.value)}
        >
          {contextOptions ? (
            <NeutralChip color={labelColorFor(o.color)} title={o.label} icon={o.icon} />
          ) : (
            <OptionChip
              type={def.type}
              look={def.type === 'status' ? look : undefined}
              option={o}
              def={def}
            />
          )}
        </PickerRow>
      ))}
    </>
  )
}

export function pickSemantics(
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
    if (kind !== 'select') {
      onCommit({ kind, value: toggleValue(selected, value) })
      return
    }
    onCommit(selected.includes(value) ? null : { kind: 'select', value })
    onSinglePicked()
  }
  return { options, selected, pick }
}
