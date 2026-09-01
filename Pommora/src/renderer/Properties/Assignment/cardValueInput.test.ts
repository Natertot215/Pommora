import { describe, expect, it } from 'vitest'
import { type PropertyDefinition, RESERVED_PROPERTY_ID } from '@shared/properties'
import type { ResolvedColumn, ViewRow } from '@shared/types'
import type { SavedView } from '@shared/views'
import type { ResolveContext } from '@renderer/Properties/resolveContext'
import {
  type AddEntry,
  addEntriesFor,
  orderAddableEntries,
  parseEditorValue,
  shownColumnsFor,
} from '@renderer/Properties/Assignment/cardValueInput'

describe('parseEditorValue', () => {
  it('number: parses a finite value, trims, clears on empty, rejects garbage', () => {
    expect(parseEditorValue('number', '42')).toEqual({ kind: 'number', value: 42 })
    expect(parseEditorValue('number', '  3.5 ')).toEqual({ kind: 'number', value: 3.5 })
    expect(parseEditorValue('number', '')).toBeNull()
    expect(parseEditorValue('number', 'abc')).toBeUndefined()
  })

  it('url: normalizes + serializes a valid link, clears on empty, rejects invalid', () => {
    expect(parseEditorValue('url', 'example.com')).toEqual({
      kind: 'url',
      value: 'https://example.com',
    })
    expect(parseEditorValue('url', '')).toBeNull()
    expect(parseEditorValue('url', 'not a url')).toBeUndefined()
  })

  it('an unsupported type never commits', () => {
    expect(parseEditorValue('status', 'x')).toBeUndefined()
  })
})

describe('orderAddableEntries', () => {
  it('sinks reveal-only entries to the bottom; pane entries stay on top in order', () => {
    const entries: AddEntry[] = [
      { id: 'n', name: 'N', type: 'number', def: null, revealOnly: false },
      { id: 'chk', name: 'Chk', type: 'checkbox', def: null, revealOnly: true },
      { id: 's', name: 'S', type: 'status', def: null, revealOnly: false },
      { id: 'area', name: 'Areas', type: 'context', def: null, revealOnly: true },
      { id: 'u', name: 'U', type: 'url', def: null, revealOnly: false },
    ]
    expect(orderAddableEntries(entries).map((e) => e.id)).toEqual(['n', 's', 'u', 'chk', 'area'])
  })
})

describe('shownColumnsFor', () => {
  const sel = {
    id: 'sel',
    name: 'Sel',
    type: 'select',
    select_options: [{ value: 'Done', label: 'Done' }],
  } as PropertyDefinition
  const chk = { id: 'chk', name: 'Chk', type: 'checkbox' } as PropertyDefinition
  const ctx = { schema: [sel, chk], contextsById: new Map() } as unknown as ResolveContext
  const columns: ResolvedColumn[] = [
    { id: '_title', kind: 'title' },
    { id: 'sel', kind: 'property' },
    { id: 'chk', kind: 'property' },
  ]
  const row = (fm: Record<string, unknown>): ViewRow =>
    ({ id: 'p', title: 'P', path: 'P.md', frontmatter: fm }) as unknown as ViewRow

  it('Standard keeps blank columns as fillable rows; the title column never shows', () => {
    expect(shownColumnsFor(row({}), columns, ctx, false).map((c) => c.id)).toEqual(['sel', 'chk'])
  })

  it('Compact drops blank values except checkbox and keeps filled ones', () => {
    expect(shownColumnsFor(row({}), columns, ctx, true).map((c) => c.id)).toEqual(['chk'])
    expect(
      shownColumnsFor(row({ [sel.name]: 'Done' }), columns, ctx, true).map((c) => c.id),
    ).toEqual(['sel', 'chk'])
  })
})

describe('addEntriesFor', () => {
  const ctx = { schema: [], contexts: new Map() } as unknown as ResolveContext
  const view = { property_order: ['_title'], hidden_properties: [] } as unknown as SavedView
  const row = { id: 'p', title: 'P', path: 'P.md', frontmatter: {} } as unknown as ViewRow

  it('a stamp entry carries its stamp type and only ever reveals, even while blank', () => {
    const { createdAt, modifiedAt } = RESERVED_PROPERTY_ID
    const entries = addEntriesFor(row, view, ctx, [{ id: '_title', kind: 'title' }])
    expect(entries.map((e) => [e.id, e.type, e.revealOnly])).toEqual([
      [createdAt, 'created_time', true],
      [modifiedAt, 'last_edited_time', true],
    ])
  })
})
