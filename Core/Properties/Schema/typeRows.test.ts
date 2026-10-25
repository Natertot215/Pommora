import { describe, expect, it, vi } from 'vitest'
import type { MenuRow } from '@pommora/uix/Menus'
import { dateDefaults } from '../columnStyles'
import type { PropertyDefinition, PropertyType } from '../properties'
import { rowsFor } from './typeRows'

type RowContext = Parameters<typeof rowsFor>[1]

const ctx = (over: Partial<RowContext> = {}): RowContext => ({
  style: dateDefaults('full'),
  setStyle: vi.fn(),
  configure: vi.fn(),
  assetRoot: 'Assets',
  ...over,
})
const def = (type: PropertyType, fields: Partial<PropertyDefinition> = {}): PropertyDefinition =>
  ({ id: 'prop_x', label: 'X', key: 'X', type, ...fields }) as PropertyDefinition

type Item = Extract<MenuRow, { kind: 'item' }>
const items = (rows: MenuRow[]): Item[] => rows.filter((r): r is Item => r.kind === 'item')
/** The rows a viewer sees: a row revealed as `false` is collapsed. */
const shown = (rows: MenuRow[]): string[] =>
  items(rows)
    .filter((r) => r.reveal !== false)
    .map((r) => String(r.label))
const trailing = (rows: MenuRow[], label: string) => {
  const t = items(rows).find((r) => r.label === label)?.trailing
  if (!t) throw new Error(`no row "${label}"`)
  return t
}
const pick = (rows: MenuRow[], label: string, value: string): void => {
  const t = trailing(rows, label)
  if (t.kind !== 'picker') throw new Error(`"${label}" is no picker`)
  t.onPick(value)
}
const typed = (rows: MenuRow[], label: string, text: string): void => {
  const t = trailing(rows, label)
  if (t.kind !== 'picker' || !t.typeable) throw new Error(`"${label}" takes no typing`)
  t.typeable.onCommit(text)
}

describe('rowsFor', () => {
  it('a Number shows Currency only for currency, hides Separators and Fraction for Percent, and offers Style only where a bar has a ceiling', () => {
    expect(shown(rowsFor(def('number'), ctx()))).toEqual([
      'Format',
      'Separators',
      'Decimals',
      'Fraction',
    ])
    expect(shown(rowsFor(def('number', { number_family: 'currency' }), ctx()))).toEqual([
      'Format',
      'Currency',
      'Separators',
      'Decimals',
      'Fraction',
    ])
    expect(shown(rowsFor(def('number', { number_family: 'percent' }), ctx()))).toEqual([
      'Format',
      'Decimals',
      'Style',
    ])
  })

  it('the fraction Value row shows only while Fraction is on, takes only a positive number, refuses text that only partly parses, and a blank clears it', () => {
    const c = ctx()
    const rows = rowsFor(def('number', { number_fraction: true, number_denominator: 10 }), c)
    expect(shown(rows)).toEqual(['Format', 'Separators', 'Decimals', 'Fraction', 'Value', 'Style'])
    typed(rows, 'Value', '12abc')
    expect(c.configure).not.toHaveBeenCalled()
    typed(rows, 'Value', '0')
    typed(rows, 'Value', '-2')
    expect(c.configure).not.toHaveBeenCalled()
    typed(rows, 'Value', '4')
    expect(c.configure).toHaveBeenCalledWith({ number_denominator: 4 })
    typed(rows, 'Value', '')
    expect(c.configure).toHaveBeenCalledWith({ number_denominator: undefined })
  })

  it("a Number's format writes the definition and its Style the view", () => {
    const c = ctx()
    const rows = rowsFor(def('number', { number_family: 'percent' }), c)
    pick(rows, 'Format', 'currency')
    pick(rows, 'Style', 'bar')
    expect(c.configure).toHaveBeenCalledWith({ number_family: 'currency' })
    expect(c.setStyle).toHaveBeenCalledWith({ look: 'bar' })
  })

  it('a Date shows its Day row only for the worded formats, and each pick writes the view', () => {
    expect(shown(rowsFor(def('dateTime'), ctx({ style: dateDefaults('monthDayYear') })))).toEqual([
      'Date',
      'Time',
    ])
    const c = ctx({ style: { ...dateDefaults('full'), weekday: 'none' } })
    const rows = rowsFor(def('dateTime'), c)
    expect(rows[0]).toEqual({ kind: 'heading', label: 'Format' })
    expect(shown(rows)).toEqual(['Date', 'Day', 'Time'])
    pick(rows, 'Date', 'short')
    pick(rows, 'Day', 'long')
    expect(c.setStyle).toHaveBeenCalledWith({ date_format: 'short' })
    expect(c.setStyle).toHaveBeenCalledWith({ weekday: 'long' })
  })

  it("a Link's underline, color, and format write the definition", () => {
    const c = ctx()
    const rows = rowsFor(def('link'), c)
    const underline = trailing(rows, 'Underline')
    if (underline.kind !== 'switch') throw new Error('Underline is no switch')
    underline.onChange(true)
    pick(rows, 'Format', 'link-full')
    expect(c.configure).toHaveBeenCalledWith({ link_underline: true })
    expect(c.configure).toHaveBeenCalledWith({ link_display: 'link-full' })
    expect(c.setStyle).not.toHaveBeenCalled()
  })

  it("a Checkbox's swatch paints the Nexus's checkbox color when unset; its Color writes the definition and its Style the view", () => {
    const c = ctx({ style: { ...dateDefaults('full'), look: 'switch' } })
    const rows = rowsFor(def('checkbox'), c)
    const color = trailing(rows, 'Color')
    if (color.kind !== 'color') throw new Error('Color is no swatch')
    expect(color.css).toContain('var(--checkbox-base)')
    color.onPick('blue-1')
    pick(rows, 'Style', 'checkbox')
    expect(c.configure).toHaveBeenCalledWith({ checkbox_color: 'blue-1' })
    expect(c.setStyle).toHaveBeenCalledWith({ look: 'checkbox' })
  })

  it('a File offers its directory field and nothing else', () => {
    const rows = rowsFor(def('file'), ctx())
    expect(shown(rows)).toEqual(['Directory'])
    expect(trailing(rows, 'Directory').kind).toBe('field')
  })

  it('only the Date rows carry glyphs, and the option types, Text, and Context answer none', () => {
    for (const type of ['number', 'link', 'checkbox', 'file'] as const)
      expect(items(rowsFor(def(type), ctx())).every((r) => r.icon === undefined)).toBe(true)
    expect(items(rowsFor(def('dateTime'), ctx())).every((r) => r.icon !== undefined)).toBe(true)
    for (const type of ['select', 'multiSelect', 'status', 'text', 'context'] as const)
      expect(rowsFor(def(type), ctx())).toEqual([])
  })
})
