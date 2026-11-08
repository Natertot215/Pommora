import { describe, expect, it } from 'vitest'
import { FILEDATA, type PropertyDefinition, type ResolvedColumn } from '../../Properties/properties'
import type { ViewRow } from '../viewRow'
import { cardAddColumns, fillsBlank, shownColumnsFor } from './cardColumns'
import { itemColumns, propertyColumn, resolveColumn } from '../Pipeline/columns'

const TITLE_COLUMN = resolveColumn(FILEDATA.title.id, [], [])!

describe('shownColumnsFor', () => {
  const sel = {
    id: 'sel',
    label: 'Sel',
    key: 'Sel',
    type: 'select',
    select_options: [{ id: 'opt_Done', key: 'Done', label: 'Done' }],
  } as PropertyDefinition
  const chk = { id: 'chk', label: 'Chk', key: 'Chk', type: 'checkbox' } as PropertyDefinition
  const columns: ResolvedColumn[] = [TITLE_COLUMN, propertyColumn(sel), propertyColumn(chk)]
  const row = (fm: Record<string, unknown>): ViewRow =>
    ({ id: 'p', title: 'P', path: 'P.md', frontmatter: fm }) as unknown as ViewRow

  it('Standard keeps blank columns as fillable rows; the title column never shows', () => {
    expect(shownColumnsFor(row({}), columns, false).map((c) => c.id)).toEqual(['sel', 'chk'])
  })

  it('Compact drops blank values except checkbox and keeps filled ones', () => {
    expect(shownColumnsFor(row({}), columns, true).map((c) => c.id)).toEqual(['chk'])
    expect(shownColumnsFor(row({ [sel.key]: 'Done' }), columns, true).map((c) => c.id)).toEqual([
      'sel',
      'chk',
    ])
  })
})

describe('cardAddColumns', () => {
  const sel = { id: 'sel', label: 'Sel', key: 'Sel', type: 'select' } as PropertyDefinition
  const chk = { id: 'chk', label: 'Chk', key: 'Chk', type: 'checkbox' } as PropertyDefinition
  const num = { id: 'num', label: 'Num', key: 'Num', type: 'number' } as PropertyDefinition
  const item = itemColumns(null, [sel, chk, num], 'p')
  const row = (fm: Record<string, unknown>): ViewRow =>
    ({ id: 'p', title: 'P', path: 'P.md', frontmatter: fm }) as unknown as ViewRow
  const listed = (fm: Record<string, unknown>, shown: ResolvedColumn[]): string[] =>
    cardAddColumns(item, row(fm), shown).properties.map((c) => c.id)

  it('leaves out what the card draws and lists held rows last, with no stamps', () => {
    expect(listed({ Chk: true }, [propertyColumn(sel)])).toEqual(['num', 'chk'])
  })

  it('lists a property hidden in the view that holds a value', () => {
    expect(listed({ Chk: true }, [propertyColumn(sel), propertyColumn(num)])).toEqual(['chk'])
  })

  it('lists a blank a Compact card leaves undrawn', () => {
    const columns = [TITLE_COLUMN, propertyColumn(sel), propertyColumn(chk)]
    expect(listed({}, shownColumnsFor(row({}), columns, true))).toEqual(['sel', 'num'])
  })
})

describe('fillsBlank', () => {
  it('fillsBlank: every type but the stamps', () => {
    for (const t of [
      'status',
      'select',
      'multiSelect',
      'context',
      'dateTime',
      'number',
      'link',
      'text',
      'file',
      'checkbox',
    ] as const)
      expect(fillsBlank(t)).toBe(true)
    for (const t of ['createdTime', 'lastEditedTime', 'title'] as const)
      expect(fillsBlank(t)).toBe(false)
  })
})
