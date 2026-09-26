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

  it('option kinds open their picker; a Date opens the calendar', () => {
    for (const t of ['status', 'select', 'multiSelect', 'context'] as const)
      expect(sharedValueClickAction(t, { kind: 'null' })).toEqual({ kind: 'picker' })
    expect(sharedValueClickAction('dateTime', { kind: 'null' })).toEqual({ kind: 'dateTime' })
  })

  it('number/link/stamps/title fall through to the surface tail', () => {
    for (const t of ['number', 'link', 'lastEditedTime', 'title', undefined] as const)
      expect(sharedValueClickAction(t, { kind: 'null' })).toBeNull()
  })

  it('a file value names the dialog — one arm for the table, the cards and both panes', () => {
    expect(sharedValueClickAction('file', { kind: 'null' })).toEqual({ kind: 'file' })
    expect(sharedValueClickAction('file', { kind: 'file', value: ['[[a.pdf]]'] })).toEqual({
      kind: 'file',
    })
  })
})
