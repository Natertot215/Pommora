import { describe, it, expect, vi } from 'vitest'
import {
  runValueIntent,
  type ValueIntentHandlers,
  valueClickIntent,
  valueMenuIntent,
} from './valueClick'

describe('valueClickIntent', () => {
  it('a text value edits in place, filled or empty', () => {
    expect(valueClickIntent('text', { kind: 'text', value: 'a note' })).toEqual({ kind: 'edit' })
    expect(valueClickIntent('text', { kind: 'null' })).toEqual({ kind: 'edit' })
  })

  it('checkbox is true-or-absent: unchecked sets true, checked clears the key', () => {
    expect(valueClickIntent('checkbox', { kind: 'null' })).toEqual({
      kind: 'commit',
      value: { kind: 'checkbox', value: true },
    })
    expect(valueClickIntent('checkbox', { kind: 'checkbox', value: true })).toEqual({
      kind: 'commit',
      value: null,
    })
  })

  it('option kinds open their picker; a Date opens the calendar', () => {
    for (const t of ['status', 'select', 'multiSelect', 'context'] as const)
      expect(valueClickIntent(t, { kind: 'null' })).toEqual({ kind: 'picker' })
    expect(valueClickIntent('dateTime', { kind: 'null' })).toEqual({ kind: 'dateTime' })
  })

  it('a file value names the dialog — one arm for the table, the cards and both panes', () => {
    expect(valueClickIntent('file', { kind: 'null' })).toEqual({ kind: 'file' })
    expect(valueClickIntent('file', { kind: 'file', value: ['[[a.pdf]]'] })).toEqual({
      kind: 'file',
    })
  })

  it('a stamp or the title opens nothing, though a stamp value is a date', () => {
    for (const t of ['createdTime', 'lastEditedTime'] as const)
      expect(valueClickIntent(t, { kind: 'dateTime', value: '2026-01-01' })).toBeNull()
    expect(valueClickIntent('title', { kind: 'null' })).toBeNull()
    expect(valueClickIntent(undefined, { kind: 'null' })).toBeNull()
  })

  it('a number edits in place unless it draws as a bar', () => {
    const percent = { number_family: 'percent' } as const
    const n = { kind: 'number', value: 40 } as const
    expect(valueClickIntent('number', n)).toEqual({ kind: 'edit' })
    expect(valueClickIntent('number', n, 'bar', percent)).toEqual({ kind: 'numberPicker' })
    expect(valueClickIntent('number', n, 'number', percent)).toEqual({ kind: 'edit' })
  })

  it('a Bar look with no divisor draws as text, so it edits as text', () => {
    const plain = { number_family: 'number' } as const
    expect(valueClickIntent('number', { kind: 'number', value: 4 }, 'bar', plain)).toEqual({
      kind: 'edit',
    })
  })

  it('a valid address opens, an empty or malformed link edits, and a page link leaves the click to its text', () => {
    expect(valueClickIntent('link', { kind: 'link', value: 'https://a.com' })).toEqual({
      kind: 'open',
      url: 'https://a.com',
    })
    expect(valueClickIntent('link', { kind: 'null' })).toEqual({ kind: 'edit' })
    expect(valueClickIntent('link', { kind: 'link', value: '[[Alpha]]' })).toBeNull()
    expect(valueClickIntent('link', { kind: 'link', value: 'TBD' })).toEqual({ kind: 'edit' })
  })
})

describe('valueMenuIntent', () => {
  it('maps the value edits both link menus share, and nothing else', () => {
    expect(valueMenuIntent('editLink')).toEqual({ kind: 'edit' })
    expect(valueMenuIntent('rename')).toEqual({ kind: 'rename' })
    expect(valueMenuIntent('cell:clear')).toEqual({ kind: 'commit', value: null })
    expect(valueMenuIntent('cell:hide')).toEqual({ kind: 'hide' })
    expect(valueMenuIntent('style:look:bar')).toBeNull()
  })
})

describe('runValueIntent', () => {
  const on = (edit: ValueIntentHandlers['edit']): ValueIntentHandlers => ({
    commit: null,
    picker: null,
    dateTime: null,
    file: null,
    edit,
    numberPicker: null,
    rename: null,
    open: null,
    hide: null,
  })
  it('runs the handler and reports it ran', () => {
    const edit = vi.fn()
    expect(runValueIntent({ kind: 'edit' }, on(edit))).toBe(true)
    expect(edit).toHaveBeenCalledOnce()
  })
  it('reports a missing intent or a declined one as not handled', () => {
    expect(runValueIntent(null, on(vi.fn()))).toBe(false)
    expect(runValueIntent({ kind: 'edit' }, on(null))).toBe(false)
  })
})
