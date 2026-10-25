import { describe, expect, it } from 'vitest'
import { FILEDATA, type PropertyDefinition } from '../../Properties/properties'
import type { ResolvedColumn, ViewRow } from '../viewRow'
import type { SavedView } from '../views'
import type { ValueContext } from '../../Properties/valueContext'
import {
  type AddEntry,
  addEntriesFor,
  fillsBlank,
  orderAddableEntries,
  shownColumnsFor,
} from './cardColumns'
import { editorText, parseEditorValue } from '../../Properties/parseEditorValue'
import { contextColumn, propertyColumn, resolveColumn } from '../Pipeline/columns'

const TITLE_COLUMN = resolveColumn(FILEDATA.title.id, [], [])!

describe('parseEditorValue', () => {
  it('number: parses a finite value, trims, clears on empty, rejects garbage', () => {
    expect(parseEditorValue('number', '42')).toEqual({ kind: 'number', value: 42 })
    expect(parseEditorValue('number', '  3.5 ')).toEqual({ kind: 'number', value: 3.5 })
    expect(parseEditorValue('number', '$1,200')).toEqual({ kind: 'number', value: 1200 })
    expect(parseEditorValue('number', '')).toBeNull()
    expect(parseEditorValue('number', 'abc')).toBeUndefined()
  })

  it('link: normalizes + serializes a valid link, clears on empty, rejects invalid', () => {
    const link = { index: undefined, own: undefined }
    expect(parseEditorValue('link', 'example.com', null, link)).toEqual({
      kind: 'link',
      value: 'https://example.com',
    })
    expect(parseEditorValue('link', '', null, link)).toBeNull()
    expect(parseEditorValue('link', 'not a url', null, link)).toBeUndefined()
  })

  it('text: opens on its trimmed first line, rejoins it with the lines behind, drops an emptied first line, clears a blank', () => {
    const text = (value: string) => ({ kind: 'text', value }) as const
    expect(editorText(text('first \nsecond\nthird'))).toBe('first')
    expect(editorText(text(''))).toBe('')
    expect(parseEditorValue('text', 'changed', text('first\nsecond'))).toEqual(
      text('changed\nsecond'),
    )
    expect(parseEditorValue('text', 'fresh', null)).toEqual(text('fresh'))
    expect(parseEditorValue('text', '  padded  ', text('first\nsecond'))).toEqual(
      text('padded\nsecond'),
    )
    expect(parseEditorValue('text', '', text('first\nsecond'))).toEqual(text('second'))
    expect(parseEditorValue('text', '', text('first\n\n  \nsecond\n\nthird'))).toEqual(
      text('second\n\nthird'),
    )
    expect(parseEditorValue('text', '', text('only'))).toBeNull()
    expect(parseEditorValue('text', '', text('a\n\n'))).toBeNull()
    expect(parseEditorValue('text', '   ', null)).toBeNull()
  })

  it('an unsupported type never commits', () => {
    expect(parseEditorValue('status', 'x')).toBeUndefined()
  })
})

describe('orderAddableEntries', () => {
  const def = (id: string, type: 'number' | 'checkbox' | 'status' | 'link'): ResolvedColumn =>
    propertyColumn({ id, label: id, key: id, type })
  it('sinks reveal-only entries to the bottom; pane entries stay on top in order', () => {
    const entries: AddEntry[] = [
      { column: def('n', 'number'), name: 'N', revealOnly: false },
      { column: def('chk', 'checkbox'), name: 'Chk', revealOnly: true },
      { column: def('s', 'status'), name: 'S', revealOnly: false },
      { column: contextColumn('area'), name: 'Areas', revealOnly: true },
      { column: def('u', 'link'), name: 'U', revealOnly: false },
    ]
    expect(orderAddableEntries(entries).map((e) => e.column.id)).toEqual([
      'n',
      's',
      'u',
      'chk',
      'area',
    ])
  })
})

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

describe('addEntriesFor', () => {
  const ctx = { schema: [], contexts: new Map() } as unknown as ValueContext
  const view = { property_order: ['_title'], hidden_properties: [] } as unknown as SavedView
  const row = { id: 'p', title: 'P', path: 'P.md', frontmatter: {} } as unknown as ViewRow

  it('a stamp entry carries its stamp type and only ever reveals, even while blank', () => {
    const entries = addEntriesFor(row, view, ctx, [TITLE_COLUMN])
    expect(entries.map((e) => [e.column.id, e.column.type, e.revealOnly])).toEqual([
      [FILEDATA.createdAt.id, 'createdTime', true],
      [FILEDATA.modifiedAt.id, 'lastEditedTime', true],
    ])
  })

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
