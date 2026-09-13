import history from './loc-history.json'

export type Sample = { d: string; v: number[]; io: number[]; c: number[]; t: number[] }

export type Ledger = {
  areas: string[]
  colors: string[]
  series: Sample[]
  head: string
  files: number[]
  kinds: Record<string, number>
}

export const LEDGER: Ledger = history

export type Filters = { io: boolean; comments: boolean; tests: boolean }

export const DEFAULT_FILTERS: Filters = { io: true, comments: false, tests: false }

export const FILTER_ROWS: ReadonlyArray<{ key: keyof Filters; label: string }> = [
  { key: 'io', label: 'Imports & Exports' },
  { key: 'comments', label: 'Comments' },
  { key: 'tests', label: 'Tests' },
]

export type Band = { name: string; color: string }

const COMMENTS: Band = { name: 'Comments', color: 'var(--label-tertiary)' }

/** The stack under the filters: every area, and comments as one grey band above them. */
export function bands({ areas, colors }: Ledger, f: Filters): Band[] {
  const own = areas.map((name, k) => ({ name, color: colors[k] }))
  return f.comments ? [...own, COMMENTS] : own
}

/** One day's value per band, in `bands` order. */
export function stacked(s: Sample, f: Filters): number[] {
  const own = s.v.map((v, k) => v - (f.io ? 0 : s.io[k]) + (f.tests ? s.t[k] : 0))
  return f.comments ? [...own, sum(s.c)] : own
}

export const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0)

export const fmt = (n: number): string => n.toLocaleString('en-US')

const MONTHS = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function dayLabel(d: string): string {
  const [, mo, da] = d.split('-')
  return `${MONTHS[Number(mo)]} ${Number(da)}`
}
