import { Fragment, type ReactNode, type RefObject, useEffect, useState } from 'react'
import type { ColumnStyle } from '../columnStyles'
import {
  groupOptions,
  optionGroupsOf,
  type PickOption,
  PROPERTY_TYPES,
  type PropertyDefinition,
  SELECT_GROUP,
} from '../properties'
import { NULL_VALUE, optionLabel, type PropertyValue } from '../propertyValue'
import type { ResolvedColumn } from '../../Views/viewRow'
import { OptionDraft } from '../Schema/OptionSlot'
import { type OptionStyleControl, useOptionEdit } from '../Schema/useOptionEdit'
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
  pickRuns,
  type PickRun,
} from '@pommora/uix/Menus'
import { FrameSlide } from '@pommora/uix/Menus/FrameSlide'
import { LineRow, LineZone, lineList } from '@pommora/uix/Interactions/drag'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { Icon } from '@pommora/uix/Symbols'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { DateTimeValuePicker } from './DateTimeValuePicker'
import { type PickGroup, pickGroups, pickOver } from './pickModel'
import { adoptPathInto, pickFileInto } from './filePick'
import { OptionChip } from '../Cells/OptionChip'
import { chooserTop, emptyPane } from './property-picker.css'
import { PathField } from '@pommora/uix/Fields/PathField'

export type PickTarget = { current: PropertyValue | null } & (
  | {
      kind: 'options'
      column: ResolvedColumn
      style?: OptionStyleControl
      contextOptions?: PickOption[]
    }
  | {
      kind: 'dateTime'
      dateFormat?: ColumnStyle['date_format']
      timeFormat?: ColumnStyle['time_format']
    }
  | { kind: 'file'; def: PropertyDefinition }
)

export type PickEntry = {
  id: string
  name: string
  icon: string
  revealOnly: boolean
  drillable: boolean
  group?: 'Spaces' | 'Properties'
}

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
      const { selected, pick } = pickOver(
        t.column,
        [t.current],
        ([one]) => commit(one.next),
        onDismiss,
      )
      return (
        <PropertyOptionRows
          column={t.column}
          style={t.style}
          contextOptions={t.contextOptions}
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
      span
      onCommit={commit}
    />
  ) : (
    <PathField
      label={t.def.label}
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
  column,
  style,
  contextOptions,
  selected,
  onPick,
  editable,
}: {
  column: ResolvedColumn
  style?: OptionStyleControl
  contextOptions?: PickOption[]
  selected: string[]
  onPick: (value: string) => void
  editable?: boolean
}): React.JSX.Element {
  const groups = pickGroups(column, contextOptions)
  if (editable && column.def && PROPERTY_TYPES[column.type].options)
    return (
      <EditableOptionRows
        key={column.id}
        def={column.def}
        style={style}
        groups={groups}
        selected={selected}
        onPick={onPick}
      />
    )
  const look = style?.current.look
  return (
    <MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT}>
      <OptionGroups
        groups={groups}
        selected={selected}
        row={(o, run) => (
          <MenuItem key={o.value} picked={run} centered onClick={() => onPick(o.value)}>
            {contextOptions ? (
              <NeutralChip color={colorNameFor(o.color)} title={o.label} icon={o.icon} />
            ) : (
              <OptionChip type={column.type} look={look} option={o} def={column.def} />
            )}
          </MenuItem>
        )}
      />
    </MenuScrollFrame>
  )
}

function OptionGroups({
  groups,
  selected,
  row,
}: {
  groups: PickGroup[]
  selected: string[]
  row: (option: PickOption, run: PickRun | undefined) => ReactNode
}): React.JSX.Element {
  if (groups.length === 0) return <div className={emptyPane} />
  return (
    <>
      {groups.map((g, i) => {
        const runs = pickRuns(g.options.map((o) => selected.includes(o.value)))
        return (
          <Fragment key={g.id}>
            {i > 0 && <MenuSeparator group />}
            {g.options.map((o, at) => row(o, runs[at]))}
          </Fragment>
        )
      })}
    </>
  )
}

function EditableOptionRows({
  def,
  style,
  groups,
  selected,
  onPick,
}: {
  def: PropertyDefinition
  style?: OptionStyleControl
  groups: PickGroup[]
  selected: string[]
  onPick: (value: string) => void
}): React.JSX.Element {
  const look = style?.current.look
  const optionGroups = optionGroupsOf(def)
  const edit = useOptionEdit({ def, options: optionGroups.flatMap(groupOptions), style })
  // A Status option belongs to one of its groups, which a quick create here would have to guess.
  const creates = PROPERTY_TYPES[def.type].options === 'select'
  return (
    <>
      <MenuScrollFrame
        maxHeight={PICKER_MAX_HEIGHT}
        footer={
          creates && (
            <>
              {edit.draft && (
                <MenuItem inert centered>
                  <OptionDraft edit={edit} type={def.type} />
                </MenuItem>
              )}
              <MenuFooting
                centered={look === 'compact'}
                leading={
                  <FootingCreate
                    ariaLabel="New Option"
                    disabled={!!edit.draft}
                    onClick={() => edit.beginDraft(SELECT_GROUP)}
                  />
                }
              />
            </>
          )
        }
      >
        <LineZone
          {...lineList({
            ...edit.moves(optionGroups),
            line: menuDropLine,
            label: (value) => optionLabel(def, value),
            watch: [def],
          })}
        >
          <OptionGroups
            groups={groups}
            selected={selected}
            row={(o, run) => (
              <Reveal key={o.value} open enterOnMount={edit.entering(o.value)} fill>
                <LineRow
                  id={o.value}
                  open={() => onPick(o.value)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    void edit.openMenu(o.value, e.currentTarget)
                  }}
                >
                  <MenuItem picked={run} centered tabIndex={-1} onClick={() => onPick(o.value)}>
                    <OptionChip type={def.type} look={look} option={o} def={def} />
                  </MenuItem>
                </LineRow>
              </Reveal>
            )}
          />
        </LineZone>
      </MenuScrollFrame>
      {edit.popup}
    </>
  )
}
