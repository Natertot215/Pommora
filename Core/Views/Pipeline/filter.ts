// Match modes are all = AND and any = OR at every depth; negation lives on the per-rule operators.

import {
  FILTER_OPS,
  type FilterGroup,
  type FilterRule,
  isGroup,
  OPERANDLESS_OPS,
  ruleOperands,
} from '@pommora/core/Views/views'
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
import type { SetTreeNode } from './group'
import { linkDisplayText } from '@pommora/core/Connections/linkValue'
import { type LocalDate, readDate, startOfDay } from '../../Properties/formatValue'
import { foldKey } from '../../Paths/caseFold'
import { numberFrom } from '@pommora/uix/Pickers/numberUnit'

const FILTER_OP_SET = new Set<string>(Object.values(FILTER_OPS))

type RowTest = (row: ViewRow) => boolean
type Evaluator = (v: PropertyValue, op: string, want: string[]) => boolean

export function applyFilter(
  rows: ViewRow[],
  filter: FilterGroup | undefined,
  schema: PropertyDefinition[],
  setTree: SetTreeNode[] = [],
  contextIds: readonly string[] = [],
): ViewRow[] {
  const test = filter && prepareGroup(filter, schema, setTree, contextIds)
  return test ? rows.filter(test) : rows
}

function prepareGroup(
  group: FilterGroup,
  schema: PropertyDefinition[],
  setTree: SetTreeNode[],
  contextIds: readonly string[],
): RowTest | undefined {
  const tests = group.rules.flatMap((node) => {
    const test = isGroup(node)
      ? prepareGroup(node, schema, setTree, contextIds)
      : prepareRule(node, schema, setTree, contextIds)
    return test ? [test] : []
  })
  if (tests.length === 0) return undefined
  switch (group.match) {
    case 'all':
      return (row) => tests.every((test) => test(row))
    case 'any':
      return (row) => tests.some((test) => test(row))
  }
}

function prepareRule(
  rule: FilterRule,
  schema: PropertyDefinition[],
  setTree: SetTreeNode[],
  contextIds: readonly string[],
): RowTest | undefined {
  const { op, property_id: id } = rule
  const want = ruleOperands(rule)
  if (!FILTER_OP_SET.has(op) || (want.length === 0 && !OPERANDLESS_OPS.has(op))) return undefined
  if (id === RESERVED_PROPERTY_ID.location) return prepareLocation(op, want, setTree)
  const t = declaredType(id, schema, contextIds)
  if (t === undefined) return undefined
  // resolveFieldValue('_title') carries row.title as a select-kind string — the text matrix reads it.
  const evaluate = t === 'title' ? evaluateText : evaluatorOf(PROPERTY_TYPES[t].kind)
  return (row) => evaluate(resolveFieldValue(row, id, schema), op, want)
}

// Is/Isn't test the immediate parent, Contains/Doesn't any depth.
function prepareLocation(op: string, want: string[], setTree: SetTreeNode[]): RowTest | undefined {
  switch (op) {
    case FILTER_OPS.is:
      return ({ parentSetId: p }) => p != null && want.includes(p)
    case FILTER_OPS.isNot:
      return ({ parentSetId: p }) => p == null || !want.includes(p)
    case FILTER_OPS.isInside:
    case FILTER_OPS.isNotInside: {
      const inside = new Set<string>()
      const walk = (nodes: SetTreeNode[], within: boolean): void => {
        for (const n of nodes) {
          const hit = within || want.includes(n.id)
          if (hit) inside.add(n.id)
          walk(n.children, hit)
        }
      }
      walk(setTree, false)
      if (inside.size === 0) return undefined
      const keep = op === FILTER_OPS.isInside
      return ({ parentSetId: p }) => (p != null && inside.has(p)) === keep
    }
    default:
      return undefined
  }
}

function evaluatorOf(kind: ValueKind): Evaluator {
  switch (kind) {
    case 'number':
      return evaluateNumber
    case 'dateTime':
      return evaluateDate
    case 'checkbox':
      return evaluateCheckbox
    case 'select':
    case 'link':
      return evaluateText
    case 'multiSelect':
    case 'context':
      return (v, op, want) =>
        evaluateSet(v.kind === 'multiSelect' || v.kind === 'context' ? v.value : [], op, want)
    case 'file':
      return evaluatePresence
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
