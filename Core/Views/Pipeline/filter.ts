// Match modes are all = AND and any = OR at every depth; negation lives on the per-rule operators. See NO_OP below for the abstain rule.

import type { FilterGroup, FilterRule } from '@pommora/core/Views/views'
import type { ViewRow } from '@pommora/core/Views/viewRow'
import {
  PROPERTY_TYPES,
  type PropertyDefinition,
  RESERVED_PROPERTY_ID,
} from '@pommora/core/Properties/properties'
import {
  isBlankValue,
  type PropertyValue,
  type ValueKind,
} from '@pommora/core/Properties/propertyValue'
import { declaredType, resolveFieldValue } from '../../Properties/value'
import { type SetTreeNode, subtreeIds } from './group'
import { linkDisplayText } from '@pommora/core/Connections/linkValue'
import { type LocalDate, readDate, startOfDay } from '../../Properties/formatValue'
import { foldKey } from '../../Paths/caseFold'
import { numberFrom } from '@pommora/uix/Pickers/numberUnit'

export const FILTER_OPS = {
  is: 'is',
  isNot: 'is_not',
  contains: 'contains',
  doesNotContain: 'does_not_contain',
  isEmpty: 'is_empty',
  isNotEmpty: 'is_not_empty',
  greaterThan: 'greater_than',
  lessThan: 'less_than',
  onOrAfter: 'on_or_after',
  onOrBefore: 'on_or_before',
  startsWith: 'starts_with',
  containsAll: 'contains_all',
  containsAny: 'contains_any',
  isBefore: 'is_before',
  isAfter: 'is_after',
  greaterOrEqual: 'greater_or_equal',
  lessOrEqual: 'less_or_equal',
  isInside: 'is_inside',
  isNotInside: 'is_not_inside',
} as const

const FILTER_OP_SET = new Set<string>(Object.values(FILTER_OPS))

/** Distinct from `false` so it abstains instead of voting either way. */
const NO_OP = null
type Verdict = boolean | typeof NO_OP

/** The ops that are complete without an operand; everything else is unauthored until one arrives. */
export const OPERANDLESS_OPS = new Set<string>([FILTER_OPS.isEmpty, FILTER_OPS.isNotEmpty])

/** Built ONCE per operand and membership-tested per row — never a per-row ancestor walk. Unknown set id → undefined → no-op pass. */
type LocationIndex = (setId: string) => ReadonlySet<string> | undefined

function makeLocationIndex(setTree: SetTreeNode[]): LocationIndex {
  const cache = new Map<string, ReadonlySet<string> | undefined>()
  const find = (nodes: SetTreeNode[], id: string): SetTreeNode | undefined => {
    for (const n of nodes) {
      if (n.id === id) return n
      const hit = find(n.children, id)
      if (hit) return hit
    }
    return undefined
  }
  return (setId) => {
    if (!cache.has(setId)) {
      const node = find(setTree, setId)
      cache.set(setId, node ? new Set(subtreeIds(node)) : undefined)
    }
    return cache.get(setId)
  }
}

export function applyFilter(
  rows: ViewRow[],
  filter: FilterGroup | undefined,
  schema: PropertyDefinition[],
  setTree: SetTreeNode[] = [],
  contextIds: readonly string[] = [],
): ViewRow[] {
  if (!filter) return rows
  const locate = makeLocationIndex(setTree)
  // A whole filter that abstains filters nothing — the row passes. Only a real `false` excludes.
  return rows.filter((row) => matchesGroup(row, filter, schema, locate, contextIds) !== false)
}

function matchesGroup(
  row: ViewRow,
  group: FilterGroup,
  schema: PropertyDefinition[],
  locate: LocationIndex,
  contextIds: readonly string[],
): Verdict {
  // A GROUP abstains too, and must: returning `true` would hand the parent a vote its NO_OP filter can't strip, so a fully-unauthored `(A and B)` inside `(A and B) or C` would suppress C entirely.
  if (group.rules.length === 0) return NO_OP
  const votes = group.rules
    .map((node) =>
      'rules' in node
        ? matchesGroup(row, node, schema, locate, contextIds)
        : evaluateRule(row, node, schema, locate, contextIds),
    )
    .filter((v): v is boolean => v !== NO_OP)
  if (votes.length === 0) return NO_OP
  switch (group.match) {
    case 'all':
      return votes.every(Boolean)
    case 'any':
      return votes.some(Boolean)
  }
}

/** A chip list wins over a single value, as the pane writes one or the other. */
export const ruleOperands = (rule: FilterRule): string[] =>
  rule.values?.length ? rule.values : rule.value != null ? [rule.value] : []

function evaluateRule(
  row: ViewRow,
  rule: FilterRule,
  schema: PropertyDefinition[],
  locate: LocationIndex,
  contextIds: readonly string[],
): Verdict {
  if (!FILTER_OP_SET.has(rule.op)) return NO_OP
  const want = ruleOperands(rule)
  // A rule whose op still wants an operand isn't authored yet — it constrains nothing.
  if (want.length === 0 && !OPERANDLESS_OPS.has(rule.op)) return NO_OP

  if (rule.property_id === RESERVED_PROPERTY_ID.location) {
    // Is/Isn't test the immediate parent, Contains/Doesn't any depth.
    const parent = row.parentSetId
    switch (rule.op) {
      case FILTER_OPS.is:
        return parent != null && want.includes(parent)
      case FILTER_OPS.isNot:
        return parent == null || !want.includes(parent)
      case FILTER_OPS.isInside:
      case FILTER_OPS.isNotInside: {
        const trees = want.map(locate).filter((t): t is ReadonlySet<string> => t !== undefined)
        if (trees.length === 0) return NO_OP
        const hit = parent != null && trees.some((t) => t.has(parent))
        return rule.op === FILTER_OPS.isInside ? hit : !hit
      }
      default:
        return NO_OP
    }
  }

  const t = declaredType(rule.property_id, schema, contextIds)
  if (t === undefined) return NO_OP
  const v = resolveFieldValue(row, rule.property_id, schema)
  // resolveFieldValue('_title') carries row.title as a select-kind string — the text matrix reads it.
  return t === 'title'
    ? evaluateText(v, rule.op, want)
    : evaluateByKind(v, rule.op, want, PROPERTY_TYPES[t].kind)
}

function evaluateByKind(v: PropertyValue, op: string, want: string[], kind: ValueKind): boolean {
  switch (kind) {
    case 'number':
      return evaluateNumber(v, op, want)
    case 'dateTime':
      return evaluateDate(v, op, want)
    case 'checkbox':
      return evaluateCheckbox(v, op, want)
    case 'select':
    case 'link':
      return evaluateText(v, op, want)
    case 'multiSelect':
    case 'context':
      return evaluateSet(v.kind === 'multiSelect' || v.kind === 'context' ? v.value : [], op, want)
    case 'file':
      return evaluatePresence(v, op)
  }
}

function parseBool(s: string): boolean | null {
  switch (s.toLowerCase()) {
    case 'true':
    case '1':
    case 'yes':
      return true
    case 'false':
    case '0':
    case 'no':
      return false
    default:
      return null
  }
}

function textValue(v: PropertyValue): string | null {
  switch (v.kind) {
    case 'select':
      return v.value
    case 'link':
      // Match the SHOWN text (alias, else URL) — the same parse Cell renders, so a `contains` on an aliased link tests the visible text, not its raw markdown.
      return linkDisplayText(v.value)
    case 'number':
    case 'checkbox':
    case 'dateTime':
    case 'multiSelect':
    case 'context':
    case 'file':
    case 'null':
      return null
  }
}

function evaluateNumber(v: PropertyValue, op: string, want: string[]): boolean {
  const n = v.kind === 'number' ? v.value : null
  switch (op) {
    case FILTER_OPS.isEmpty:
      return n === null
    case FILTER_OPS.isNotEmpty:
      return n !== null
  }
  const e = numberFrom(want[0])
  if (e === undefined) return true
  switch (op) {
    case FILTER_OPS.is:
      return n === e
    case FILTER_OPS.isNot:
      return n !== e
    case FILTER_OPS.greaterThan:
      return n !== null && n > e
    case FILTER_OPS.lessThan:
      return n !== null && n < e
    case FILTER_OPS.greaterOrEqual:
      return n !== null && n >= e
    case FILTER_OPS.lessOrEqual:
      return n !== null && n <= e
    default:
      return true
  }
}

const dayMs = (d: LocalDate): number => startOfDay(d.at).getTime()

/** Days are the local days the cells show. `is` compares days; a bare-day operand orders by day, and one carrying a time orders by instant. */
function evaluateDate(v: PropertyValue, op: string, want: string[]): boolean {
  const value = v.kind === 'dateTime' ? readDate(v.value) : null
  switch (op) {
    case FILTER_OPS.isEmpty:
      return value === null
    case FILTER_OPS.isNotEmpty:
      return value !== null
  }
  const target = readDate(want[0])
  if (target === null) return true
  const ms = (x: LocalDate): number => (target.timed ? x.at.getTime() : dayMs(x))
  const d = value && ms(value)
  const e = ms(target)
  switch (op) {
    case FILTER_OPS.is:
      return value !== null && dayMs(value) === dayMs(target)
    case FILTER_OPS.isBefore:
      return d !== null && d < e
    case FILTER_OPS.isAfter:
      return d !== null && d > e
    case FILTER_OPS.onOrAfter:
      return d !== null && d >= e
    case FILTER_OPS.onOrBefore:
      return d !== null && d <= e
    default:
      return true
  }
}

function evaluateCheckbox(v: PropertyValue, op: string, want: string[]): boolean {
  const b = v.kind === 'checkbox' ? v.value : false
  switch (op) {
    case FILTER_OPS.isEmpty:
      return v.kind !== 'checkbox'
    case FILTER_OPS.is:
    case FILTER_OPS.isNot: {
      const e = parseBool(want[0])
      if (e === null) return true
      return op === FILTER_OPS.is ? b === e : b !== e
    }
    default:
      return true
  }
}

function evaluateText(v: PropertyValue, op: string, want: string[]): boolean {
  const s = textValue(v)
  switch (op) {
    case FILTER_OPS.isEmpty:
      return s === null || s === ''
    case FILTER_OPS.isNotEmpty:
      return !(s === null || s === '')
    case FILTER_OPS.is:
      return s !== null && want.includes(s)
    case FILTER_OPS.isNot:
      return s === null || !want.includes(s)
    case FILTER_OPS.contains:
      return s !== null && foldKey(s).includes(foldKey(want[0]))
    case FILTER_OPS.doesNotContain:
      return s === null || !foldKey(s).includes(foldKey(want[0]))
    case FILTER_OPS.startsWith:
      return s !== null && foldKey(s).startsWith(foldKey(want[0]))
    default:
      return true
  }
}

function evaluateSet(xs: string[], op: string, want: string[]): boolean {
  switch (op) {
    case FILTER_OPS.isEmpty:
      return xs.length === 0
    case FILTER_OPS.isNotEmpty:
      return xs.length > 0
    case FILTER_OPS.containsAll:
      return want.every((w) => xs.includes(w))
    case FILTER_OPS.is:
    case FILTER_OPS.contains:
    case FILTER_OPS.containsAny:
      return want.some((w) => xs.includes(w))
    case FILTER_OPS.isNot:
    case FILTER_OPS.doesNotContain:
      return !want.some((w) => xs.includes(w))
    default:
      return true
  }
}

function evaluatePresence(v: PropertyValue, op: string): boolean {
  const empty = isBlankValue(v)
  switch (op) {
    case FILTER_OPS.isEmpty:
      return empty
    case FILTER_OPS.isNotEmpty:
      return !empty
    default:
      return true
  }
}
