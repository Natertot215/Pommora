import { describe, expect, it, vi } from 'vitest'
import type { LineSpec } from './engine'
import { groupedLine } from './groupedLine'
import type { Geometry } from './reorderModel'
import { carries, type Family } from './shared'

const geometry: Geometry = { rows: [], groups: new Map(), bottom: 0 }
const itemsSpec = (over: Partial<LineSpec<string, string>> = {}): LineSpec<string, string> => ({
  snap: () => 'item-snap',
  resolve: () => 'item-slot',
  commit: vi.fn(),
  label: () => 'item',
  watch: [],
  ...over,
})
const groupsSpec = (over: Partial<LineSpec<string, string>> = {}): LineSpec<string, string> => ({
  snap: () => 'group-snap',
  resolve: () => 'group-slot',
  commit: vi.fn(),
  label: () => 'group',
  watch: [],
  ...over,
})
const isItem = (id: string): boolean => id.startsWith('r')

describe('groupedLine', () => {
  it('a group key dispatches to the group spec', () => {
    const groups = groupsSpec()
    const spec = groupedLine(isItem, itemsSpec(), groups)
    const snap = spec.snap('sA', geometry)
    expect(snap).toEqual({ group: 'group-snap' })
    expect(spec.resolve('sA', { x: 0, y: 0 }, snap as never)).toBe('group-slot')
    spec.commit('sA', 'group-slot' as never, snap as never)
    expect(groups.commit).toHaveBeenCalledWith('sA', 'group-slot', 'group-snap')
    expect(spec.label('sA')).toBe('group')
  })

  it('an item key dispatches to the item spec', () => {
    const items = itemsSpec()
    const spec = groupedLine(isItem, items, groupsSpec())
    const snap = spec.snap('r1', geometry)
    expect(snap).toEqual({ item: 'item-snap' })
    spec.commit('r1', 'item-slot' as never, snap as never)
    expect(items.commit).toHaveBeenCalledWith('r1', 'item-slot', 'item-snap')
    expect(spec.label('r1')).toBe('item')
  })

  it('each kind names its own keyboard step', () => {
    const into = { part: 'into', id: 'sA' } as const
    const after = { part: 'after', id: 'r2' } as const
    const spec = groupedLine(
      isItem,
      itemsSpec({ step: () => after }),
      groupsSpec({ step: () => into }),
    )
    expect(spec.step?.('item-slot', { item: 'item-snap' })).toBe(after)
    expect(spec.step?.('group-slot', { group: 'group-snap' })).toBe(into)
  })

  it('an item whose spec is locked resolves null while its carry still yields the item', () => {
    const family = { id: 'tabs', to: () => true } as unknown as Family<string>
    const carry = [carries(family, vi.fn())]
    const spec = groupedLine(isItem, itemsSpec({ snap: () => null, carry }), groupsSpec())
    expect(spec.snap('r1', geometry)).toBeNull()
    expect(spec.carry).toBe(carry)
  })

  it('a disabled spec snaps nothing for its own kind', () => {
    const spec = groupedLine(isItem, itemsSpec(), groupsSpec({ disabled: true }))
    expect(spec.snap('sA', geometry)).toBeNull()
    expect(spec.snap('r1', geometry)).toEqual({ item: 'item-snap' })
  })

  it('disclose answers per dragged kind', () => {
    const disclose = vi.fn(() => true)
    const spec = groupedLine(isItem, itemsSpec({ disclose: false }), groupsSpec({ disclose }))
    const answer = spec.disclose as (id: string) => boolean
    expect(answer('r1')).toBe(false)
    expect(answer('sA')).toBe(true)
    expect(disclose).toHaveBeenCalledWith('sA')
    const across = groupedLine(isItem, itemsSpec({ disclose: (id) => id === 'r1' }), groupsSpec())
    expect((across.disclose as (id: string) => boolean)('r1')).toBe(true)
  })
})
