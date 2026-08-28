// Type-aware view filter. A per-rule, per-type operator matrix with
// nested groups (a rule child may itself be a FilterGroup, expressing mixed AND/OR like
// `(A AND B) OR C`), title + context + any-depth location matrices, and multi-operand `values[]`
// chip ops. `op` raw strings are snake_case (on-disk parity). Match modes are all = AND and
// any = OR at every depth; negation lives on the per-rule operators.
//
// A rule that CANNOT be applied — unknown op, dead property or set, an operand not yet supplied —
// abstains rather than voting, so a filter never excludes on what it can't apply. That has to be a
// third verdict, not a `true`: a pass would hand the parent group a vote it never earned.
// Pure: no fs, no React.

import type { FilterGroup, FilterRule } from '@shared/views'
import type { ViewRow } from '@shared/types'
import {
  type PropertyDefinition,
  type PropertyType,
  RESERVED_PROPERTY_ID,
} from '@shared/properties'
import { isBlankValue, type PropertyValue } from '@shared/propertyValue'
import { declaredType, modifiedStampString, resolveFieldValue } from '@renderer/Properties/value'
import { type SetTreeNode, subtreeIds } from './group'
import { linkDisplayText } from '@shared/linkValue'

/** Operator raw strings — snake_case = the on-disk `op` values. */
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

type Op = string
type Expected = string | undefined

/** A rule that cannot be applied — an unknown op, a dead property or set, or an operand the user
 *  hasn't supplied yet. Distinct from `false` so it abstains instead of voting either way. */
const NO_OP = null
type Verdict = boolean | typeof NO_OP

/** The ops that are complete without an operand; everything else is unauthored until one arrives. */
const OPERANDLESS_OPS = new Set<string>([FILTER_OPS.isEmpty, FILTER_OPS.isNotEmpty])

/** Per-applyFilter location resolver — a set id to its descendant-id Set (self included), built
 *  ONCE per operand and membership-tested per row (never a per-row ancestor walk). Unknown set
 *  id → undefined → no-op pass. */
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

/** Filter rows by a (possibly nested) FilterGroup. undefined ⇒ no filtering. */
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

function isGroup(node: FilterRule | FilterGroup): node is FilterGroup {
  return 'rules' in node
}

function matchesGroup(
  row: ViewRow,
  group: FilterGroup,
  schema: PropertyDefinition[],
  locate: LocationIndex,
  contextIds: readonly string[],
): Verdict {
  // A GROUP abstains too, and must — returning `true` here would hand the parent a vote its own
  // NO_OP filter can't strip, so a fully-unauthored `(A and B)` inside `(A and B) or C` would read
  // as a match and suppress C's filtering entirely.
  if (group.rules.length === 0) return NO_OP
  // Only rules that can actually be applied get a vote — a no-op verdict never reads as a MATCH.
  const votes = group.rules
    .map((node) =>
      isGroup(node)
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

function evaluateRule(
  row: ViewRow,
  rule: FilterRule,
  schema: PropertyDefinition[],
  locate: LocationIndex,
  contextIds: readonly string[],
): Verdict {
  if (!FILTER_OP_SET.has(rule.op)) return NO_OP

  // "Last edited" resolves to the modified∥created stamp (never a stored property) → date matrix.
  if (rule.property_id === RESERVED_PROPERTY_ID.modifiedAt) {
    const s = modifiedStampString(row)
    return evaluateDate(s ? { kind: 'datetime', value: s } : { kind: 'null' }, rule.op, rule.value)
  }

  // Location — not a property: membership of the row's parent set in the operand's subtree.
  if (rule.property_id === RESERVED_PROPERTY_ID.location) {
    // Runs BEFORE the generic unauthored-operand guard, so it owns its own. Every location op is
    // any-of over the chosen Sets; Is/Isn't test the immediate parent, Contains/Doesn't any depth.
    const want = rule.values?.length ? rule.values : rule.value != null ? [rule.value] : []
    if (want.length === 0) return NO_OP
    const parent = row.parentSetId
    switch (rule.op) {
      case FILTER_OPS.is:
        return parent != null && want.includes(parent)
      case FILTER_OPS.isNot:
        return parent == null || !want.includes(parent)
      case FILTER_OPS.isInside:
      case FILTER_OPS.isNotInside: {
        const trees = want.map(locate).filter((t): t is ReadonlySet<string> => t !== undefined)
        if (trees.length === 0) return NO_OP // every id dead — nothing to apply
        const hit = parent != null && trees.some((t) => t.has(parent))
        return rule.op === FILTER_OPS.isInside ? hit : !hit
      }
      default:
        return NO_OP
    }
  }

  const t = declaredType(rule.property_id, schema, contextIds)
  if (t === undefined) return NO_OP // property absent from schema/registry
  // A rule whose op still wants an operand isn't authored yet — it constrains nothing.
  if (!OPERANDLESS_OPS.has(rule.op) && rule.value == null && !rule.values?.length) return NO_OP
  return evaluateByType(
    resolveFieldValue(row, rule.property_id, schema),
    rule.op,
    rule.value,
    rule.values,
    t,
  )
}

function evaluateByType(
  v: PropertyValue,
  op: Op,
  expected: Expected,
  values: string[] | undefined,
  t: PropertyType | 'title',
): boolean {
  switch (t) {
    case 'number':
      return evaluateNumber(v, op, expected)
    case 'datetime':
    case 'last_edited_time':
      return evaluateDate(v, op, expected)
    case 'checkbox':
      return evaluateCheckbox(v, op, expected)
    // Status stores its bare label like a select, but this switch reads the DECLARED TYPE, not
    // the value's kind — dropping the case here sends every Status rule to the no-op default.
    case 'status':
    case 'select':
    case 'url':
      return evaluateText(v, op, expected, values)
    case 'multi_select':
      return evaluateMulti(v, op, expected, values)
    case 'title':
      // resolveFieldValue('_title') carries row.title as a select-kind string — the text matrix reads it.
      return evaluateText(v, op, expected, values)
    case 'context':
      return evaluateList(v.kind === 'context' ? v.value : [], op, expected, values)
    case 'file':
      return evaluatePresence(v, op)
    default: // any unmodeled type → no-op pass
      return true
  }
}

function parseNum(s: Expected): number | null {
  if (s == null || s.trim() === '') return null
  const n = Number(s)
  return Number.isNaN(n) ? null : n
}

function parseDateMs(s: Expected): number | null {
  if (s == null) return null
  const t = Date.parse(s)
  return Number.isNaN(t) ? null : t
}

function parseBool(s: Expected): boolean | null {
  switch (s?.toLowerCase()) {
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
    case 'url':
      // Match the SHOWN text (alias, else URL) — the same parse Cell renders, so a `contains`/`is` on an
      // aliased link tests the visible text, not its raw `[alias](url)` markdown.
      return linkDisplayText(v.value)
    default:
      return null
  }
}

// An unmatched op is a no-op pass.

function evaluateNumber(v: PropertyValue, op: Op, expected: Expected): boolean {
  const n = v.kind === 'number' ? v.value : null
  switch (op) {
    case FILTER_OPS.isEmpty:
      return n === null
    case FILTER_OPS.isNotEmpty:
      return n !== null
    case FILTER_OPS.is: {
      const e = parseNum(expected)
      return e === null ? true : n !== null && n === e
    }
    case FILTER_OPS.isNot: {
      const e = parseNum(expected)
      return n === null || e === null ? true : n !== e
    }
    case FILTER_OPS.greaterThan: {
      const e = parseNum(expected)
      return e === null ? true : n !== null && n > e
    }
    case FILTER_OPS.lessThan: {
      const e = parseNum(expected)
      return e === null ? true : n !== null && n < e
    }
    case FILTER_OPS.greaterOrEqual: {
      const e = parseNum(expected)
      return e === null ? true : n !== null && n >= e
    }
    case FILTER_OPS.lessOrEqual: {
      const e = parseNum(expected)
      return e === null ? true : n !== null && n <= e
    }
    default:
      return true
  }
}

/** Calendar-day truncation for date `is`: both sides compared by their ISO date component —
 *  never exact-ms equality (a stored T14:30 must match its picked bare day). String truncation, not
 *  Date math: the stored day IS the authored day regardless of the viewer's timezone. */
const dayOf = (iso: string): string => iso.slice(0, 10)

function evaluateDate(v: PropertyValue, op: Op, expected: Expected): boolean {
  const d = v.kind === 'datetime' ? parseDateMs(v.value) : null
  switch (op) {
    case FILTER_OPS.isEmpty:
      return d === null
    case FILTER_OPS.isNotEmpty:
      return d !== null
    case FILTER_OPS.is: {
      const raw = v.kind === 'datetime' ? v.value : null
      return expected == null ? true : raw !== null && dayOf(raw) === dayOf(expected)
    }
    case FILTER_OPS.isBefore: {
      const e = parseDateMs(expected)
      return e === null ? true : d !== null && d < e
    }
    case FILTER_OPS.isAfter: {
      const e = parseDateMs(expected)
      return e === null ? true : d !== null && d > e
    }
    case FILTER_OPS.onOrAfter: {
      const e = parseDateMs(expected)
      return e === null ? true : d !== null && d >= e
    }
    case FILTER_OPS.onOrBefore: {
      const e = parseDateMs(expected)
      return e === null ? true : d !== null && d <= e
    }
    default:
      return true
  }
}

function evaluateCheckbox(v: PropertyValue, op: Op, expected: Expected): boolean {
  const present = v.kind === 'checkbox'
  const b = v.kind === 'checkbox' ? v.value : false
  switch (op) {
    case FILTER_OPS.isEmpty:
      return !present
    case FILTER_OPS.is: {
      const e = parseBool(expected)
      return e === null ? true : b === e
    }
    case FILTER_OPS.isNot: {
      const e = parseBool(expected)
      return e === null ? true : b !== e
    }
    default:
      return true
  }
}

/** The one set-membership core for multi_select AND id-lists (Context columns/context). An empty `want` on
 *  the any-shaped op passes — a mid-authoring empty chip set never blanks the table;
 *  contains_all passes empty for free ([].every()). Returns undefined for ops it doesn't own, so
 *  each caller keeps its own single-operand/presence branches. */
function matchesSet(xs: string[], op: Op, want: string[]): boolean | undefined {
  switch (op) {
    case FILTER_OPS.containsAny:
      return want.length === 0 ? true : want.some((w) => xs.includes(w))
    case FILTER_OPS.containsAll:
      return want.every((w) => xs.includes(w))
    default:
      return undefined
  }
}

function evaluateText(v: PropertyValue, op: Op, expected: Expected, values?: string[]): boolean {
  const s = textValue(v)
  switch (op) {
    case FILTER_OPS.isEmpty:
      return s === null || s === ''
    case FILTER_OPS.isNotEmpty:
      return !(s === null || s === '')
    case FILTER_OPS.is:
      if (values?.length) return s !== null && values.includes(s) // any-of
      return expected == null ? true : s !== null && s === expected
    case FILTER_OPS.isNot:
      if (values?.length) return s === null ? true : !values.includes(s) // none-of
      return expected == null ? true : s !== expected
    case FILTER_OPS.contains:
      return expected == null ? true : (s?.toLowerCase().includes(expected.toLowerCase()) ?? false)
    case FILTER_OPS.doesNotContain:
      return expected == null ? true : !(s?.toLowerCase().includes(expected.toLowerCase()) ?? false)
    case FILTER_OPS.startsWith:
      return expected == null
        ? true
        : (s?.toLowerCase().startsWith(expected.toLowerCase()) ?? false)
    default:
      return true
  }
}

function evaluateMulti(v: PropertyValue, op: Op, expected: Expected, values?: string[]): boolean {
  const xs = v.kind === 'multiSelect' ? v.value : []
  const want = values ?? (expected != null ? [expected] : [])
  const set = matchesSet(xs, op, want)
  if (set !== undefined) return set
  switch (op) {
    case FILTER_OPS.isEmpty:
      return xs.length === 0
    case FILTER_OPS.isNotEmpty:
      return xs.length > 0
    case FILTER_OPS.is:
    case FILTER_OPS.contains:
      // Empty set = mid-authoring → pass, NEVER exclude ([].some() would blank the table).
      return want.length === 0 ? true : want.some((w) => xs.includes(w))
    case FILTER_OPS.isNot:
    case FILTER_OPS.doesNotContain:
      return want.length === 0 ? true : !want.some((w) => xs.includes(w))
    default:
      return true
  }
}

/** Context-column / id-list membership + presence. DELIBERATE asymmetry, stated so
 *  nobody "fixes" it: is/contains with a missing SINGLE operand → false (cannot match) — while the chip-shaped set ops (matchesSet + values[]) pass on an empty operand set,
 *  because a mid-authoring chip row must never blank the table. */
function evaluateList(ids: string[], op: Op, expected: Expected, values?: string[]): boolean {
  const want = values ?? (expected != null ? [expected] : [])
  const set = matchesSet(ids, op, want)
  if (set !== undefined) return set
  switch (op) {
    case FILTER_OPS.isEmpty:
      return ids.length === 0
    case FILTER_OPS.isNotEmpty:
      return ids.length > 0
    case FILTER_OPS.is:
    case FILTER_OPS.contains:
      if (values?.length) return values.some((w) => ids.includes(w)) // any-of
      return expected == null ? false : ids.includes(expected)
    case FILTER_OPS.isNot:
    case FILTER_OPS.doesNotContain:
      return want.length === 0 ? true : !want.some((w) => ids.includes(w))
    default:
      return true
  }
}

/** File: presence only (is/contains/etc. are no-op passes). */
function evaluatePresence(v: PropertyValue, op: Op): boolean {
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
