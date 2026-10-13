import { z } from 'zod'
import { isPlainObject } from '../Contract/validators'
import { eachOf, idArray } from '../Files/decoders'

const MATCH_MODES = ['all', 'any'] as const
export type MatchMode = (typeof MATCH_MODES)[number]

const filterRule = z.object({
  property_id: z.string(),
  op: z.string(),
  value: z.string().optional(),
  values: idArray.optional(),
})
export type FilterRule = z.infer<typeof filterRule>

/** RECURSIVE: a child may itself be a FilterGroup, expressing mixed AND/OR. Whether the filter APPLIES is a separate axis (`filter_enabled`), so turning it off never costs it its authored mode. */
export type FilterGroup = { match: MatchMode; rules: Array<FilterRule | FilterGroup> }

// A rule this build can't read drops alone, and the rest still filter.
export const filterGroup: z.ZodType<FilterGroup> = z.object({
  match: z.enum(MATCH_MODES),
  get rules() {
    return eachOf(z.union([filterRule, filterGroup]))
  },
})

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
  endsOnOrAfter: 'ends_on_or_after',
  endsOnOrBefore: 'ends_on_or_before',
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

/** The ops that are complete without an operand; everything else is unauthored until one arrives. */
export const OPERANDLESS_OPS = new Set<string>([FILTER_OPS.isEmpty, FILTER_OPS.isNotEmpty])

export const SUBSTRING_OPS = new Set<string>([
  FILTER_OPS.contains,
  FILTER_OPS.doesNotContain,
  FILTER_OPS.startsWith,
])

/** A chip list wins over a single value, as the pane writes one or the other. */
export const ruleOperands = (rule: FilterRule): string[] =>
  rule.values?.length ? rule.values : rule.value != null ? [rule.value] : []

export const answerable = (rule: FilterRule): boolean =>
  OPERANDLESS_OPS.has(rule.op) || ruleOperands(rule).length > 0

export const isGroup = (node: FilterRule | FilterGroup): node is FilterGroup =>
  isPlainObject(node) && Array.isArray((node as { rules?: unknown }).rules)

export function mapRules(
  group: FilterGroup,
  fn: (rule: FilterRule) => FilterRule | null,
): FilterGroup {
  return {
    ...group,
    rules: group.rules.flatMap<FilterRule | FilterGroup>((node) =>
      isGroup(node) ? [mapRules(node, fn)] : isPlainObject(node) ? (fn(node) ?? []) : [node],
    ),
  }
}

/** A filter that isn't a view's: its rules and whether they apply travel together. */
export const standaloneFilter = z.object({
  rules: filterGroup.nullable().catch(null),
  enabled: z.boolean().catch(true),
})
export type StandaloneFilter = z.infer<typeof standaloneFilter>
export const NO_FILTER: StandaloneFilter = { rules: null, enabled: true }

export const filtering = (f: StandaloneFilter): f is { rules: FilterGroup; enabled: true } =>
  f.enabled && f.rules !== null
