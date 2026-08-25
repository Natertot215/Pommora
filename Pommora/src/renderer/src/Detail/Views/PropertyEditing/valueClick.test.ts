import { describe, it, expect } from 'vitest'
import { sharedValueClickAction } from './valueClick'

describe('sharedValueClickAction', () => {
  it('checkbox is true-or-absent: unchecked sets true, checked clears the key', () => {
    expect(sharedValueClickAction('checkbox', { kind: 'null' })).toEqual({
      kind: 'commit',
      value: { kind: 'checkbox', value: true },
    })
    expect(sharedValueClickAction('checkbox', { kind: 'checkbox', value: true })).toEqual({
      kind: 'commit',
      value: null,
    })
  })

  it('option kinds open their picker; datetime opens the calendar', () => {
    for (const t of ['status', 'select', 'multi_select', 'context'])
      expect(sharedValueClickAction(t, { kind: 'null' })).toEqual({ kind: 'picker' })
    expect(sharedValueClickAction('datetime', { kind: 'null' })).toEqual({ kind: 'datetime' })
  })

  it('number/url/title fall through to the surface tail', () => {
    for (const t of ['number', 'url', 'last_edited_time', undefined])
      expect(sharedValueClickAction(t, { kind: 'null' })).toBeNull()
  })

  it('a file value names the dialog — one arm for the table, the cards and both panes', () => {
    expect(sharedValueClickAction('file', { kind: 'null' })).toEqual({ kind: 'file' })
    expect(sharedValueClickAction('file', { kind: 'file', value: ['[[a.pdf]]'] })).toEqual({
      kind: 'file',
    })
  })
})
