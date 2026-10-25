// Pinned to en-US — the ordinal-day style ("March 1st") is English-only, and pinning keeps output deterministic across machines.

import { type DateFormat, showsWeekday, type TimeFormat, type WeekdayFormat } from './columnStyles'
import { DEFAULT_CURRENCY, type NumberConfig, type PropertyDefinition } from './properties'
import { currencySymbol, optionLabel, type PropertyValue } from './propertyValue'
import { fileName, linkDisplayText, shownProse } from '../Connections/linkValue'
import { pad } from '@pommora/uix/Utilities/pad'

// Intl formatter construction is pricey and the card grid formats per-cell, so formatters cache by options tuple; en-US is pinned everywhere, so the key is the options alone.
const memoFmt = <O, F>(make: (opts: O) => F): ((opts: O) => F) => {
  const cache = new Map<string, F>()
  return (opts) => {
    const key = JSON.stringify(opts)
    let f = cache.get(key)
    if (!f) {
      f = make(opts)
      cache.set(key, f)
    }
    return f
  }
}
const numFmt = memoFmt((o: Intl.NumberFormatOptions) => new Intl.NumberFormat('en-US', o))
export const dateFmt = memoFmt(
  (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', o),
)

function ordinal(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) return `${day}th`
  switch (day % 10) {
    case 1:
      return `${day}st`
    case 2:
      return `${day}nd`
    case 3:
      return `${day}rd`
    default:
      return `${day}th`
  }
}

export function clockOf(date: Date, timeFormat: TimeFormat): string {
  return timeFormat === 'twelveHour'
    ? dateFmt({ hour: 'numeric', minute: '2-digit' }).format(date)
    : dateFmt({ hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}

const WEEK_DAYS = 7 // |Δdays| ≤ this shows named/day-count form (with clock when time-shown)

export const dayMs = (d: Date): number =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

function formatRelative(date: Date, hasTime: boolean, timeFormat: TimeFormat, now: Date): string {
  const DAY = 86_400_000
  const diffDays = Math.round((dayMs(date) - dayMs(now)) / DAY)
  const ago = diffDays < 0
  const n = Math.abs(diffDays)

  if (n <= WEEK_DAYS) {
    let dayWord: string
    if (n === 0) dayWord = 'Today'
    else if (n === 1) dayWord = ago ? 'Yesterday' : 'Tomorrow'
    else dayWord = ago ? `${n} Days Ago` : `${n} Days from now`
    return hasTime && timeFormat !== 'none' ? `${dayWord} at ${clockOf(date, timeFormat)}` : dayWord
  }
  const [unit, count] =
    n < 30
      ? ['Week', Math.round(n / 7)]
      : n < 365
        ? ['Month', Math.round(n / 30)]
        : ['Year', Math.round(n / 365)]
  const plural = count === 1 ? unit : `${unit}s`
  return ago ? `${count} ${plural} Ago` : `${count} ${plural} from now`
}

/** `end` is set when the value is a span; one `timed` covers both ends. */
export type LocalDate = { at: Date; timed: boolean; end?: Date }

const ISO_DATE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/

function readPoint(iso: string): LocalDate | null {
  const m = ISO_DATE.exec(iso)
  if (!m) return null
  const [, y, mo, d, h, min, sec, zone] = m
  const at = zone
    ? new Date(iso.replace(' ', 'T'))
    : new Date(+y, +mo - 1, +d, +(h ?? 0), +(min ?? 0), +(sec ?? 0))
  return Number.isNaN(at.getTime()) ? null : { at, timed: h !== undefined }
}

/** The one reading of a stored date: an ISO day or date-time is read in the local clock unless it carries a zone, which is honored; an ISO interval `start/end` reads as a span in chronological order, timed when either end carries a clock; anything else names no date. */
export function readDate(iso: string): LocalDate | null {
  const [first, second, ...rest] = iso.split(/\s*\/\s*/)
  const start = readPoint(first)
  if (!start || second === undefined) return start
  const end = rest.length === 0 ? readPoint(second) : null
  if (!end) return null
  const [at, last] = end.at < start.at ? [end.at, start.at] : [start.at, end.at]
  return { at, timed: start.timed || end.timed, end: last }
}

function formatPoint(
  date: Date,
  hasTime: boolean,
  dateFormat: DateFormat,
  timeFormat: TimeFormat,
  weekday: WeekdayFormat,
  now: Date,
): string {
  if (dateFormat === 'relative') return formatRelative(date, hasTime, timeFormat, now)

  const month = dateFmt({ month: 'long' }).format(date)
  const day = ordinal(date.getDate())
  let out: string
  switch (dateFormat) {
    case 'short':
      out = `${month} ${day}`
      break
    case 'full':
      out = `${month} ${day}, ${date.getFullYear()}`
      break
    case 'dayMonthYear':
      out = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
      break
    case 'monthDayYear':
      out = `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`
      break
  }

  if (showsWeekday(dateFormat) && weekday !== 'none')
    out = `${dateFmt({ weekday: weekday === 'long' ? 'long' : 'short' }).format(date)}, ${out}`
  if (hasTime && timeFormat !== 'none') out += ` ${clockOf(date, timeFormat)}`
  return out
}

/** A span reads as its start → its end, and one inside a day as its start → the end's clock; an unreadable value shows as written. */
export function formatDate(
  iso: string,
  dateFormat: DateFormat,
  timeFormat: TimeFormat,
  weekday: WeekdayFormat = 'none',
  now: Date = new Date(),
): string {
  const read = readDate(iso)
  if (!read) return iso
  const point = (d: Date): string =>
    formatPoint(d, read.timed, dateFormat, timeFormat, weekday, now)
  const start = point(read.at)
  if (!read.end) return start
  if (dayMs(read.at) !== dayMs(read.end)) return `${start} → ${point(read.end)}`
  return read.timed && timeFormat !== 'none' ? `${start} → ${clockOf(read.end, timeFormat)}` : start
}

/** A value as the text its cell shows, which the filter's text operators search and the sort orders: an option's label, a text with its connections as they read, a link's display text, a list's members joined; null for a value that shows no text of its own. */
export function shownText(value: PropertyValue, def?: PropertyDefinition): string | null {
  switch (value.kind) {
    case 'text':
      return shownProse(value.value)
    case 'link':
      return linkDisplayText(value.value)
    case 'select':
      return optionLabel(def, value.value)
    case 'multiSelect':
      return value.value.map((id) => optionLabel(def, id)).join(',')
    case 'file':
      // The filenames, not the raw `[[…]]` references, which would all share the leading bracket.
      return value.value.map(fileName).join(',')
    case 'number':
    case 'checkbox':
    case 'dateTime':
    case 'context':
    case 'null':
      return null
  }
}

export const NUMERIC_FORMATS = new Set<DateFormat>(['dayMonthYear', 'monthDayYear'])

function fractionDigits(decimals: NumberConfig['number_decimals']): Intl.NumberFormatOptions {
  if (decimals === 'hidden') return { maximumFractionDigits: 0 }
  if (typeof decimals === 'number')
    return { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
  return {}
}

/** A run of a formatted number, flagged where it's the format's own glyph rather than the value. */
type NumberPart = { text: string; glyph: boolean }

/** Percent is LITERAL — the number plus '%', never Intl's ×100 percent style. */
function formatScalar(n: number, cfg: NumberConfig | undefined): NumberPart[] {
  const useGrouping = cfg?.number_separators !== false
  const digits = fractionDigits(cfg?.number_decimals)
  if (cfg?.number_family === 'currency') {
    const parts: NumberPart[] = []
    for (const p of numFmt({
      style: 'currency',
      currency: cfg.number_currency ?? DEFAULT_CURRENCY,
      useGrouping,
      ...digits,
    }).formatToParts(n)) {
      const glyph = p.type === 'currency'
      const last = parts.at(-1)
      if (last && !glyph && !last.glyph) last.text += p.value
      else parts.push({ text: p.value, glyph })
    }
    return parts
  }
  const num = { text: numFmt({ useGrouping, ...digits }).format(n), glyph: false }
  return cfg?.number_family === 'percent' ? [num, { text: '%', glyph: true }] : [num]
}

/** Percent already reads out of 100, so it takes no fraction. */
export const fractionDenominator = (cfg: NumberConfig | undefined): number | undefined =>
  cfg?.number_fraction && cfg.number_family !== 'percent' && cfg.number_denominator !== undefined
    ? cfg.number_denominator
    : undefined

export function formatNumber(n: number, cfg: NumberConfig | undefined): NumberPart[] {
  const denominator = fractionDenominator(cfg)
  return denominator === undefined
    ? formatScalar(n, cfg)
    : [
        ...formatScalar(n, cfg),
        { text: ' out of ', glyph: false },
        ...formatScalar(denominator, cfg),
      ]
}

/** The divisor a bar fills against; undefined when there's none, so the bar never divides by zero. */
function numberDivisor(cfg: NumberConfig | undefined): number | undefined {
  return cfg?.number_family === 'percent' ? 100 : fractionDenominator(cfg)
}

/** A number offers the Bar look only where a divisor gives the bar a ceiling to fill. */
export const numberBarCapable = (cfg: NumberConfig | undefined): boolean =>
  numberDivisor(cfg) !== undefined

export const barDivisor = (look: string | undefined, cfg: NumberConfig | undefined) =>
  look === 'bar' ? numberDivisor(cfg) : undefined

/** A number's format glyph: its currency's symbol as a cell shows it, or a percent sign; a plain number has none. */
export function numberFormatGlyph(cfg: NumberConfig): string | undefined {
  if (cfg.number_family === 'percent') return '%'
  if (cfg.number_family === 'currency')
    return currencySymbol(cfg.number_currency ?? DEFAULT_CURRENCY)
  return undefined
}
