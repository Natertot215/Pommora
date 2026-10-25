// What each value kind does in a view: the operators the filter pane offers, how a rule tests a value, the key a sort compares, the band a grouping files a value under, and the value a new page takes from a rule, a band, or a sort neighbor.

import { localDayKey, pad } from '@pommora/uix/Utilities/pad'
import { foldKey } from '../Paths/caseFold'
import {
  type ColumnType,
  optionIds,
  type PropertyDefinition,
  specOf,
} from '../Properties/properties'
import {
  checkboxValue,
  checkboxWord,
  isBlankValue,
  type PropertyValue,
  readNumber,
  selectedValues,
  type ValueKind,
} from '../Properties/propertyValue'
import { dayMs, type LocalDate, readDate, shownText } from '../Properties/formatValue'
import { FILTER_OPS } from './filterRules'
import type { DateGranularity } from './views'

type ValueSlot = 'none' | 'text' | 'number' | 'date' | 'chips' | 'set'

export interface OperatorChoice {
  op: string
  label: string
  slot: ValueSlot
  impliedValue?: string
  /** A typed folder name is an operand as well as a picked folder. */
  names?: true
}

export type ValueTest = (v: PropertyValue) => boolean
export type SortDirections = 'option' | 'text' | 'value'

export type ValueKindSpec = Readonly<{
  /** The operators the filter pane offers, in its menu's order; a hand-written rule may hold others the kind still answers. */
  ops: readonly OperatorChoice[]
  /** Is Empty matches a value this reads as unfilled, and Isn't Empty one it reads as filled. */
  filled: ValueTest
  /** A rule's test, its operands read once; undefined, so the rule abstains, for an op the kind doesn't answer or an operand that doesn't read. */
  prepare(
    op: string,
    want: readonly string[],
    def?: PropertyDefinition,
    held?: readonly string[],
  ): ValueTest | undefined
  /** A criterion's key reader, built once per sort; a null key sorts last in either direction, and a kind with no reader doesn't sort. */
  sortKey?(
    def?: PropertyDefinition,
    order?: readonly string[],
  ): (v: PropertyValue) => string | number | null
  /** Which pair of words a Sort or Group pane names an order's directions with; an option kind's order alone takes Custom. */
  directions: SortDirections
  /** A view can group by the kind; Checkbox's band serves the sort-run reassign alone. */
  groups?: true
  /** The band a grouping files a value under; null files it with the value-less rows. */
  bucket?(v: PropertyValue, granularity: DateGranularity): string | null
  /** The value a new page takes from a rule naming one operand, null when the rule's op names none; a band's key seeds the value an Is rule naming it would. */
  seed?(op: string, operand: string): PropertyValue | null
  /** A page created beside another under a sort on this kind takes the other's value. */
  sortSeeds?: true
}>

const EMPTIES: OperatorChoice[] = [
  { op: FILTER_OPS.isEmpty, label: 'Is Empty', slot: 'none' },
  { op: FILTER_OPS.isNotEmpty, label: "Isn't Empty", slot: 'none' },
]

const TEXT_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.is, label: 'Is', slot: 'text' },
  { op: FILTER_OPS.isNot, label: "Isn't", slot: 'text' },
  { op: FILTER_OPS.startsWith, label: 'Starts With', slot: 'text' },
  { op: FILTER_OPS.contains, label: 'Contains', slot: 'text' },
  { op: FILTER_OPS.doesNotContain, label: "Doesn't Contain", slot: 'text' },
  ...EMPTIES,
]

/** The Starts and Ends ops are inclusive — the strict variants stay registered for hand-authored files, but the frame doesn't offer a second near-identical set. */
const DATE_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.is, label: 'Is', slot: 'date' },
  { op: FILTER_OPS.onOrBefore, label: 'Starts Before', slot: 'date' },
  { op: FILTER_OPS.onOrAfter, label: 'Starts After', slot: 'date' },
  { op: FILTER_OPS.endsOnOrBefore, label: 'Ends Before', slot: 'date' },
  { op: FILTER_OPS.endsOnOrAfter, label: 'Ends After', slot: 'date' },
  ...EMPTIES,
]

const SET_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.containsAny, label: 'Is Any', slot: 'chips' },
  { op: FILTER_OPS.containsAll, label: 'Is All', slot: 'chips' },
  { op: FILTER_OPS.doesNotContain, label: "Isn't", slot: 'chips' },
  ...EMPTIES,
]

const NUMBER_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.is, label: 'Is', slot: 'number' },
  { op: FILTER_OPS.isNot, label: "Isn't", slot: 'number' },
  { op: FILTER_OPS.greaterThan, label: 'Greater Than', slot: 'number' },
  { op: FILTER_OPS.greaterOrEqual, label: 'At Least', slot: 'number' },
  { op: FILTER_OPS.lessThan, label: 'Less Than', slot: 'number' },
  { op: FILTER_OPS.lessOrEqual, label: 'At Most', slot: 'number' },
  ...EMPTIES,
]

/** Is/Isn't are chip pickers whose multi-chips mean any-of/none-of — never Is All, which is unsatisfiable on a one-value property. */
const OPTION_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.is, label: 'Is', slot: 'chips' },
  { op: FILTER_OPS.isNot, label: "Isn't", slot: 'chips' },
  ...EMPTIES,
]

const CHECKBOX_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.is, label: 'Is Checked', slot: 'none', impliedValue: 'true' },
  { op: FILTER_OPS.is, label: "Isn't Checked", slot: 'none', impliedValue: 'false' },
]

const LIST_OPS: ReadonlySet<string> = new Set([FILTER_OPS.containsAny, FILTER_OPS.containsAll])

const notBlank: ValueTest = (v) => !isBlankValue(v)
const showsText: ValueTest = (v) => !!shownText(v)

/** Is and Isn't compare a value's whole shown text, and the others search within it, folded on both sides. */
function prepareText(
  op: string,
  want: readonly string[],
  def?: PropertyDefinition,
): ValueTest | undefined {
  const w = want.map(foldKey)
  const shown = (v: PropertyValue): string | null => {
    const s = shownText(v, def)
    return s === null ? null : foldKey(s)
  }
  const is: ValueTest = (v) => {
    const f = shown(v)
    return f !== null && w.includes(f)
  }
  const contains: ValueTest = (v) => shown(v)?.includes(w[0]) ?? false
  switch (op) {
    case FILTER_OPS.is:
      return is
    case FILTER_OPS.isNot:
      return (v) => !is(v)
    case FILTER_OPS.contains:
      return contains
    case FILTER_OPS.doesNotContain:
      return (v) => !contains(v)
    case FILTER_OPS.startsWith:
      return (v) => shown(v)?.startsWith(w[0]) ?? false
    default:
      return undefined
  }
}

/** Is and the containing ops match a value holding any operand, Is All one holding every operand, and the two negations a value holding none. */
function prepareMembers(op: string, want: readonly string[]): ValueTest | undefined {
  const any: ValueTest = (v) => selectedValues(v).some((x) => want.includes(x))
  switch (op) {
    case FILTER_OPS.containsAll:
      return (v) => {
        const xs = selectedValues(v)
        return want.every((w) => xs.includes(w))
      }
    case FILTER_OPS.is:
    case FILTER_OPS.contains:
    case FILTER_OPS.containsAny:
      return any
    case FILTER_OPS.isNot:
    case FILTER_OPS.doesNotContain:
      return (v) => !any(v)
    default:
      return undefined
  }
}

/** An option list's operands, kept only where they name an option it holds (a Select's or Multi-Select's listed options, a Context's Spaces); a rule naming none sits out, as an unreadable Number or Date operand does. */
function prepareOptions(
  op: string,
  want: readonly string[],
  def?: PropertyDefinition,
  held: readonly string[] = def ? optionIds(def) : [],
): ValueTest | undefined {
  const listed = new Set(held)
  const live = want.filter((id) => listed.has(id))
  return live.length ? prepareMembers(op, live) : undefined
}

function prepareNumber(op: string, want: readonly string[]): ValueTest | undefined {
  const e = readNumber(want[0])
  if (e === undefined) return undefined
  const holds =
    (test: (n: number) => boolean): ValueTest =>
    (v) =>
      v.kind === 'number' && test(v.value)
  const is = holds((n) => n === e)
  switch (op) {
    case FILTER_OPS.is:
      return is
    case FILTER_OPS.isNot:
      return (v) => !is(v)
    case FILTER_OPS.greaterThan:
      return holds((n) => n > e)
    case FILTER_OPS.lessThan:
      return holds((n) => n < e)
    case FILTER_OPS.greaterOrEqual:
      return holds((n) => n >= e)
    case FILTER_OPS.lessOrEqual:
      return holds((n) => n <= e)
    default:
      return undefined
  }
}

/** Days are the local days the cells show. `is` matches a day the value spans; a bare-day operand orders by day, and one carrying a time orders by instant. The Starts ops and the strict pair read a span's start, the Ends ops its end. */
function prepareDate(op: string, want: readonly string[]): ValueTest | undefined {
  const target = readDate(want[0])
  if (target === null) return undefined
  const ms = (x: Date): number => (target.timed ? x.getTime() : dayMs(x))
  const e = ms(target.at)
  const day = dayMs(target.at)
  // A clockless end holds its whole day, so a timed operand meets it at the day's last instant.
  const endMs = (d: LocalDate): number => {
    const last = d.end ?? d.at
    return d.timed || !target.timed
      ? ms(last)
      : new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1).getTime() - 1
  }
  const dated =
    (test: (d: LocalDate) => boolean): ValueTest =>
    (v) => {
      const d = v.kind === 'dateTime' ? readDate(v.value) : null
      return d !== null && test(d)
    }
  switch (op) {
    case FILTER_OPS.is:
      return dated((d) => dayMs(d.at) <= day && day <= dayMs(d.end ?? d.at))
    case FILTER_OPS.isBefore:
      return dated((d) => ms(d.at) < e)
    case FILTER_OPS.isAfter:
      return dated((d) => ms(d.at) > e)
    case FILTER_OPS.onOrAfter:
      return dated((d) => ms(d.at) >= e)
    case FILTER_OPS.onOrBefore:
      return dated((d) => ms(d.at) <= e)
    case FILTER_OPS.endsOnOrAfter:
      return dated((d) => endMs(d) >= e)
    case FILTER_OPS.endsOnOrBefore:
      return dated((d) => endMs(d) <= e)
    default:
      return undefined
  }
}

function prepareCheckbox(op: string, want: readonly string[]): ValueTest | undefined {
  const checked = checkboxWord(want[0])
  if (checked === null) return undefined
  const is: ValueTest = (v) => (v.kind === 'checkbox') === checked
  switch (op) {
    case FILTER_OPS.is:
      return is
    case FILTER_OPS.isNot:
      return (v) => !is(v)
    default:
      return undefined
  }
}

const textKey =
  (def?: PropertyDefinition) =>
  (v: PropertyValue): string | null =>
    shownText(v, def) || null

/** A Custom order leads with its saved options and appends the ones it predates; a value no option holds sorts with the value-less rows. */
function optionKey(def?: PropertyDefinition, order: readonly string[] = []) {
  const listed = new Set(order)
  const ids = [...order, ...(def ? optionIds(def) : []).filter((id) => !listed.has(id))]
  const rank = new Map(ids.map((id, i) => [id, i]))
  return (v: PropertyValue): number | null =>
    v.kind === 'select' ? (rank.get(v.value) ?? null) : null
}

/** UTC arithmetic, so adding days never crosses a DST boundary. A week belongs to the year of its Thursday; weeks start Monday. */
function isoWeek(year: number, month: number, day: number): [year: number, week: number] {
  const d = new Date(Date.UTC(year, month, day))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7)
  return [d.getUTCFullYear(), week]
}

/** Zero-padded so lexicographic order IS chronological. Buckets by the local day the cell shows, so a date-only value keeps the day the user picked. */
function dateBucketKey(iso: string, granularity: DateGranularity): string | null {
  const d = readDate(iso)?.at
  if (!d) return null
  const year = d.getFullYear()
  const month = d.getMonth()
  const day = d.getDate()
  switch (granularity) {
    case 'year':
      return pad(year, 4)
    case 'month':
      return `${pad(year, 4)}-${pad(month + 1, 2)}`
    case 'day':
      return localDayKey(d)
    case 'week': {
      const [wy, w] = isoWeek(year, month, day)
      return `${pad(wy, 4)}-W${pad(w, 2)}`
    }
  }
}

const PROSE: ValueKindSpec = {
  ops: TEXT_OPS,
  filled: showsText,
  prepare: prepareText,
  sortKey: textKey,
  directions: 'text',
}

export const VALUE_KINDS: Readonly<Record<ValueKind, ValueKindSpec>> = {
  text: PROSE,
  link: PROSE,
  number: {
    ops: NUMBER_OPS,
    filled: notBlank,
    prepare: prepareNumber,
    sortKey: () => (v) => (v.kind === 'number' ? v.value : null),
    directions: 'value',
    sortSeeds: true,
  },
  dateTime: {
    ops: DATE_OPS,
    filled: (v) => v.kind === 'dateTime' && readDate(v.value) !== null,
    prepare: prepareDate,
    sortKey: () => (v) =>
      v.kind === 'dateTime' ? (readDate(v.value)?.at.getTime() ?? null) : null,
    directions: 'value',
    groups: true,
    bucket: (v, granularity) =>
      v.kind === 'dateTime' ? dateBucketKey(v.value, granularity) : null,
    sortSeeds: true,
  },
  // An unchecked box is stored as no value: Is Empty matches it, and it sorts after the checked ones ascending, as an empty value does, while holding a key so descending puts it first.
  checkbox: {
    ops: CHECKBOX_OPS,
    filled: notBlank,
    prepare: prepareCheckbox,
    sortKey: () => (v) => (v.kind === 'checkbox' ? 0 : 1),
    directions: 'value',
    bucket: (v) => (v.kind === 'checkbox' ? 'true' : null),
    seed: (op, operand) =>
      op === FILTER_OPS.is ? checkboxValue(checkboxWord(operand) === true) : null,
    sortSeeds: true,
  },
  // Is and Isn't name whole options; the text ops a hand-written rule may hold search the option's label.
  select: {
    ops: OPTION_OPS,
    filled: notBlank,
    prepare: (op, want, def) =>
      op === FILTER_OPS.is || op === FILTER_OPS.isNot
        ? prepareOptions(op, want, def)
        : prepareText(op, want, def),
    sortKey: optionKey,
    directions: 'option',
    groups: true,
    bucket: (v) => (v.kind === 'select' ? v.value : null),
    seed: (op, operand) => (op === FILTER_OPS.is ? { kind: 'select', value: operand } : null),
    sortSeeds: true,
  },
  multiSelect: {
    ops: SET_OPS,
    filled: notBlank,
    prepare: prepareOptions,
    sortKey: textKey,
    directions: 'text',
    seed: (op, operand) => (LIST_OPS.has(op) ? { kind: 'multiSelect', value: [operand] } : null),
  },
  context: {
    ops: SET_OPS,
    filled: notBlank,
    prepare: prepareOptions,
    directions: 'value',
    seed: (op, operand) => (LIST_OPS.has(op) ? { kind: 'context', value: [operand] } : null),
  },
  file: {
    ops: EMPTIES,
    filled: notBlank,
    prepare: () => undefined,
    sortKey: textKey,
    directions: 'text',
  },
}

/** A column type's entry in the record; none for a property that's gone. */
export const viewSpecOf = (type: ColumnType | undefined): ValueKindSpec | undefined => {
  const spec = specOf(type)
  return spec && VALUE_KINDS[spec.kind]
}

export const groupable = (t: PropertyDefinition['type']): boolean => viewSpecOf(t)?.groups === true
