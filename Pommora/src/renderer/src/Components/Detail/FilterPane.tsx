// The Filtering leaf — authors a table view's filter behind both doors (SettingsPane's Filter
// entry, ViewSettings' Filter leaf). The rule list fills the pane; each row is
// (connector)(what)(operator)(value)(×), serialized to the nested FilterGroup by filterModel. The
// footer carries both pane-level controls: how the rules combine (All / Any / None) and whether the
// filter runs at all — two independent axes, neither of which touches the rules. The pane owns the
// filter slot wholesale for shapes it writes; a hand-authored tree it can't represent renders
// locked behind an explicit Reset (never silently flattened).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CollectionNode, NexusTree, SetNode } from '@shared/types'
import type { PropertyDefinition } from '@shared/properties'
import type { FilterRule, SavedView } from '@shared/views'
import { Icon } from '@renderer/design-system/symbols'
import { Chip, chipShapeForType } from '@renderer/Components/Chip'
import { ContextChip } from '@renderer/Components/ContextChip'
import { chipBox, chipColor } from '@renderer/design-system/tokens'
import { chipColorFor } from '@renderer/design-system/tokens/colorMap'
import {
  MenuBottomRow,
  MenuCaption,
  MenuItem,
  MenuPaneTopRow,
} from '../../design-system/components/menu'
import {
  flushTrailing,
  footingLabel,
  footingSymbol,
} from '../../design-system/components/menu/menu.css'
import { PickerMenu, PickerOption } from '../../design-system/components/PickerMenu'
import { Reveal } from '../../design-system/components/Reveal'
import { duration as motion } from '../../design-system/tokens/motion'
import { CalendarPicker } from '../../design-system/components/CalendarPicker/CalendarPicker'
import { saveViewAdopting } from '../../Detail/Views/viewMint'
import { contextIdsOf, isContextColumnId } from '../../Detail/Views/pipeline/contextIdentity'
import { styleFor } from '../../Detail/Views/Table/columnStyles'
import { condensedDate, formatDate } from '../../Detail/Views/PropertyEditing/formatValue'
import { contextOptionsFor, type ContextOption } from '../../Detail/Views/pipeline/contextOptions'
import { declaredType } from '../../Detail/Views/pipeline/value'
import { checkboxBoxStyle } from '../../Detail/Views/Table/checkboxLook'
import { onActivateKey } from '../../design-system/interactions/activate'
import { cx } from '../../design-system/cx'
import { useSession } from '../../store'
import { PickerControl, type PickerChoice } from './PickerControl'
import { optionsOf } from './GroupingPane'
import {
  type Connector,
  type DecodedFilter,
  type MatchMode,
  type OperatorChoice,
  type PaneRow,
  decodeFilter,
  connectorFor,
  encodeFilter,
  filterTargets,
  operatorsFor,
} from './filterModel'
import * as gp from './groupingPane.css'
import * as fp from './filterPane.css'

/** All (AND) · Any (OR) · None (NOR — matches none of these). Three options, so PickerControl pops
 *  its menu rather than toggling; whether the filter runs at all is the footer switch, not a mode. */
const MATCH_OPTIONS: PickerChoice<MatchMode>[] = [
  { value: 'all', label: 'All' },
  { value: 'any', label: 'Any' },
  { value: 'none', label: 'None' },
]

/** Two options, so PickerControl flips it in place behind the double-chevron — the dual-option
 *  design rule, and the same control the match-mode picker wears beside it. */
const ACTIVE_OPTIONS: PickerChoice<'on' | 'off'>[] = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
]

/** The disclosure beat in ms — how long a just-added row is flagged for its unfold. */
const DISCLOSURE_MS = Number.parseInt(motion.disclosure, 10)

/** A rule row's ENTRY on the shared disclosure beat. `animate` is opt-IN and read only at mount:
 *  a row renders at full height unless it is the one just added, so neither opening the pane nor the
 *  tree reload behind every commit can replay the unfold across the list. There is no exit beat —
 *  rows are index-keyed, so a survivor shifting up would inherit the departing row's collapse. */
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

/** An empty picker says WHY it's empty — a bare spacer opens as a blank bubble that reads as a
 *  broken menu. Reachable in practice: a Context with no Spaces yet, or a type with no operators. */
const emptyPicker = (label: string): React.JSX.Element => <MenuCaption>{label}</MenuCaption>

/** A grid-cell trigger field popping a beaked PickerMenu — the What/Operator control. */
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
  /** A pre-built leading node (the checkbox box component) — wins over `icon`. */
  lead?: React.ReactNode
  placeholder: string
  /** The double-chevron belongs ONLY to the Operator (and the And/Or connector) — never the
   *  What/value fields. */
  chevron?: boolean
  /** The cell's sizing variant — `fp.controlField` for the Operator, `fp.valueField` for a value
   *  slot; the bare `cellField` default is the What cell. */
  className?: string
  children: (close: () => void) => React.ReactNode
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={className ?? fp.cellField}
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
      >
        {lead ??
          (icon ? (
            <Icon name={icon} size={13} {...(iconColor ? { style: { color: iconColor } } : {})} />
          ) : null)}
        <span className={cx('overflow-eclipse', display === null && fp.placeholder)}>
          {display ?? placeholder}
        </span>
        {chevron ? <Icon name="chevrons-up-down" size={12} className={fp.chevron} /> : null}
      </button>
      <PickerMenu open={open} onDismiss={() => setOpen(false)} triggerRef={ref}>
        {children(() => setOpen(false))}
      </PickerMenu>
    </>
  )
}

/** A fresh rule for a just-picked target: its type's first operator, operands cleared (the
 *  checkbox family's implied value rides along). */
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

/** The typed value input (text / number) — commits on blur and Enter. Keyed remount on external
 *  value change keeps it uncontrolled between commits. */
function ValueInput({
  value,
  numeric,
  onCommit,
}: {
  value: string | undefined
  numeric: boolean
  onCommit: (next: string | undefined) => void
}): React.JSX.Element {
  const el = useRef<HTMLInputElement>(null)
  // Read through refs at teardown: the closure that runs then is the FIRST render's.
  const latest = useRef({ value, onCommit })
  latest.current = { value, onCommit }
  const commit = (raw: string): void => {
    const next = raw.trim() === '' ? undefined : raw
    if (next !== latest.current.value) latest.current.onCommit(next)
  }
  // The pane's Back suppresses pointerdown to protect focus, so leaving that way fires no blur and
  // the edit would be lost. Removal fires no blur either — flush whatever the field still holds.
  // The node is captured on mount, not read from the ref at teardown — React detaches refs before
  // passive cleanups run, so `el.current` would already be null.
  useEffect(() => {
    const node = el.current
    return () => {
      if (node) commit(node.value)
    }
  }, [])
  return (
    <input
      ref={el}
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

/** The chips field — the FILTER-OWNED picker host: the same stay-open toggle vocabulary as the
 *  cell pickers, but committing raw option-value strings into the rule's values[] (never a
 *  PropertyValue — the cell pickers' commit shape is a different axis). */
function ChipsField({
  values,
  options,
  isContext,
  chipShape,
  emptyLabel = 'No options yet.',
  onCommit,
}: {
  values: string[]
  options: ContextOption[]
  isContext: boolean
  chipShape: 'pill' | 'label'
  emptyLabel?: string
  onCommit: (next: string[]) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  // Optimistic accumulator: the picker stays open across ASYNC saves, so a second pick inside the
  // refetch window must read the just-committed set, never the stale prop — the props-round-trip
  // alone silently drops rapid picks. Local mirrors until the prop catches up, then releases.
  const [local, setLocal] = useState<string[] | null>(null)
  if (local && local.length === values.length && local.every((v, i) => v === values[i]))
    setLocal(null)
  const shown = local ?? values
  const byValue = new Map(options.map((o) => [o.value, o]))
  const toggle = (v: string): void => {
    const next = shown.includes(v) ? shown.filter((x) => x !== v) : [...shown, v]
    setLocal(next)
    onCommit(next)
  }
  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: a native button is exactly what breaks here — the
          chips inside carry their own remove <button>, and nesting one native button in another makes
          those invisible ×s tab stops whose Enter lands on this trigger instead of removing the chip.
          Keyboard parity is kept via onActivateKey. */}
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
          <span className={cx(fp.chipRun, gp.subChip, 'overflow-eclipse')}>
            {shown.map((v) => {
              const o = byValue.get(v)
              return isContext ? (
                <ContextChip
                  key={v}
                  color={chipColorFor(o?.color)}
                  title={o?.label ?? v}
                  {...(o?.icon ? { icon: o.icon } : {})}
                  onRemove={() => toggle(v)}
                />
              ) : (
                <Chip
                  key={v}
                  color={chipColorFor(o?.color)}
                  label={o?.label ?? v}
                  shape={chipShape}
                  onRemove={() => toggle(v)}
                />
              )
            })}
          </span>
        )}
      </div>
      <PickerMenu open={open} onDismiss={() => setOpen(false)} triggerRef={ref}>
        {options.length === 0
          ? emptyPicker(emptyLabel)
          : options.map((o) => (
              <PickerOption
                key={o.value}
                selected={shown.includes(o.value)}
                onClick={() => toggle(o.value)}
              >
                {isContext ? (
                  <ContextChip color={chipColorFor(o.color)} title={o.label} />
                ) : (
                  <Chip color={chipColorFor(o.color)} label={o.label} shape={chipShape} />
                )}
              </PickerOption>
            ))}
      </PickerMenu>
    </>
  )
}

/** A Collection/Set's sets flattened depth-first with indentation depth — the Location picker's list. */
function flattenSets(
  sets: SetNode[] | undefined,
  depth = 0,
): Array<{ id: string; title: string; depth: number }> {
  return (sets ?? []).flatMap((s) => [
    { id: s.id, title: s.title, depth },
    ...flattenSets(s.sets, depth + 1),
  ])
}

export function FilterPane({
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
  /** The back-destination breadcrumb — 'Settings' from SettingsPane, 'Views' from ViewSettings. */
  label: string
  onBack: () => void
}): React.JSX.Element {
  const load = useSession((st) => st.load)
  // The "+" draft — local until it gains a target (an incomplete rule is never written). Cleared
  // synchronously in the same handler that dispatches its write; the hosts key the pane by view id,
  // so a view switch can never float a stale draft onto another view's rows.
  const [draft, setDraft] = useState<Connector | null | false>(false)

  // Only the row just added unfolds. Scoping the disclosure to one index — rather than to "any row
  // mounted after open" — keeps a save's re-render from replaying the animation across the whole
  // list, since every commit round-trips through a tree reload.
  const [justAdded, setJustAdded] = useState<number | null>(null)
  // A mode picked before any rule exists has nowhere to persist — an empty filter encodes to
  // `undefined` — so it's held here and applied by the write that mints the first rule.
  const [pendingMode, setPendingMode] = useState<MatchMode | null>(null)

  // Every write derives from the last view this pane WROTE, not from the render prop. A save
  // round-trips through a full tree reload, so two writes in one gesture — a value's blur-commit
  // and the click that caused it — would otherwise both build on the same pre-save snapshot and the
  // second would silently drop the first. The prop wins again the moment a fresh one arrives.
  const propRef = useRef(view)
  const writtenRef = useRef(view)
  if (propRef.current !== view) {
    propRef.current = view
    writtenRef.current = view
  }
  const liveView = writtenRef.current

  const commit = (next: SavedView): void => {
    writtenRef.current = next
    void saveViewAdopting(source, next, load)
  }

  const decoded: DecodedFilter = decodeFilter(liveView.filter)
  const enabled = liveView.filter_enabled !== false
  const rows: PaneRow[] = decoded.kind === 'rows' ? decoded.rows : []
  const decodedMode: MatchMode = decoded.kind === 'rows' ? decoded.mode : 'all'
  const mode: MatchMode = rows.length === 0 ? (pendingMode ?? decodedMode) : decodedMode

  // Both read the ref at CALL time, never the render-time `liveView`: a handler created before an
  // in-gesture write would otherwise still hold the pre-write snapshot, since a write updates the
  // ref without re-rendering.
  const save = (nextMode: MatchMode, nextRows: PaneRow[]): void =>
    commit({ ...writtenRef.current, filter: encodeFilter(nextMode, nextRows) })

  /** On/off is its own persisted axis — flipping it never touches the rules or the mode. */
  const setEnabled = (next: boolean): void =>
    commit({ ...writtenRef.current, filter_enabled: next })

  const contextIds = contextIdsOf(tree)
  const targets = filterTargets(schema, tree)
  const targetById = new Map(targets.map((t) => [t.id, t]))

  const pickMatch = (pick: MatchMode): void => {
    if (pick === mode) return
    if (rows.length === 0) {
      setPendingMode(pick)
      return
    }
    // Bulk-set: every connector takes the picked mode (deviations reset). Only `any` splits into
    // runs, so all and none both flatten back to a single And run.
    const bulk = connectorFor(pick)
    save(
      pick,
      rows.map((row, i) => ({ ...row, connector: i === 0 ? null : bulk })),
    )
  }

  const replaceRule = (index: number, rule: FilterRule): void =>
    save(
      mode,
      rows.map((row, i) => (i === index ? { ...row, rule } : row)),
    )

  // Removal is instant, with no collapse: rows are index-keyed, so a survivor shifting into the
  // removed index would inherit the outgoing row's animation and re-unfold from zero height.
  const removeRow = (index: number): void => {
    const next = rows.filter((_, i) => i !== index)
    if (next.length > 0) next[0] = { ...next[0], connector: null }
    save(mode, next)
  }

  const toggleConnector = (index: number): void =>
    save(
      mode,
      rows.map((row, i) =>
        i === index ? { ...row, connector: row.connector === 'and' ? 'or' : 'and' } : row,
      ),
    )

  /** The draft's What pick — the one moment a draft becomes a real (written) rule. */
  const completeDraft = (targetId: string): void => {
    setDraft(false)
    setJustAdded(rows.length)
    setPendingMode(null)
    window.setTimeout(() => setJustAdded(null), DISCLOSURE_MS)
    save(mode, [
      ...rows,
      {
        connector: rows.length === 0 || draft === false ? null : draft,
        rule: mintRule(targetId, schema, contextIds),
      },
    ])
  }

  const targetOptions = (onPick: (id: string) => void, close: () => void): React.ReactNode =>
    targets.map((t) => (
      <PickerOption
        key={t.id}
        selected={false}
        onClick={() => {
          close()
          onPick(t.id)
        }}
      >
        <span className={fp.pickerOptionRow}>
          <Icon name={t.icon ?? 'tag'} size={13} />
          {t.label}
        </span>
      </PickerOption>
    ))

  const valueCell = (
    row: PaneRow,
    index: number,
    op: OperatorChoice | undefined,
  ): React.ReactNode => {
    if (!op || op.slot === 'none') return <span className={fp.valueField} />
    const rule = row.rule
    const def = schema.find((d) => d.id === rule.property_id)
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
              timeFormat={tree?.timeFormat}
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
      // A rule targeting a Context names it directly; a user relation property names it through
      // its def's target.
      const contextId = isContextColumnId(tree, rule.property_id)
        ? rule.property_id
        : def?.context_target?.context_id
      const isContext = type === 'tier' || type === 'context'
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
          chipShape={chipShapeForType(type ?? 'select')}
          onCommit={(values) => patch({ values })}
        />
      )
    }

    // slot === 'set' (Location) — any-of over Sets, so it shares the chips host with every other
    // membership operand. Depth is carried into the label since a nested Set's title alone is ambiguous.
    return (
      <ChipsField
        values={rule.values ?? (rule.value != null ? [rule.value] : [])}
        options={flattenSets(source.sets).map((s) => ({
          value: s.id,
          label: s.title,
          icon: 'folder',
        }))}
        isContext={false}
        chipShape="label"
        emptyLabel="No Sets in this collection."
        onCommit={(values) => patch({ values })}
      />
    )
  }

  const ruleRow = (row: PaneRow, index: number): React.JSX.Element => {
    const ops = operatorsFor(row.rule.property_id, schema, contextIds)
    const current = ops.find(
      (o) =>
        o.op === row.rule.op && (o.impliedValue === undefined || o.impliedValue === row.rule.value),
    )
    const target = targetById.get(row.rule.property_id)
    // The checkbox family leads with THE checkbox component (the table cell's box recipe) —
    // checked wears the def's property-wide checkbox_color (absent = accent), empty stays neutral.
    const isCheckbox = declaredType(row.rule.property_id, schema, contextIds) === 'checkbox'
    const checkboxColor = schema.find((d) => d.id === row.rule.property_id)?.checkbox_color
    const checkboxBox = (o: OperatorChoice): React.JSX.Element => {
      const checked = o.impliedValue === 'true'
      return (
        <span
          className={cx(chipBox, fp.checkBoxScale, checked ? undefined : chipColor.default)}
          style={checkboxBoxStyle(checked, checkboxColor)}
        >
          {checked ? <Icon name="check" size={12} strokeWidth={3} /> : null}
        </span>
      )
    }
    return (
      <RevealRow key={index} animate={index === justAdded}>
        <div className={fp.gridRow}>
          <span className={fp.whatCell}>
            {row.connector !== null && (
              <button
                type="button"
                className={fp.connector}
                aria-label="Toggle connector"
                onClick={() => toggleConnector(index)}
              >
                {row.connector === 'and' ? 'And' : 'Or'}
                <Icon name="chevrons-up-down" size={12} className={fp.chevron} />
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
                )
              }
            </FieldPicker>
          </span>
          <FieldPicker
            ariaLabel="Filter operator"
            chevron
            className={fp.controlField}
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
                    onClick={() => {
                      close()
                      // Operands survive only within the same slot; an implied value writes through.
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
                    {isCheckbox ? (
                      <span className={fp.pickerOptionRow}>
                        {checkboxBox(o)}
                        {o.label}
                      </span>
                    ) : (
                      o.label
                    )}
                  </PickerOption>
                )
              })
            }
          </FieldPicker>
          {valueCell(row, index, current)}
          {/* The pane always keeps one row, so the last one carries no × and runs full width.
              Clearing its operand is the way out — an unauthored rule abstains and filters nothing. */}
          {rows.length > 1 && (
            <button
              type="button"
              className={fp.removeButton}
              aria-label="Remove filter"
              onClick={() => removeRow(index)}
            >
              <Icon name="x" size={11} />
            </button>
          )}
        </div>
      </RevealRow>
    )
  }

  // An empty filter always shows one blank row, so the pane opens ready to author rather than
  // needing the "+" first. That lead row is permanent, so it carries no clear-× and its blank slots
  // run the row's full width.
  const lead = rows.length === 0
  const draftRow = (draft !== false || lead) && (
    <RevealRow animate={!lead}>
      <div className={fp.gridRow}>
        <span className={fp.whatCell}>
          {!lead && (
            // Toggleable before the rule exists: the Or is what splits the list into runs, so the
            // group boundary is chosen here rather than only after the row is written.
            <button
              type="button"
              className={fp.connector}
              aria-label="Toggle connector"
              onClick={() => setDraft(draft === 'or' ? 'and' : 'or')}
            >
              {draft === 'or' ? 'Or' : 'And'}
              <Icon name="chevrons-up-down" size={12} className={fp.chevron} />
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
            <Icon name="x" size={11} />
          </button>
        )}
      </div>
    </RevealRow>
  )

  return (
    <div className={fp.pane}>
      <MenuPaneTopRow label={label} current="Filtering" onBack={onBack} />
      {decoded.kind === 'locked' ? (
        // A locked (hand-authored) tree the pane can't represent: NO Matches control — Reset is the
        // ONLY action that writes, so a stray mode pick can't silently obliterate the authored filter.
        <>
          <div className={fp.lockedCaption}>Hand-authored filter — edited outside the pane.</div>
          <MenuItem
            className={flushTrailing}
            leading={
              <span className={footingSymbol}>
                <Icon name="rotate-ccw" size={12} />
              </span>
            }
            onClick={() => save('all', [])}
          >
            <span className={footingLabel}>Reset Filter</span>
          </MenuItem>
        </>
      ) : (
        <div className={cx(gp.middle, fp.body, 'overflow-eclipse-y')}>
          <div className={fp.grid}>
            {rows.map(ruleRow)}
            {draftRow}
            <button
              type="button"
              className={fp.addRow}
              aria-label="Add filter rule"
              onClick={() => setDraft(rows.length === 0 ? null : connectorFor(mode))}
            >
              <Icon name="plus" size={13} />
            </button>
          </div>
        </div>
      )}
      {/* Outside the branch: a hand-authored filter the pane won't rewrite is exactly the one worth
          parking rather than destroying, so both states reach the footer. */}
      <MenuBottomRow
        leading={
          // Withheld on a hand-authored tree: the pane holds no rows to re-serialize there, so a
          // stray mode pick would write an empty filter over it. Reset stays the only writer.
          decoded.kind === 'rows' ? (
            <span className={fp.footerGroup}>
              <span className={fp.footerLabel}>Matches</span>
              <PickerControl
                ariaLabel="Matches"
                value={mode}
                options={MATCH_OPTIONS}
                onPick={pickMatch}
              />
            </span>
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
    </div>
  )
}
