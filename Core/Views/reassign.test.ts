import { describe, it, expect } from 'vitest'
import { UNGROUPED } from './viewRow'
import { groupKeyToValue, reassignable, reassignTarget } from './reassign'

describe('groupKeyToValue — destination group key → PropertyValue', () => {
  it('status: the key is the status value', () => {
    expect(groupKeyToValue('opt_done', 'status')).toEqual({ kind: 'select', value: 'opt_done' })
  })

  it('select: the key is the select value', () => {
    expect(groupKeyToValue('opt_red', 'select')).toEqual({ kind: 'select', value: 'opt_red' })
  })

  it('checkbox: the true key checks, any other key clears — a checkbox is true or absent', () => {
    expect(groupKeyToValue('true', 'checkbox')).toEqual({ kind: 'checkbox', value: true })
    expect(groupKeyToValue('false', 'checkbox')).toBeNull()
  })

  it('the no-value band clears the property (null)', () => {
    expect(groupKeyToValue(UNGROUPED, 'status')).toBeNull()
    expect(groupKeyToValue(UNGROUPED, 'select')).toBeNull()
  })

  it('an un-reassignable type yields null (caller gates these out)', () => {
    expect(groupKeyToValue('2026-06', 'dateTime')).toBeNull()
    expect(groupKeyToValue('x', undefined)).toBeNull()
  })

  it('reassignable holds for Status, Select and Checkbox and nothing else', () => {
    for (const t of ['status', 'select', 'checkbox'] as const) expect(reassignable(t)).toBe(true)
    for (const t of [
      'dateTime',
      'createdTime',
      'lastEditedTime',
      'number',
      'multiSelect',
      'context',
      'link',
      'text',
      'file',
      'title',
      undefined,
    ] as const)
      expect(reassignable(t)).toBe(false)
  })
})

describe('reassignTarget - the sorted-run drop', () => {
  const keys: Record<string, string> = {
    a: 'opt_todo',
    b: 'opt_todo',
    c: 'opt_doing',
    d: 'opt_doing',
    e: 'opt_doing',
    lone: 'opt_blocked',
    f: UNGROUPED,
    g: UNGROUPED,
  }
  const run = (order: string[], dragged: string): string | undefined =>
    reassignTarget(order, dragged, (id) => keys[id])

  it('a slot strictly inside a foreign run takes that run value', () => {
    expect(run(['a', 'c', 'b', 'd', 'e'], 'b')).toBe('opt_doing')
  })

  it('the seam between two runs changes nothing', () => {
    expect(run(['a', 'b', 'c', 'd', 'e'], 'b')).toBeUndefined()
  })

  it('either end of the list changes nothing', () => {
    expect(run(['b', 'c', 'd', 'e'], 'b')).toBeUndefined()
    expect(run(['c', 'd', 'e', 'b'], 'b')).toBeUndefined()
  })

  it('a slot inside the row own run is a pure reorder', () => {
    expect(run(['c', 'e', 'd'], 'e')).toBeUndefined()
  })

  it('the no-value tail is a run like any other - entering it clears', () => {
    expect(run(['c', 'd', 'f', 'a', 'g'], 'a')).toBe(UNGROUPED)
  })

  it('a run of one can never be entered - it has no interior slot', () => {
    expect(run(['a', 'b', 'lone', 'f', 'g'], 'b')).toBeUndefined()
    expect(run(['a', 'lone', 'b', 'f', 'g'], 'b')).toBeUndefined()
  })
})
