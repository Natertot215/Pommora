// Match modes are all = AND and any = OR at every depth; negation lives on the per-rule operators.

import {
  FILTER_OPS,
  type FilterGroup,
  type FilterRule,
  answerable,
  isGroup,
  ruleOperands,
} from '../filterRules'
import type { ViewRow } from '../viewRow'
import { FILEDATA, PROPERTY_TYPES, type PropertyDefinition } from '../../Properties/properties'
import {
  checkboxWord,
  isBlankValue,
  optionLabel,
  type PropertyValue,
  readNumber,
  selectedValues,
  type ValueKind,
} from '../../Properties/propertyValue'
import { declaredType, resolveFieldValue } from '../../Properties/fieldValue'
import type { SetTreeNode } from './group'
import { linkDisplayText, shownProse } from '../../Connections/linkValue'
import { dayMs, readDate } from '../../Properties/formatValue'
import { foldKey } from '../../Paths/caseFold'
import { isUlidShaped } from '../../Nexus/identityMark'

const FILTER_OP_SET = new Set<string>(Object.values(FILTER_OPS))

type RowTest = (row: ViewRow) => boolean
type Evaluator = (v: PropertyValue, op: string, want: string[], def?: PropertyDefinition) => boolean

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

/** `undefined` when no rule applies. */
export function prepareGroup(
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

/** `undefined` when the rule abstains: an unknown op, an unauthored operand, a property the schema lacks, or a Location naming only dead ids. */
export function prepareRule(
  rule: FilterRule,
  schema: PropertyDefinition[],
  setTree: SetTreeNode[],
  contextIds: readonly string[],
): RowTest | undefined {
  const { op, property_id: id } = rule
  const want = ruleOperands(rule)
  if (!FILTER_OP_SET.has(op) || !answerable(rule)) return undefined
  if (id === FILEDATA.location.id) return prepareLocation(op, want, setTree)
  const t = declaredType(id, schema, contextIds)
  if (t === undefined) return undefined
  const evaluate = evaluatorOf(PROPERTY_TYPES[t].kind, op)
  const operands = evaluate === evaluateText ? want.map(foldKey) : want
  const def = schema.find((d) => d.id === id)
  return (row) => evaluate(resolveFieldValue(row, id, schema), op, operands, def)
}

// Is/Isn't test the immediate parent by id, Contains/Doesn't any depth by id or folder name. Ids naming no folder are dead and abstain; an unmatched name matches nothing.
function prepareLocation(op: string, want: string[], setTree: SetTreeNode[]): RowTest | undefined {
  switch (op) {
    case FILTER_OPS.is:
      return ({ parentSetId: p }) => p != null && want.includes(p)
    case FILTER_OPS.isNot:
      return ({ parentSetId: p }) => p == null || !want.includes(p)
    case FILTER_OPS.isInside:
    case FILTER_OPS.isNotInside: {
      const inside = new Set<string>()
      const names = new Set(want.map(foldKey))
      const hit = (n: SetTreeNode): boolean => want.includes(n.id) || names.has(foldKey(n.title))
      const walk = (nodes: SetTreeNode[], within: boolean): void => {
        for (const n of nodes) {
          const held = within || hit(n)
          if (held) inside.add(n.id)
          walk(n.sets ?? [], held)
        }
      }
      walk(setTree, false)
      if (inside.size === 0 && want.every(isUlidShaped)) return undefined
      const keep = op === FILTER_OPS.isInside
      return ({ parentSetId: p }) => (p != null && inside.has(p)) === keep
    }
    default:
      return undefined
  }
}

function evaluatorOf(kind: ValueKind, op: string): Evaluator {
  switch (kind) {
    case 'number':
      return evaluateNumber
    case 'dateTime':
      return evaluateDate
    case 'checkbox':
      return evaluateCheckbox
    case 'select':
      return op === FILTER_OPS.is || op === FILTER_OPS.isNot ? evaluateMembers : evaluateText
    case 'link':
    case 'text':
      return evaluateText
    case 'multiSelect':
    case 'context':
      return evaluateMembers
    case 'file':
      return evaluatePresence
  }
}

function textValue(v: PropertyValue, def?: PropertyDefinition): string | null {
  switch (v.kind) {
    case 'select':
      return optionLabel(def, v.value)
    case 'text':
      return shownProse(v.value)
    case 'link':
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
  const e = readNumber(want[0])
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

/** Days are the local days the cells show. `is` matches a day the value spans; a bare-day operand orders by day, and one carrying a time orders by instant. The Starts ops and the strict pair read a span's start, the Ends ops its end. */
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
  const ms = (x: Date): number => (target.timed ? x.getTime() : dayMs(x))
  const last = value && (value.end ?? value.at)
  const start = value && ms(value.at)
  // A clockless end holds its whole day, so a timed operand meets it at the day's last instant.
  const end =
    last &&
    (value.timed || !target.timed
      ? ms(last)
      : new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1).getTime() - 1)
  const e = ms(target.at)
  switch (op) {
    case FILTER_OPS.is: {
      const day = dayMs(target.at)
      return value !== null && dayMs(value.at) <= day && day <= dayMs(value.end ?? value.at)
    }
    case FILTER_OPS.isBefore:
      return start !== null && start < e
    case FILTER_OPS.isAfter:
      return start !== null && start > e
    case FILTER_OPS.onOrAfter:
      return start !== null && start >= e
    case FILTER_OPS.onOrBefore:
      return start !== null && start <= e
    case FILTER_OPS.endsOnOrAfter:
      return end !== null && end >= e
    case FILTER_OPS.endsOnOrBefore:
      return end !== null && end <= e
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
      const e = checkboxWord(want[0])
      if (e === null) return true
      return op === FILTER_OPS.is ? b === e : b !== e
    }
    default:
      return true
  }
}

// `want` arrives folded; the value folds once here.
function evaluateText(
  v: PropertyValue,
  op: string,
  want: string[],
  def?: PropertyDefinition,
): boolean {
  const s = textValue(v, def)
  switch (op) {
    case FILTER_OPS.isEmpty:
      return s === null || s === ''
    case FILTER_OPS.isNotEmpty:
      return !(s === null || s === '')
  }
  const f = s === null ? null : foldKey(s)
  switch (op) {
    case FILTER_OPS.is:
      return f !== null && want.includes(f)
    case FILTER_OPS.isNot:
      return f === null || !want.includes(f)
    case FILTER_OPS.contains:
      return f?.includes(want[0]) ?? false
    case FILTER_OPS.doesNotContain:
      return f === null || !f.includes(want[0])
    case FILTER_OPS.startsWith:
      return f?.startsWith(want[0]) ?? false
    default:
      return true
  }
}

function evaluateMembers(v: PropertyValue, op: string, want: string[]): boolean {
  const xs = selectedValues(v)
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
