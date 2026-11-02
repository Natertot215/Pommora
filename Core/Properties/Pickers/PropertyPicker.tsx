import { Fragment, type ReactNode, type RefObject } from 'react'
import type { ColumnStyle } from '../columnStyles'
import {
  groupOptions,
  optionGroupsOf,
  type OptionPickKind,
  type PickOption,
  PROPERTY_TYPES,
  type PropertyDefinition,
  SELECT_GROUP,
} from '../properties'
import { optionLabel, type PropertyValue } from '../propertyValue'
import type { ResolvedColumn } from '../../Views/viewRow'
import { OptionDraft } from '../Schema/OptionSlot'
import { type OptionStyleControl, useOptionEdit } from '../Schema/useOptionEdit'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import { PICKER_MAX_HEIGHT } from '@pommora/uix/Pickers/picker-base.css'
import {
  FootingCreate,
  MenuFooting,
  MenuItem,
  MenuScrollFrame,
  MenuSeparator,
  menuDropLine,
} from '@pommora/uix/Menus/MenuRows'
import { pickRuns, type PickRun } from '@pommora/uix/Menus/pickRuns'
import { LineRow, LineZone, lineList } from '@pommora/uix/Interactions/drag'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { DateTimeValuePicker } from './DateTimeValuePicker'
import { type PickCommit, type PickGroup, pickGroups, pickOver } from './pickModel'
import { OptionChip } from '../Cells/OptionChip'
import { emptyPane } from './property-picker.css'

export type PickTarget =
  | {
      kind: 'options'
      column: ResolvedColumn
      pick: OptionPickKind
      currents: Array<PropertyValue | null>
      style?: OptionStyleControl
      contextOptions?: PickOption[]
    }
  | {
      kind: 'dateTime'
      current: PropertyValue | null
      dateFormat?: ColumnStyle['date_format']
      timeFormat?: ColumnStyle['time_format']
    }

export function ValuePane({
  target,
  header,
  onCommit,
  onClose,
}: {
  target: PickTarget
  header?: ReactNode
  onCommit: (commits: PickCommit[]) => void
  onClose: () => void
}): React.JSX.Element {
  if (target.kind === 'dateTime')
    return (
      <>
        {header}
        <DateTimeValuePicker
          value={target.current}
          dateFormat={target.dateFormat}
          timeFormat={target.timeFormat}
          span
          onCommit={(next) => onCommit([{ index: 0, next }])}
        />
      </>
    )
  const { selected, pick } = pickOver(target.pick, target.currents, onCommit, onClose)
  return (
    <PropertyOptionRows
      column={target.column}
      style={target.style}
      contextOptions={target.contextOptions}
      header={header}
      selected={selected}
      onPick={pick}
      editable
    />
  )
}

export function PropertyPicker({
  target,
  triggerRef,
  centerX,
  onCommit,
  onDismiss,
}: {
  target: PickTarget | null
  triggerRef: RefObject<HTMLElement | null>
  centerX?: number
  onCommit: (commits: PickCommit[]) => void
  onDismiss: () => void
}): React.JSX.Element {
  const options = target?.kind === 'options'
  return (
    <PickerMenu
      solid
      open={target !== null}
      onDismiss={onDismiss}
      triggerRef={triggerRef}
      origin={!options ? 'auto' : centerX !== undefined ? 'center' : 'right'}
      centerX={options ? centerX : undefined}
    >
      {target && <ValuePane target={target} onCommit={onCommit} onClose={onDismiss} />}
    </PickerMenu>
  )
}

export function PropertyOptionRows({
  column,
  style,
  contextOptions,
  header,
  selected,
  onPick,
  editable,
}: {
  column: ResolvedColumn
  style?: OptionStyleControl
  contextOptions?: PickOption[]
  header?: ReactNode
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
        header={header}
        groups={groups}
        selected={selected}
        onPick={onPick}
      />
    )
  const look = style?.current.look
  return (
    <MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT} header={header}>
      <OptionGroups
        groups={groups}
        selected={selected}
        row={(o, run) => (
          <MenuItem key={o.id} picked={run} centered onClick={() => onPick(o.id)}>
            <OptionChip type={column.type} look={look} option={o} def={column.def} />
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
        const runs = pickRuns(g.options.map((o) => selected.includes(o.id)))
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
  header,
  groups,
  selected,
  onPick,
}: {
  def: PropertyDefinition
  style?: OptionStyleControl
  header?: ReactNode
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
        header={header}
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
              <Reveal key={o.id} open enterOnMount={edit.entering(o.id)} fill>
                <LineRow
                  id={o.id}
                  open={() => onPick(o.id)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    void edit.openMenu(o.id, e.currentTarget)
                  }}
                >
                  <MenuItem picked={run} centered tabIndex={-1} onClick={() => onPick(o.id)}>
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
