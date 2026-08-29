import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@renderer/DesignSystem/Buttons'
import type { CollectionNode, NexusTree, SetNode } from '@shared/types'
import type { PropertyDefinition } from '@shared/properties'
import type { FilterRule, SavedView } from '@shared/views'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { SegmentRun } from '@renderer/DesignSystem/Fields/SegmentRun'
import * as sr from '@renderer/DesignSystem/Fields/segmentRun.css'
import { EntityIcon } from '@renderer/Utilities/EntityIcon'
import { labelColorFor } from '@renderer/DesignSystem/Tokens/colorMap'
import {
  DisclosureRow,
  MenuFooting,
  MenuCaption,
  MenuItem,
  MenuScrollFrame,
  MenuTopRow,
  useDisclosureSet,
} from '@renderer/DesignSystem/Menus'
import {
  accessoryButton,
  footingLabel,
  footingSymbol,
} from '@renderer/DesignSystem/Menus/menu-base.css'
import { PickerMenu, PickerOption } from '@renderer/DesignSystem/Pickers/picker-base'
import { PICKER_MAX_HEIGHT, treePane } from '@renderer/DesignSystem/Pickers/picker-base.css'
import { OverScroll } from '@renderer/DesignSystem/Interactions/OverScroll'
import { Reveal } from '@renderer/DesignSystem/Animation/Reveal'
import { duration as motion, ms } from '@renderer/DesignSystem/Animation'
import { CalendarPicker } from '@renderer/DesignSystem/Pickers/CalendarPicker/CalendarPicker'
import { contextIdsOf, isContextColumnId } from '@renderer/Properties/contextIdentity'
import { useStyleFor } from '@renderer/Tables/columnStyles'
import { useSession } from '../store'
import { condensedDate, formatDate } from '@renderer/Properties/Editing/formatValue'
import { contextOptionsFor, type ContextOption } from '@renderer/Properties/contextOptions'
import { declaredType } from '@renderer/Properties/value'
import { toggleValue } from '@renderer/Properties/Editing/PropertyPicker'
import { CheckboxGlyph } from '@renderer/Properties/Editing/checkboxLook'
import { onActivateKey } from '@renderer/DesignSystem/Interactions/activate'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { useSaveView } from '../SurfacePM/ViewTileScope'
import { PickerControl, type PickerChoice } from '@renderer/DesignSystem/Elements/PickerControl'
import { optionsOf } from './GroupFrame'
import {
  type Connector,
  type DecodedFilter,
  type MatchMode,
  type OperatorChoice,
  type FilterRow,
  decodeFilter,
  connectorFor,
  encodeFilter,
  filterTargets,
  operatorsFor,
} from './filterModel'
import * as fp from './filterFrame.css'
import { SpaceChip } from '@renderer/DesignSystem/Labels'
import { OptionChip } from '@renderer/Properties/Editing/OptionChip'

const MATCH_OPTIONS: PickerChoice<MatchMode>[] = [
  { value: 'all', label: 'All' },
  { value: 'any', label: 'Any' },
]

const ACTIVE_OPTIONS: PickerChoice<'on' | 'off'>[] = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
]

const DISCLOSURE_MS = ms(motion.fast)

function RevealRow({
  animate = false,
  children,
}: {
  animate?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  const [entered, setEntered] = useState(!animate)
  useLayoutEffect(() => {
    if (entered) return undefined
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [entered])
  return (
    <Reveal open={entered} fill>
      {children}
    </Reveal>
  )
}

const emptyPicker = (label: string): React.JSX.Element => <MenuCaption>{label}</MenuCaption>

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
        {leadGlyph ? <span className={fp.leadGlyph}>{leadGlyph}</span> : null}
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

function ValueInput({
  value,
  numeric,
  onCommit,
}: {
  value: string | undefined
  numeric: boolean
  onCommit: (next: string | undefined) => void
}): React.JSX.Element {
  // The LAST live input, kept through a ref callback that ignores the detach. Two things defeat a
  // plain ref here: React detaches refs before passive cleanups, and the `key` below remounts the
  // input on every committed round-trip — so a node captured at mount is a DEAD earlier one whose
  // value is stale, and the flush then compares stale-to-current, finds them equal, and saves nothing.
  const node = useRef<HTMLInputElement | null>(null)
  const keepNode = (n: HTMLInputElement | null): void => {
    if (n) node.current = n
  }
  const latest = useRef({ value, onCommit })
  latest.current = { value, onCommit }
  const commit = (raw: string): void => {
    const next = raw.trim() === '' ? undefined : raw
    if (next !== latest.current.value) latest.current.onCommit(next)
  }
  useEffect(
    () => () => {
      if (node.current) commit(node.current.value)
    },
    [],
  )
  return (
    <input
      ref={keepNode}
      key={value ?? ''}
      className={fp.cellInput}
      defaultValue={value ?? ''}
      placeholder="Value"
      {...(numeric ? { inputMode: 'decimal' as const } : {})}
      onBlur={(e) => commit(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit(e.currentTarget.value)
      }}
    />
  )
}

function useMultiValue(
  values: string[],
  onCommit: (next: string[]) => void,
): { shown: string[]; toggle: (v: string) => void } {
  const [local, setLocal] = useState<string[] | null>(null)
  if (local && local.length === values.length && local.every((v, i) => v === values[i]))
    setLocal(null)
  const shown = local ?? values
  const toggle = (v: string): void => {
    const next = toggleValue(shown, v)
    setLocal(next)
    onCommit(next)
  }
  return { shown, toggle }
}

function ValueFieldShell({
  hostRef,
  onOpen,
  children,
}: {
  hostRef: React.RefObject<HTMLDivElement | null>
  onOpen: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a native button cannot nest the remove buttons
    <div
      ref={hostRef}
      role="button"
      tabIndex={0}
      className={fp.valueField}
      aria-label="Filter values"
      onClick={onOpen}
      onKeyDown={onActivateKey(onOpen)}
    >
      {children}
    </div>
  )
}

function LocationField({
  values,
  sets,
  onCommit,
}: {
  values: string[]
  sets: SetNode[]
  onCommit: (next: string[]) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const expanded = useDisclosureSet()
  const { shown, toggle } = useMultiValue(values, onCommit)
  const byId = new Map(flattenSets(sets).map((s) => [s.id, s]))

  const renderSet = (s: SetNode): React.JSX.Element => {
    const kids = s.sets ?? []
    const picked = shown.includes(s.id)
    return (
      <DisclosureRow
        key={s.id}
        title={s.title}
        icon={<EntityIcon kind="set" icon={s.icon} size="body" />}
        dropOutline={kids.length > 0 ? 'chevron' : 'spacer'}
        open={expanded.has(s.id)}
        onToggle={() => expanded.toggle(s.id)}
        onClick={() => toggle(s.id)}
        selected={picked}
        picker
      >
        {kids.length > 0 ? kids.map(renderSet) : undefined}
      </DisclosureRow>
    )
  }

  return (
    <>
      <ValueFieldShell hostRef={ref} onOpen={() => setOpen(true)}>
        {shown.length === 0 ? (
          <span className={fp.placeholder}>Value</span>
        ) : (
          <SegmentRun
            entries={shown.map((v) => {
              const set = byId.get(v)
              return {
                key: v,
                label: set?.title ?? v,
                icon: (
                  <EntityIcon kind="set" icon={set?.icon} size="body" className={sr.segmentIcon} />
                ),
                onRemove: () => toggle(v),
              }
            })}
          />
        )}
      </ValueFieldShell>
      <PickerMenu
        open={open}
        onDismiss={() => setOpen(false)}
        triggerRef={ref}
        origin="left"
        maxHeight={PICKER_MAX_HEIGHT}
        contentClassName={treePane}
      >
        {!open
          ? null
          : sets.length === 0
            ? emptyPicker('No Sets in this collection.')
            : sets.map(renderSet)}
      </PickerMenu>
    </>
  )
}

function ChipsField({
  values,
  options,
  isContext,
  type,
  onCommit,
}: {
  values: string[]
  options: ContextOption[]
  isContext: boolean
  type: string
  onCommit: (next: string[]) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { shown, toggle } = useMultiValue(values, onCommit)
  const byValue = new Map(options.map((o) => [o.value, o]))
  return (
    <>
      <ValueFieldShell hostRef={ref} onOpen={() => setOpen(true)}>
        {shown.length === 0 ? (
          <span className={fp.placeholder}>Value</span>
        ) : (
          <OverScroll className={fp.chipRun}>
            {shown.map((v) => {
              const o = byValue.get(v)
              return isContext ? (
                <SpaceChip
                  key={v}
                  color={labelColorFor(o?.color)}
                  title={o?.label ?? v}
                  {...(o?.icon ? { icon: o.icon } : {})}
                  onRemove={() => toggle(v)}
                />
              ) : (
                <OptionChip
                  key={v}
                  type={type}
                  option={o ?? { value: v }}
                  onRemove={() => toggle(v)}
                />
              )
            })}
          </OverScroll>
        )}
      </ValueFieldShell>
      <PickerMenu open={open} onDismiss={() => setOpen(false)} triggerRef={ref}>
        {!open
          ? null
          : options.length === 0
            ? emptyPicker('No options yet.')
            : options.map((o) => (
                <PickerOption
                  key={o.value}
                  selected={shown.includes(o.value)}
                  onClick={() => toggle(o.value)}
                >
                  {isContext ? (
                    <SpaceChip color={labelColorFor(o.color)} title={o.label} />
                  ) : (
                    <OptionChip type={type} option={o} />
                  )}
                </PickerOption>
              ))}
      </PickerMenu>
    </>
  )
}

function flattenSets(sets: SetNode[] | undefined): SetNode[] {
  return (sets ?? []).flatMap((s) => [s, ...flattenSets(s.sets)])
}

export function FilterFrame({
  source,
  view,
  schema,
  tree,
  label,
  onBack,
}: {
  source: CollectionNode | SetNode
  view: SavedView
  schema: PropertyDefinition[]
  tree: NexusTree | null
  label: string
  onBack: () => void
}): React.JSX.Element {
  const styleFor = useStyleFor()
  const nexusClock = useSession((s) => s.personalization.timeFormat)
  const saveView = useSaveView(source)
  const [draft, setDraft] = useState<Connector | null | false>(false)

  const [justAdded, setJustAdded] = useState<number | null>(null)
  const [pendingMode, setPendingMode] = useState<MatchMode | null>(null)

  const propRef = useRef(view)
  const writtenRef = useRef(view)
  if (propRef.current !== view) {
    propRef.current = view
    writtenRef.current = view
  }
  const liveView = writtenRef.current

  const commit = (next: SavedView): void => {
    writtenRef.current = next
    void saveView(next)
  }

  const decoded: DecodedFilter = decodeFilter(liveView.filter)
  const enabled = liveView.filter_enabled !== false
  const rows: FilterRow[] = decoded.kind === 'rows' ? decoded.rows : []
  const decodedMode: MatchMode = decoded.kind === 'rows' ? decoded.mode : 'all'
  const mode: MatchMode = rows.length === 0 ? (pendingMode ?? decodedMode) : decodedMode

  const save = (nextMode: MatchMode, nextRows: FilterRow[]): void =>
    commit({ ...writtenRef.current, filter: encodeFilter(nextMode, nextRows) })

  const liveRows = (): FilterRow[] => {
    const d = decodeFilter(writtenRef.current.filter)
    return d.kind === 'rows' ? d.rows : []
  }

  const setEnabled = (next: boolean): void =>
    commit({ ...writtenRef.current, filter_enabled: next })

  const contextIds = contextIdsOf(tree)
  const targets = filterTargets(schema, tree, (source.sets?.length ?? 0) > 0)
  const defById = new Map(schema.map((d) => [d.id, d]))
  const targetById = new Map(targets.map((t) => [t.id, t]))

  const pickMatch = (pick: MatchMode): void => {
    if (pick === mode) return
    const current = liveRows()
    if (current.length === 0) {
      setPendingMode(pick)
      return
    }
    const bulk = connectorFor(pick)
    save(
      pick,
      current.map((row, i) => ({ ...row, connector: i === 0 ? null : bulk })),
    )
  }

  const replaceRule = (index: number, rule: FilterRule): void =>
    save(
      mode,
      liveRows().map((row, i) => (i === index ? { ...row, rule } : row)),
    )

  const removeRow = (index: number): void => {
    const next = liveRows().filter((_, i) => i !== index)
    if (next.length > 0) next[0] = { ...next[0], connector: null }
    save(mode, next)
  }

  const toggleConnector = (index: number): void =>
    save(
      mode,
      liveRows().map((row, i) =>
        i === index ? { ...row, connector: row.connector === 'and' ? 'or' : 'and' } : row,
      ),
    )

  const completeDraft = (targetId: string): void => {
    const current = liveRows()
    setDraft(false)
    setJustAdded(current.length)
    setPendingMode(null)
    window.setTimeout(() => setJustAdded(null), DISCLOSURE_MS)
    save(mode, [
      ...current,
      {
        connector: current.length === 0 || draft === false ? null : draft,
        rule: mintRule(targetId, schema, contextIds),
      },
    ])
  }

  const targetOptions = (
    onPick: (id: string) => void,
    close: () => void,
    current?: string,
  ): React.ReactNode =>
    targets.map((t) => (
      <PickerOption
        key={t.id}
        selected={t.id === current}
        ring
        leading={<Icon name={t.icon ?? 'tag'} size="body" />}
        onClick={() => {
          close()
          onPick(t.id)
        }}
      >
        {t.label}
      </PickerOption>
    ))

  const valueCell = (
    row: FilterRow,
    index: number,
    op: OperatorChoice | undefined,
  ): React.ReactNode => {
    if (!op || op.slot === 'none') return null
    const rule = row.rule
    const def = defById.get(rule.property_id)
    const patch = (next: Partial<Pick<FilterRule, 'value' | 'values'>>): void =>
      replaceRule(index, {
        property_id: rule.property_id,
        op: rule.op,
        ...(next.value !== undefined ? { value: next.value } : {}),
        ...(next.values !== undefined && next.values.length > 0 ? { values: next.values } : {}),
      })

    if (op.slot === 'text' || op.slot === 'number')
      return (
        <ValueInput
          value={rule.value}
          numeric={op.slot === 'number'}
          onCommit={(v) => patch({ value: v })}
        />
      )

    if (op.slot === 'date') {
      const fmtRaw = styleFor(rule.property_id, schema, view).date_format ?? 'full'
      const fmt = fmtRaw === 'relative' ? 'short' : fmtRaw
      return (
        <FieldPicker
          ariaLabel="Filter date"
          className={fp.valueField}
          display={rule.value ? formatDate(rule.value, fmt, 'none') : null}
          placeholder="Date"
        >
          {() => (
            <CalendarPicker
              range={false}
              value={rule.value ?? null}
              timeFormat={nexusClock}
              formatDateValue={(k, condensed) =>
                condensed ? condensedDate(k, fmt, condensed.withYear) : formatDate(k, fmt, 'none')
              }
              onChange={(iso) => patch({ value: iso ?? undefined })}
            />
          )}
        </FieldPicker>
      )
    }

    if (op.slot === 'chips') {
      const type = declaredType(rule.property_id, schema, contextIds)
      const contextId = isContextColumnId(tree, rule.property_id)
        ? rule.property_id
        : def?.context_target?.context_id
      const isContext = type === 'context'
      const options: ContextOption[] = isContext
        ? tree && contextId
          ? contextOptionsFor(contextId, tree)
          : []
        : optionsOf(def)
      return (
        <ChipsField
          values={rule.values ?? []}
          options={options}
          isContext={isContext}
          type={type ?? 'select'}
          onCommit={(values) => patch({ values })}
        />
      )
    }

    return (
      <LocationField
        values={rule.values ?? (rule.value != null ? [rule.value] : [])}
        sets={source.sets ?? []}
        onCommit={(values) => patch({ values })}
      />
    )
  }

  const ruleRow = (row: FilterRow, index: number): React.JSX.Element => {
    const ops = operatorsFor(row.rule.property_id, schema, contextIds)
    const current = ops.find(
      (o) =>
        o.op === row.rule.op && (o.impliedValue === undefined || o.impliedValue === row.rule.value),
    )
    const target = targetById.get(row.rule.property_id)
    const isCheckbox = declaredType(row.rule.property_id, schema, contextIds) === 'checkbox'
    const checkboxColor = defById.get(row.rule.property_id)?.checkbox_color
    const checkboxBox = (o: OperatorChoice): React.JSX.Element => (
      <CheckboxGlyph checked={o.impliedValue === 'true'} color={checkboxColor} />
    )
    return (
      <RevealRow key={index} animate={index === justAdded}>
        <div className={fp.ruleRow}>
          <span className={fp.whatCell}>
            {row.connector !== null && (
              <button
                type="button"
                className={fp.connector}
                aria-label="Toggle connector"
                onClick={() => toggleConnector(index)}
              >
                {row.connector === 'and' ? 'And' : 'Or'}
                <Icon name="chevrons-up-down" size="control" className={fp.chevron} />
              </button>
            )}
            <FieldPicker
              ariaLabel="Filter property"
              display={target?.label ?? row.rule.property_id}
              icon={target?.icon}
              placeholder="Property"
            >
              {(close) =>
                targetOptions(
                  (id) =>
                    id !== row.rule.property_id &&
                    replaceRule(index, mintRule(id, schema, contextIds)),
                  close,
                  row.rule.property_id,
                )
              }
            </FieldPicker>
          </span>
          <FieldPicker
            ariaLabel="Filter operator"
            chevron
            className={current?.slot === 'none' ? fp.controlFieldWide : fp.controlField}
            display={current?.label ?? row.rule.op}
            {...(isCheckbox && current ? { lead: checkboxBox(current) } : {})}
            placeholder="Condition"
          >
            {(close) =>
              ops.map((o) => {
                return (
                  <PickerOption
                    key={o.label}
                    selected={o === current}
                    ring
                    align="start"
                    {...(isCheckbox ? { leading: checkboxBox(o) } : {})}
                    onClick={() => {
                      close()
                      const keep = o.slot === current?.slot
                      replaceRule(index, {
                        property_id: row.rule.property_id,
                        op: o.op,
                        ...(o.impliedValue !== undefined
                          ? { value: o.impliedValue }
                          : keep
                            ? {
                                ...(row.rule.value !== undefined ? { value: row.rule.value } : {}),
                                ...(row.rule.values ? { values: row.rule.values } : {}),
                              }
                            : {}),
                      })
                    }}
                  >
                    {o.label}
                  </PickerOption>
                )
              })
            }
          </FieldPicker>
          {valueCell(row, index, current)}
          <button
            type="button"
            className={fp.removeButton}
            aria-label="Remove filter"
            onClick={() => removeRow(index)}
          >
            <Icon name="x" size="caption" />
          </button>
        </div>
      </RevealRow>
    )
  }

  const lead = rows.length === 0
  const draftRow = (draft !== false || lead) && (
    <RevealRow animate={!lead}>
      <div className={fp.ruleRow}>
        <span className={fp.whatCell}>
          {!lead && (
            <button
              type="button"
              className={fp.connector}
              aria-label="Toggle connector"
              onClick={() => setDraft(draft === 'or' ? 'and' : 'or')}
            >
              {draft === 'or' ? 'Or' : 'And'}
              <Icon name="chevrons-up-down" size="control" className={fp.chevron} />
            </button>
          )}
          <FieldPicker
            ariaLabel="Filter property"
            className={cx(fp.cellField, fp.blankWide)}
            display={null}
            placeholder={lead ? 'Where' : ''}
          >
            {(close) => targetOptions((id) => completeDraft(id), close)}
          </FieldPicker>
        </span>
        <span className={cx(fp.controlField, fp.blankNarrow)} />
        <span className={fp.valueField} />
        {!lead && (
          <button
            type="button"
            className={fp.removeButton}
            aria-label="Remove filter"
            onClick={() => setDraft(false)}
          >
            <Icon name="x" size="caption" />
          </button>
        )}
      </div>
    </RevealRow>
  )

  return (
    <MenuScrollFrame
      className={fp.frame}
      header={<MenuTopRow label={label} current="Filtering" onBack={onBack} />}
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
              value={enabled ? 'on' : 'off'}
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
          <MenuItem
            leading={
              <span className={footingSymbol}>
                <Icon name="rotate-ccw" size="control" />
              </span>
            }
            onClick={() => save('all', [])}
          >
            <span className={footingLabel}>Reset Filter</span>
          </MenuItem>
        </>
      ) : (
        <div className={fp.ruleList}>
          {rows.map(ruleRow)}
          {draftRow}
          <Button
            size="button-inline"
            paddingX="0"
            icon="plus"
            iconSize="body"
            className={accessoryButton}
            data-create
            aria-label="Add filter rule"
            onClick={() =>
              draft === false && setDraft(rows.length === 0 ? null : connectorFor(mode))
            }
          />
        </div>
      )}
    </MenuScrollFrame>
  )
}
