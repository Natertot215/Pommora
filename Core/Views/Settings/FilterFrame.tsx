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
import type { PaneTarget } from '../../Properties/Cells/PropertyTypes'
import { Icon } from '@pommora/uix/Symbols'
import { TokenField } from '@pommora/uix/Fields/TokenField'
import { foldKey, matchScore } from '../../Paths/caseFold'
import { leading } from '@pommora/uix/Fields/fields.css'
import { EntityIcon } from '../../Assets/EntityIcon'
import { colorNameFor } from '@pommora/uix/Theme/ramp'
import {
  AccessoryButton,
  DisclosureRow,
  MenuFooting,
  MenuCaption,
  MenuItem,
  FootingCreate,
  FootingItem,
  MenuScrollFrame,
  MenuTopRow,
  pickRuns,
  useDisclosureSet,
} from '@pommora/uix/Menus'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import { PICKER_MAX_HEIGHT, treePane } from '@pommora/uix/Pickers/picker-base.css'
import { OverScroll } from '@pommora/uix/Interactions/OverScroll'
import { useKeepInView, usePaneCtl } from '@pommora/uix/Interactions/paneCtl'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import { CalendarPicker } from '@pommora/uix/Pickers/CalendarPicker'
import { contextIdsOf } from '../../Contexts/contextIdentity'
import { useStyleFor } from '../Host/useColumnStyles'
import { useSetting } from '../../Session/store'
import { formatDate, readDate } from '../../Properties/formatValue'
import { contextOptionsFor } from '../../Contexts/contextOptions'
import { declaredType } from '../../Properties/value'
import { checkboxWord } from '../../Properties/propertyValue'
import {
  PropertyOptionRows,
  pickShape,
  syntheticContextDef,
  toggleValue,
} from '../../Properties/Pickers/PropertyPicker'
import { CheckboxGlyph } from '../../Properties/Cells/CheckboxGlyph'
import { onActivateKey } from '@pommora/uix/Interactions/activate'
import { cx } from '@pommora/uix/Utilities/cx'
import { PickerControl, type PickerOption } from '@pommora/uix/Pickers/PickerControl'
import {
  type DecodedFilter,
  type OperatorChoice,
  decodeFilter,
  filterTargets,
  operatorsFor,
} from '../filterModel'
import * as fp from './filter-frame.css'
import { NeutralChip } from '@pommora/uix/Labels/recipes'
import { OptionChip } from '../../Properties/Cells/OptionChip'
import { EditableInput } from '@pommora/uix/Fields/EditableInput'
import { sameItems } from '@pommora/uix/Utilities/same'

const MATCH_OPTIONS: PickerOption<MatchMode>[] = [
  { value: 'all', label: 'All' },
  { value: 'any', label: 'Any' },
]

const ACTIVE_OPTIONS: PickerOption<'on' | 'off'>[] = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
]

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

function useMultiValue(
  values: string[],
  onCommit: (next: string[]) => void,
): { shown: string[]; toggle: (v: string) => void } {
  const [local, setLocal] = useState<string[] | null>(null)
  if (local && sameItems(local, values)) setLocal(null)
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

type Folder = CollectionNode | SetNode

/** Matches with their whole subtrees, under the ancestors that lead to them; `leads` names those ancestors, which open by default. */
function narrowed(nodes: Folder[], query: string): { nodes: Folder[]; leads: Set<string> } {
  const leads = new Set<string>()
  const walk = <N extends Folder>(ns: N[]): N[] =>
    ns.flatMap((n) => {
      const sets = walk(n.sets ?? [])
      if (sets.length > 0) leads.add(n.id)
      if (matchScore(foldKey(n.title), query) !== null) return [n]
      return sets.length > 0 ? [{ ...n, sets }] : []
    })
  return { nodes: walk(nodes), leads }
}

const shownRows = (nodes: Folder[], isOpen: (id: string) => boolean): Folder[] =>
  nodes.flatMap((n) => [n, ...(isOpen(n.id) ? shownRows(n.sets ?? [], isOpen) : [])])

function LocationTree({
  nodes,
  shown,
  disclosure,
  activeId,
  keepInView,
  onPick,
}: {
  nodes: Folder[]
  shown: string[]
  disclosure: { has: (id: string) => boolean; toggle: (id: string) => void }
  activeId: string | null
  keepInView: (el: HTMLElement | null) => void
  onPick: (id: string) => void
}): React.JSX.Element {
  const renderLevel = (ns: Folder[]): React.JSX.Element[] => {
    const runs = pickRuns(
      ns.map((n) => shown.includes(n.id)),
      ns.map((n) => disclosure.has(n.id) && (n.sets?.length ?? 0) > 0),
    )
    return ns.map((n, i) => {
      const kids = n.sets ?? []
      const active = n.id === activeId
      return (
        <DisclosureRow
          key={n.id}
          ref={active ? keepInView : undefined}
          title={n.title}
          icon={<EntityIcon kind={n.kind} icon={n.icon} size="body" />}
          dropOutline={kids.length > 0 ? 'chevron' : 'spacer'}
          open={disclosure.has(n.id)}
          onToggle={() => disclosure.toggle(n.id)}
          onClick={() => onPick(n.id)}
          active={active}
          picked={runs[i]}
        >
          {kids.length > 0 ? renderLevel(kids) : undefined}
        </DisclosureRow>
      )
    })
  }
  return (
    <MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT}>
      {nodes.length === 0 ? emptyPicker('No Sets in this collection.') : renderLevel(nodes)}
    </MenuScrollFrame>
  )
}

function LocationField({
  values,
  nodes,
  folderById,
  names,
  onCommit,
}: {
  values: string[]
  nodes: Folder[]
  folderById: ReadonlyMap<string, Folder>
  names: boolean
  onCommit: (next: string[]) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const { shown, toggle } = useMultiValue(values, onCommit)
  const expanded = useDisclosureSet()
  const flipped = useDisclosureSet()
  const q = foldKey(draft.trim())
  const tree = useMemo(
    () => (q ? narrowed(nodes, q) : { nodes, leads: new Set<string>() }),
    [nodes, q],
  )
  const disclosure = q
    ? { has: (id: string) => tree.leads.has(id) !== flipped.has(id), toggle: flipped.toggle }
    : expanded
  const rows = shownRows(tree.nodes, disclosure.has)
  const pick = (id: string): void => {
    toggle(id)
    setDraft('')
  }
  const enter = (name: string): void => {
    if (!names) return
    const fold = foldKey(name)
    if (!shown.some((v) => foldKey(v) === fold)) toggle(name)
    setDraft('')
  }
  const dismiss = (): void => {
    setOpen(false)
    setDraft('')
  }
  const { row, ctl } = usePaneCtl(
    rows,
    open ? draft : null,
    { open, pick: (n) => pick(n.id), close: dismiss },
    null,
  )
  const keepInView = useKeepInView(row?.id)

  return (
    <>
      <TokenField
        ref={ref}
        chrome="bordered"
        className={fp.locationField}
        entries={shown.map((v) => {
          const node = folderById.get(v)
          return {
            key: v,
            label: node?.title ?? v,
            icon: node ? (
              <EntityIcon kind={node.kind} icon={node.icon} size="body" />
            ) : (
              <Icon name="folder-search" size="body" />
            ),
            onRemove: () => toggle(v),
          }
        })}
        draft={draft}
        placeholder="Value"
        ariaLabel="Filter values"
        onFocus={() => setOpen(true)}
        onBlur={dismiss}
        onPress={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            if (open) ctl.current.move(e.key === 'ArrowDown' ? 1 : -1)
            else setOpen(true)
          } else if (e.key === 'Enter' && open && row) {
            e.preventDefault()
            ctl.current.pick()
          }
        }}
        onDraftChange={(d) => {
          setDraft(d)
          setOpen(true)
        }}
        onEnter={enter}
      />
      <PickerMenu
        open={open && (!q || tree.nodes.length > 0)}
        onDismiss={dismiss}
        triggerRef={ref}
        origin="left"
        contentClassName={treePane}
        focus="keep"
      >
        {open && (
          <LocationTree
            nodes={tree.nodes}
            shown={shown}
            disclosure={disclosure}
            activeId={row?.id ?? null}
            keepInView={keepInView}
            onPick={pick}
          />
        )}
      </PickerMenu>
    </>
  )
}

function ChipsField({
  values,
  def,
  contextOptions,
  onCommit,
}: {
  values: string[]
  def: PropertyDefinition
  contextOptions?: PickOption[]
  onCommit: (next: string[]) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { shown, toggle } = useMultiValue(values, onCommit)
  const { options } = pickShape(def, contextOptions)
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
                  type={def.type}
                  option={o ?? { value: v }}
                  onRemove={() => toggle(v)}
                />
              )
            })}
          </OverScroll>
        )}
      </ValueFieldShell>
      <PickerMenu open={open} onDismiss={() => setOpen(false)} triggerRef={ref}>
        {!open ? null : options.length === 0 ? (
          emptyPicker('No options yet.')
        ) : (
          <PropertyOptionRows
            def={def}
            contextOptions={contextOptions}
            selected={shown}
            onPick={toggle}
          />
        )}
      </PickerMenu>
    </>
  )
}

function flattenNodes(nodes: Folder[] | undefined): Folder[] {
  return (nodes ?? []).flatMap((n) => [n, ...flattenNodes(n.sets)])
}

export type FilterView = Pick<SavedView, 'filter' | 'filter_enabled' | 'column_styles'>
export type FilterPatch = { filter: SavedView['filter'] } | { filter_enabled: boolean }

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
  onCommit,
}: {
  locations: (CollectionNode | SetNode)[]
  view: FilterView
  read: () => FilterView
  schema: PropertyDefinition[]
  tree: NexusTree | null
  back?: { label: string; onBack: () => void }
  targets?: PaneTarget[]
  onCommit: (patch: FilterPatch) => void
}): React.JSX.Element {
  const styleFor = useStyleFor()
  const nexusClock = useSetting('timeFormat')
  const [drafting, setDrafting] = useState(false)

  const [pendingMode, setPendingMode] = useState<MatchMode | null>(null)

  const decoded: DecodedFilter = decodeFilter(view.filter)
  const rules: FilterRule[] = decoded.kind === 'rows' ? decoded.rules : []
  const decodedMode: MatchMode = decoded.kind === 'rows' ? decoded.mode : 'any'
  const mode: MatchMode = rules.length === 0 ? (pendingMode ?? decodedMode) : decodedMode

  const save = (nextMode: MatchMode, next: FilterRule[]): void =>
    onCommit({ filter: next.length ? { match: nextMode, rules: next } : undefined })

  const liveRules = (): FilterRule[] => {
    const d = decodeFilter(read().filter)
    return d.kind === 'rows' ? d.rules : []
  }

  const setEnabled = (next: boolean): void => onCommit({ filter_enabled: next })

  const entering = useEntrance(rules, (_, i) => String(i))

  const contextIds = contextIdsOf(tree)
  const targets = supplied ?? filterTargets(schema, tree, locations.length > 0)
  const defById = new Map(schema.map((d) => [d.id, d]))
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

  const removeRow = (index: number): void =>
    save(
      mode,
      liveRules().filter((_, i) => i !== index),
    )

  const completeDraft = (targetId: string): void => {
    setDrafting(false)
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
  ): React.ReactNode => {
    if (!op || op.slot === 'none') return null
    const operands = ruleOperands(rule)
    const operand = operands[0] ?? ''
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
      const fmtRaw = styleFor(rule.property_id, schema, view).date_format
      const fmt = fmtRaw === 'relative' ? 'short' : fmtRaw
      return (
        <FieldPicker
          ariaLabel="Filter date"
          className={fp.valueField}
          display={operand ? formatDate(operand, fmt, 'none') : null}
          placeholder="Date"
        >
          {() => (
            <CalendarPicker
              value={operand ? readDate(operand) : null}
              timeFormat={nexusClock}
              formatDateValue={(k) => formatDate(k, fmt, 'none')}
              onChange={(iso) => patch({ value: iso ?? undefined })}
            />
          )}
        </FieldPicker>
      )
    }

    if (op.slot === 'chips')
      return (
        <ChipsField
          values={operands}
          def={def ?? syntheticContextDef(rule.property_id)}
          contextOptions={
            tree && declaredType(rule.property_id, schema, contextIds) === 'context'
              ? contextOptionsFor(rule.property_id, tree)
              : undefined
          }
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
    const ops = operatorsFor(rule.property_id, schema, contextIds)
    const current = ops.find(
      (o) =>
        o.op === rule.op &&
        (o.impliedValue === undefined ||
          checkboxWord(o.impliedValue) === checkboxWord(ruleOperands(rule)[0])),
    )
    const target = targetById.get(rule.property_id)
    const isCheckbox = declaredType(rule.property_id, schema, contextIds) === 'checkbox'
    const checkboxColor = defById.get(rule.property_id)?.checkbox_color
    const checkboxLook = styleFor(rule.property_id, schema, view).look
    const checkboxBox = (o: OperatorChoice): React.JSX.Element => (
      <CheckboxGlyph
        checked={o.impliedValue === 'true'}
        color={checkboxColor}
        look={checkboxLook}
      />
    )
    return (
      <Reveal key={index} open enterOnMount={entering(String(index))} fill>
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
          {valueCell(rule, index, current)}
          <AccessoryButton
            icon="x"
            size="control"
            ariaLabel="Remove filter"
            onClick={() => removeRow(index)}
          />
        </div>
      </Reveal>
    )
  }

  const lead = rules.length === 0
  const draftRow = (drafting || lead) && (
    <Reveal open enterOnMount={!lead} fill>
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
        {!lead && (
          <AccessoryButton
            icon="x"
            size="control"
            ariaLabel="Remove filter"
            onClick={() => setDrafting(false)}
          />
        )}
      </div>
    </Reveal>
  )

  return (
    <MenuScrollFrame
      className={fp.frame}
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
          {rules.map(ruleRow)}
          {draftRow}
          <FootingCreate ariaLabel="Add filter rule" onClick={() => setDrafting(true)} />
        </div>
      )}
    </MenuScrollFrame>
  )
}
