import { useMemo, useRef, useState } from 'react'
import type { CollectionNode, NexusTree, SetNode } from '../../Nexus/tree'
import type { PickOption, PropertyDefinition } from '../../Properties/properties'
import { type SavedView, viewOption } from '../views'
import {
  type FilterRule,
  type MatchMode,
  ruleOperands,
  type StandaloneFilter,
} from '../filterRules'
import type { PaneTarget } from '../paneTargets'
import { Icon } from '@pommora/uix/Symbols'
import { leading } from '@pommora/uix/Fields/fields.css'
import { colorNameFor } from '@pommora/uix/Theme/ramp'
import {
  MenuFooting,
  MenuCaption,
  MenuItem,
  FootingCreate,
  FootingItem,
  MenuScrollFrame,
  MenuTopRow,
  RowRemove,
} from '@pommora/uix/Menus'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import { OverScroll } from '@pommora/uix/Interactions/OverScroll'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import { contextIdsOf } from '../../Contexts/contextIdentity'
import { styleFor, useNexusForms } from '../Host/useColumnStyles'
import { formatDate } from '../../Properties/formatValue'
import { DateTimeValuePicker, dateFormFor } from '../../Properties/Pickers/DateTimeValuePicker'
import { contextOptionsFor } from '../../Contexts/contextOptions'
import { resolveColumn } from '../Pipeline/columns'
import type { ResolvedColumn } from '../viewRow'
import { checkboxWord } from '../../Properties/propertyValue'
import { PropertyOptionRows } from '../../Properties/Pickers/PropertyPicker'
import { pickGroups } from '../../Properties/Pickers/pickModel'
import { CheckboxGlyph } from '../../Properties/Cells/CheckboxGlyph'
import { onActivateKey } from '@pommora/uix/Interactions/activate'
import { cx } from '@pommora/uix/Utilities/cx'
import { PickerControl, type PickerOption } from '@pommora/uix/Pickers/PickerControl'
import { type DecodedFilter, decodeFilter, filterTargets, operatorsFor } from '../filterModel'
import type { OperatorChoice } from '../valueKinds'
import * as fp from './filter-frame.css'
import { flattenNodes, LocationField } from './LocationField'
import { useMultiValue } from './useMultiValue'
import { NeutralChip } from '@pommora/uix/Labels/recipes'
import { OptionChip } from '../../Properties/Cells/OptionChip'
import { EditableInput } from '@pommora/uix/Fields/EditableInput'

const MATCH_OPTIONS: PickerOption<MatchMode>[] = [
  { value: 'all', label: 'All' },
  { value: 'any', label: 'Any' },
]

const ACTIVE_OPTIONS: PickerOption<'on' | 'off'>[] = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
]

function FieldPicker({
  ariaLabel,
  display,
  icon,
  iconColor,
  lead,
  placeholder,
  chevron = false,
  className,
  children,
}: {
  ariaLabel: string
  display: string | null
  icon?: React.ComponentProps<typeof Icon>['name']
  iconColor?: string
  lead?: React.ReactNode
  placeholder: string
  chevron?: boolean
  className?: string
  children: (close: () => void) => React.ReactNode
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const leadGlyph =
    lead ??
    (icon ? (
      <Icon name={icon} size="body" {...(iconColor ? { style: { color: iconColor } } : {})} />
    ) : null)
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={className ?? fp.cellField}
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
      >
        {leadGlyph ? <span className={leading}>{leadGlyph}</span> : null}
        <OverScroll className={cx(fp.fieldLabel, display === null && fp.placeholder)}>
          {display ?? placeholder}
        </OverScroll>
        {chevron ? <Icon name="chevrons-up-down" size="control" className={fp.chevron} /> : null}
      </button>
      <PickerMenu open={open} onDismiss={() => setOpen(false)} triggerRef={ref}>
        {open ? children(() => setOpen(false)) : null}
      </PickerMenu>
    </>
  )
}

function mintRule(
  targetId: string,
  schema: PropertyDefinition[],
  contextIds: readonly string[],
): FilterRule {
  const first = operatorsFor(targetId, schema, contextIds)[0]
  return {
    property_id: targetId,
    op: first?.op ?? '',
    ...(first?.impliedValue ? { value: first.impliedValue } : {}),
  }
}

function ChipsField({
  values,
  column,
  contextOptions,
  onCommit,
}: {
  values: string[]
  column: ResolvedColumn
  contextOptions?: PickOption[]
  onCommit: (next: string[]) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { shown, toggle } = useMultiValue(values, onCommit)
  const options = pickGroups(column, contextOptions).flatMap((g) => g.options)
  const byValue = new Map(options.map((o) => [o.value, o]))
  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: a native button cannot nest the remove buttons */}
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        className={fp.valueField}
        aria-label="Filter values"
        onClick={() => setOpen(true)}
        onKeyDown={onActivateKey(() => setOpen(true))}
      >
        {shown.length === 0 ? (
          <span className={fp.placeholder}>Value</span>
        ) : (
          <OverScroll className={fp.chipRun}>
            {shown.map((v) => {
              const o = byValue.get(v)
              return contextOptions ? (
                <NeutralChip
                  key={v}
                  color={colorNameFor(o?.color)}
                  title={o?.label ?? v}
                  icon={o?.icon}
                  onRemove={() => toggle(v)}
                />
              ) : (
                <OptionChip
                  key={v}
                  type={column.type}
                  option={o ?? { label: v }}
                  onRemove={() => toggle(v)}
                />
              )
            })}
          </OverScroll>
        )}
      </div>
      <PickerMenu open={open} onDismiss={() => setOpen(false)} triggerRef={ref}>
        {open && (
          <PropertyOptionRows
            column={column}
            contextOptions={contextOptions}
            selected={shown}
            onPick={toggle}
          />
        )}
      </PickerMenu>
    </>
  )
}

export type FilterView = Pick<SavedView, 'filter' | 'filter_enabled' | 'column_styles'>
type FilterPatch = { filter: SavedView['filter'] } | { filter_enabled: boolean }

export const filterViewOf = (f: StandaloneFilter): FilterView => ({
  filter: f.rules ?? undefined,
  filter_enabled: f.enabled,
})
export const standalonePatch = (p: FilterPatch): Partial<StandaloneFilter> =>
  'filter' in p ? { rules: p.filter ?? null } : { enabled: p.filter_enabled }

export function FilterFrame({
  locations,
  view,
  read,
  schema,
  tree,
  back,
  targets: supplied,
  maxHeight,
  onCommit,
}: {
  locations: (CollectionNode | SetNode)[]
  view: FilterView
  read: () => FilterView
  schema: PropertyDefinition[]
  tree: NexusTree | null
  back?: { label: string; onBack: () => void }
  targets?: PaneTarget[]
  maxHeight?: number
  onCommit: (patch: FilterPatch) => void
}): React.JSX.Element {
  const nexus = useNexusForms()
  const [draft, setDraft] = useState<string | null>(null)
  const minted = useRef(0)
  const mint = (): string => String(++minted.current)
  const ids = useRef<string[]>([])

  const [pendingMode, setPendingMode] = useState<MatchMode | null>(null)

  const decoded: DecodedFilter = decodeFilter(view.filter)
  const rules: FilterRule[] = decoded.kind === 'rows' ? decoded.rules : []
  // A rule's row is its identity, not its place: removing one leaves the others and their fields standing, and a count changed elsewhere keeps the rows already held.
  if (ids.current.length !== rules.length)
    ids.current = rules.map((_, i) => ids.current[i] ?? mint())
  const decodedMode: MatchMode = decoded.kind === 'rows' ? decoded.mode : 'any'
  const mode: MatchMode = rules.length === 0 ? (pendingMode ?? decodedMode) : decodedMode

  const save = (nextMode: MatchMode, next: FilterRule[]): void =>
    onCommit({ filter: next.length ? { match: nextMode, rules: next } : undefined })

  const liveRules = (): FilterRule[] => {
    const d = decodeFilter(read().filter)
    return d.kind === 'rows' ? d.rules : []
  }

  const setEnabled = (next: boolean): void => onCommit({ filter_enabled: next })

  const entering = useEntrance(ids.current, (id) => id)

  const contextIds = contextIdsOf(tree)
  const targets = supplied ?? filterTargets(schema, tree, locations.length > 0)
  const targetById = new Map(targets.map((t) => [t.id, t]))
  const folderById = useMemo(
    () => new Map(flattenNodes(locations).map((n) => [n.id, n])),
    [locations],
  )

  const pickMatch = (pick: MatchMode): void => {
    if (pick === mode) return
    const current = liveRules()
    if (current.length === 0) setPendingMode(pick)
    else save(pick, current)
  }

  const replaceRule = (index: number, rule: FilterRule): void =>
    save(
      mode,
      liveRules().map((r, i) => (i === index ? rule : r)),
    )

  const removeRow = (index: number): void => {
    ids.current.splice(index, 1)
    save(
      mode,
      liveRules().filter((_, i) => i !== index),
    )
  }

  const completeDraft = (targetId: string): void => {
    ids.current.push(draft ?? 'lead')
    setDraft(null)
    setPendingMode(null)
    save(mode, [...liveRules(), mintRule(targetId, schema, contextIds)])
  }

  const targetOptions = (
    onPick: (id: string) => void,
    close: () => void,
    current?: string,
  ): React.ReactNode =>
    targets.map((t) => (
      <MenuItem
        key={t.id}
        picked={t.id === current ? 'solo' : undefined}
        leading={<Icon name={t.icon} size="body" />}
        onClick={() => {
          close()
          onPick(t.id)
        }}
      >
        {t.label}
      </MenuItem>
    ))

  const valueCell = (
    rule: FilterRule,
    index: number,
    op: OperatorChoice | undefined,
    column: ResolvedColumn | undefined,
  ): React.ReactNode => {
    if (!op || op.slot === 'none') return null
    const operands = ruleOperands(rule)
    const operand = operands[0] ?? ''
    const patch = (next: Partial<Pick<FilterRule, 'value' | 'values'>>): void =>
      replaceRule(index, {
        property_id: rule.property_id,
        op: rule.op,
        ...(next.value !== undefined ? { value: next.value } : {}),
        ...(next.values !== undefined && next.values.length > 0 ? { values: next.values } : {}),
      })

    if (op.slot === 'text' || op.slot === 'number')
      return (
        <EditableInput
          key={operand}
          initial={operand}
          className={fp.cellInput}
          placeholder="Value"
          boxed
          autoFocus={false}
          onCommit={(text) => {
            if (text !== operand) patch({ value: text || undefined })
          }}
          onCancel={() => {}}
        />
      )

    if (op.slot === 'date') {
      const style = styleFor(column!, view, nexus)
      const fmt = dateFormFor(style.date_format)
      return (
        <FieldPicker
          ariaLabel="Filter date"
          className={fp.valueField}
          display={operand ? formatDate(operand, fmt, 'none') : null}
          placeholder="Date"
        >
          {() => (
            <DateTimeValuePicker
              value={operand ? { kind: 'dateTime', value: operand } : null}
              dateFormat={style.date_format}
              timeFormat={style.time_format}
              onCommit={(v) => patch({ value: v?.kind === 'dateTime' ? v.value : undefined })}
            />
          )}
        </FieldPicker>
      )
    }

    if (op.slot === 'chips')
      return (
        <ChipsField
          values={operands}
          column={column!}
          contextOptions={contextOptionsFor(column!, tree)}
          onCommit={(values) => patch({ values })}
        />
      )

    return (
      <LocationField
        values={operands}
        nodes={locations}
        folderById={folderById}
        names={op.names === true}
        onCommit={(values) => patch({ values })}
      />
    )
  }

  const ruleRow = (rule: FilterRule, index: number): React.JSX.Element => {
    const column = resolveColumn(rule.property_id, schema, contextIds)
    const ops = operatorsFor(rule.property_id, schema, contextIds)
    const current = ops.find(
      (o) =>
        o.op === rule.op &&
        (o.impliedValue === undefined ||
          checkboxWord(o.impliedValue) === checkboxWord(ruleOperands(rule)[0])),
    )
    const target = targetById.get(rule.property_id)
    const isCheckbox = column?.type === 'checkbox'
    const checkboxColor = column?.def?.checkbox_color
    const checkboxLook = column && styleFor(column, view, nexus).look
    const checkboxBox = (o: OperatorChoice): React.JSX.Element => (
      <CheckboxGlyph
        checked={o.impliedValue === 'true'}
        color={checkboxColor}
        look={checkboxLook}
      />
    )
    const id = ids.current[index]
    return (
      <Reveal key={id} open enterOnMount={entering(id)} fill>
        <div className={fp.ruleRow}>
          <FieldPicker
            ariaLabel="Filter property"
            display={target?.label ?? rule.property_id}
            icon={target?.icon}
            placeholder="Property"
          >
            {(close) =>
              targetOptions(
                (id) =>
                  id !== rule.property_id && replaceRule(index, mintRule(id, schema, contextIds)),
                close,
                rule.property_id,
              )
            }
          </FieldPicker>
          <FieldPicker
            ariaLabel="Filter operator"
            chevron
            className={current?.slot === 'none' ? fp.controlFieldWide : fp.controlField}
            display={current?.label ?? rule.op}
            {...(isCheckbox && current ? { lead: checkboxBox(current) } : {})}
            placeholder="Condition"
          >
            {(close) =>
              ops.map((o) => {
                const values =
                  o.slot === 'set' && !o.names
                    ? rule.values?.filter((v) => folderById.has(v))
                    : rule.values
                return (
                  <MenuItem
                    key={o.label}
                    picked={o === current ? 'solo' : undefined}
                    {...(isCheckbox ? { leading: checkboxBox(o) } : {})}
                    onClick={() => {
                      close()
                      const keep = o.slot === current?.slot
                      replaceRule(index, {
                        property_id: rule.property_id,
                        op: o.op,
                        ...(o.impliedValue !== undefined
                          ? { value: o.impliedValue }
                          : keep
                            ? {
                                ...(rule.value !== undefined ? { value: rule.value } : {}),
                                ...(values?.length ? { values } : {}),
                              }
                            : {}),
                      })
                    }}
                  >
                    {o.label}
                  </MenuItem>
                )
              })
            }
          </FieldPicker>
          {valueCell(rule, index, current, column)}
          <RowRemove ariaLabel="Remove filter" onClick={() => removeRow(index)} />
        </div>
      </Reveal>
    )
  }

  const lead = rules.length === 0
  const draftRow = (draft !== null || lead) && (
    <Reveal key={draft ?? 'lead'} open enterOnMount={!lead} fill>
      <div className={fp.ruleRow}>
        <FieldPicker
          ariaLabel="Filter property"
          className={cx(fp.cellField, fp.blankWide)}
          display={null}
          placeholder={lead ? 'Where' : ''}
        >
          {(close) => targetOptions((id) => completeDraft(id), close)}
        </FieldPicker>
        <span className={cx(fp.controlField, fp.blankNarrow)} />
        <span className={fp.valueField} />
        {!lead && <RowRemove ariaLabel="Remove filter" onClick={() => setDraft(null)} />}
      </div>
    </Reveal>
  )

  return (
    <MenuScrollFrame
      className={fp.frame}
      maxHeight={maxHeight}
      header={back && <MenuTopRow label={back.label} current="Filtering" onBack={back.onBack} />}
      footer={
        <MenuFooting
          leading={
            decoded.kind === 'rows' ? (
              <PickerControl
                ariaLabel="Matches"
                value={mode}
                options={MATCH_OPTIONS}
                onPick={pickMatch}
              />
            ) : undefined
          }
          trailing={
            <PickerControl
              ariaLabel="Filter active"
              value={viewOption(view, 'filter_enabled') ? 'on' : 'off'}
              options={ACTIVE_OPTIONS}
              onPick={(v) => setEnabled(v === 'on')}
            />
          }
        />
      }
    >
      {decoded.kind === 'locked' ? (
        <>
          <MenuCaption>Hand-authored filter — edited outside the pane.</MenuCaption>
          <FootingItem icon="rotate-ccw" label="Reset Filter" onClick={() => save(mode, [])} />
        </>
      ) : (
        <div className={fp.ruleList}>
          {[...rules.map(ruleRow), draftRow]}
          <FootingCreate ariaLabel="Add filter rule" onClick={() => setDraft((d) => d ?? mint())} />
        </div>
      )}
    </MenuScrollFrame>
  )
}
