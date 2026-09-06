// Pinned to en-US — the ordinal-day style ("March 1st") is English-only, and pinning keeps output deterministic across machines.

import {
  type DateFormat,
  defaultStyleFor,
  type TimeFormat,
  type WeekdayFormat,
} from '@pommora/core/Properties/columnStyles'
import type { DateGranularity, DateSeparator } from '@pommora/core/Views/views'
import type { NumberConfig } from '@pommora/core/Properties/properties'
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
const dateFmt = memoFmt((o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', o))

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

export const nexusDateFormat = (setting: DateFormat | undefined): DateFormat =>
  defaultStyleFor('datetime', undefined, setting).date_format ?? 'full'

export function clockOf(date: Date, timeFormat: TimeFormat): string {
  return timeFormat === 'twelveHour'
    ? dateFmt({ hour: 'numeric', minute: '2-digit' }).format(date)
    : dateFmt({ hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}

const WEEK_DAYS = 7 // |Δdays| ≤ this shows named/day-count form (with clock when time-shown)

const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate())

function formatRelative(date: Date, hasTime: boolean, timeFormat: TimeFormat, now: Date): string {
  const DAY = 86_400_000
  const diffDays = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY)
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

/** Date-only strings parse as LOCAL midnight — a bare `new Date('YYYY-MM-DD')` is UTC and shifts the day west of Greenwich. Unparseable input falls back to the raw string. */
export function formatDate(
  iso: string,
  dateFormat: DateFormat,
  timeFormat: TimeFormat,
  weekday: WeekdayFormat = 'none',
  now: Date = new Date(),
): string {
  const hasTime = iso.includes('T')
  const date = new Date(hasTime ? iso : `${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
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

  if ((dateFormat === 'short' || dateFormat === 'full') && weekday !== 'none') {
    out = `${dateFmt({ weekday: weekday === 'long' ? 'long' : 'short' }).format(date)}, ${out}`
  }
  if (hasTime && timeFormat !== 'none') out += ` ${clockOf(date, timeFormat)}`
  return out
}

export const NUMERIC_FORMATS = new Set<DateFormat>(['dayMonthYear', 'monthDayYear'])

export function formatBucketLabel(
  key: string,
  granularity: DateGranularity,
  dateFormat: DateFormat,
  separator: DateSeparator,
): string {
  const numeric = NUMERIC_FORMATS.has(dateFormat)
  const sep = separator === 'slash' ? '/' : '-'
  switch (granularity) {
    case 'year':
      return key
    case 'week': {
      const m = /^(\d{4})-W(\d{2})$/.exec(key)
      if (!m) return key
      return numeric ? `W${m[2]}${sep}${m[1]}` : `Week ${Number(m[2])}, ${m[1]}`
    }
    case 'month': {
      const m = /^(\d{4})-(\d{2})$/.exec(key)
      if (!m) return key
      if (numeric) return `${m[2]}${sep}${m[1]}`
      const month = new Date(`${key}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long' })
      return `${month} ${m[1]}`
    }
    case 'day': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return key
      const out = formatDate(key, dateFormat, 'none')
      return numeric && separator === 'dash' ? out.replaceAll('/', '-') : out
    }
  }
}

export function condensedDate(iso: string, dateFormat: DateFormat, withYear: boolean): string {
  const date = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  switch (dateFormat) {
    case 'relative':
    case 'short':
    case 'full':
      return `${date.toLocaleDateString('en-US', { month: 'long' })} ${ordinal(date.getDate())}`
    case 'dayMonthYear':
      return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}${withYear ? `/${date.getFullYear()}` : ''}`
    case 'monthDayYear':
      return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}${withYear ? `/${date.getFullYear()}` : ''}`
  }
}

function fractionDigits(decimals: NumberConfig['number_decimals']): Intl.NumberFormatOptions {
  if (decimals === 'hidden') return { maximumFractionDigits: 0 }
  if (typeof decimals === 'number')
    return { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
  return {}
}

/** Percent is LITERAL — the number plus '%', never Intl's ×100 percent style. */
function formatScalar(n: number, cfg: NumberConfig | undefined): string {
  const useGrouping = cfg?.number_separators !== false
  const digits = fractionDigits(cfg?.number_decimals)
  if (cfg?.number_family === 'currency') {
    return numFmt({
      style: 'currency',
      currency: cfg.number_currency ?? 'USD',
      useGrouping,
      ...digits,
    }).format(n)
  }
  const num = numFmt({ useGrouping, ...digits }).format(n)
  return cfg?.number_family === 'percent' ? `${num}%` : num
}

export function formatNumber(n: number, cfg: NumberConfig | undefined): string {
  if (
    cfg?.number_fraction &&
    cfg.number_family !== 'percent' &&
    cfg.number_denominator !== undefined
  ) {
    return `${formatScalar(n, cfg)} out of ${formatScalar(cfg.number_denominator, cfg)}`
  }
  return formatScalar(n, cfg)
}

/** A zero or missing denominator returns undefined so the bar never divides by zero. */
export function numberDivisor(cfg: NumberConfig | undefined): number | undefined {
  if (cfg?.number_family === 'percent') return 100
  if (cfg?.number_fraction && cfg.number_denominator) return cfg.number_denominator
  return undefined
}
