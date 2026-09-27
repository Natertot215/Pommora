import { describe, it, expect } from 'vitest'
import { addOption, applyOptionEdit, fallbackTitle, moveOption, renameOption } from './optionModel'
import {
  optionGroupsOf,
  withOptionGroups,
  type PropertyDefinition,
  type StatusGroup,
  type StatusOption,
} from './properties'

const groups: StatusGroup[] = [
  {
    id: 'upcoming',
    label: 'Open',
    color: 'grey',
    options: [{ value: 'A', group_id: 'upcoming' }],
  },
  {
    id: 'done',
    label: 'Done',
    color: 'green',
    options: [{ value: 'D', group_id: 'done', color: 'red' }],
  },
]
const A = groups[0].options[0]
const D = groups[1].options[0]

describe('optionModel', () => {
  it('fallbackTitle yields Label for select and the group name for status', () => {
    expect(fallbackTitle([])).toBe('Label')
    expect(fallbackTitle([], 'Active')).toBe('Active')
    expect(fallbackTitle(['Label'], '')).toBe('Label (2)')
  })

  it('fallbackTitle steps aside from a title already taken', () => {
    expect(fallbackTitle(['Label'])).toBe('Label (2)')
    expect(fallbackTitle(['Open'], 'Open')).toBe('Open (2)')
  })

  it('addOption inserts into the matched group only, carrying its group_id', () => {
    expect(addOption(groups, 'upcoming', 'Triage', 0)[0].options.map((o) => o.value)).toEqual([
      'Triage',
      'A',
    ])
    const next = addOption(groups, 'upcoming', 'Backlog')
    expect(next[0].options).toEqual([A, { value: 'Backlog', group_id: 'upcoming' }])
    expect(next[1]).toBe(groups[1])
  })

  it('renameOption sets the value to the new title in any group, keeping group_id + color', () => {
    expect(renameOption(groups, 'D', 'Shipped')[1].options[0]).toEqual({
      ...D,
      value: 'Shipped',
    })
    expect(renameOption(groups, 'A', 'Todo')[0].options[0]).toEqual({
      ...A,
      value: 'Todo',
    })
  })

  it('moveOption reassigns group_id and inserts at the target index (cross-group)', () => {
    const next = moveOption(groups, 'A', 'done', 0)
    expect(next[0].options).toEqual([])
    expect(next[1].options).toEqual([{ ...A, group_id: 'done' }, D])
  })

  it('applyOptionEdit recolor sets a color on one option and clears it on another', () => {
    expect(
      applyOptionEdit(groups, { op: 'recolor', value: 'A', color: 'red' })[0].options[0],
    ).toEqual({ ...A, color: 'red' })
    expect(applyOptionEdit(groups, { op: 'recolor', value: 'D' })[1].options[0]).toEqual({
      value: 'D',
      group_id: 'done',
    })
  })

  it('applyOptionEdit icon and appearance set and clear the field on the option in whichever group holds it', () => {
    const icon = (gs: StatusGroup[], icon?: string) =>
      applyOptionEdit(gs, { op: 'icon', value: 'D', icon })
    const appearance = (gs: StatusGroup[], appearance: 'clear' | 'filled') =>
      applyOptionEdit(gs, { op: 'appearance', value: 'A', appearance })
    expect(icon(groups, 'star')[1].options[0]).toEqual({ ...D, icon: 'star' })
    expect(icon(icon(groups, 'star'), undefined)[1].options[0]).toEqual(D)
    expect(appearance(groups, 'clear')[0].options[0]).toEqual({ ...A, appearance: 'clear' })
    expect(appearance(appearance(groups, 'clear'), 'filled')[0].options[0]).toEqual(A)
  })

  it('applyOptionEdit relabelGroup renames the label, keeping id + options', () => {
    expect(
      applyOptionEdit(groups, { op: 'relabelGroup', groupId: 'upcoming', label: 'Backlog' })[0],
    ).toEqual({ ...groups[0], label: 'Backlog' })
  })

  it('every applyOptionEdit op keeps the keys it does not build fresh on every entry', () => {
    type Raw = StatusOption & { tint?: string; appearance?: string }
    const raw = [
      {
        id: 'g1',
        label: 'One',
        color: 'grey',
        tint: 'x',
        options: [
          { value: 'A', group_id: 'g1', tint: 'x', appearance: 'outline' },
          { value: 'B', group_id: 'g1', tint: 'x', appearance: 'outline' },
        ],
      },
      {
        id: 'g2',
        label: 'Two',
        color: 'green',
        tint: 'x',
        options: [{ value: 'C', group_id: 'g2', tint: 'x', appearance: 'outline' }],
      },
    ] as unknown as StatusGroup[]
    const entries = (gs: StatusGroup[]) => gs.flatMap((g) => g.options) as Raw[]
    const edits = [
      { op: 'add', groupId: 'g1', title: 'N' },
      { op: 'recolor', value: 'A', color: 'red' },
      { op: 'icon', value: 'A', icon: 'star' },
      { op: 'appearance', value: 'A', appearance: 'clear' },
      { op: 'move', value: 'A', groupId: 'g2', toIndex: 0 },
      { op: 'relabelGroup', groupId: 'g1', label: 'Uno' },
    ] as const
    for (const e of edits) {
      const next = applyOptionEdit(raw, e)
      expect(next.map((g) => (g as { tint?: string }).tint)).toEqual(['x', 'x'])
      expect(entries(next).filter((o) => o.value !== 'N')).toHaveLength(3)
      for (const o of entries(next)) {
        if (o.value === 'N') continue
        expect(o.tint).toBe('x')
        if (o.value !== 'A') expect(o).toEqual(entries(raw).find((r) => r.value === o.value))
        else if (e.op !== 'appearance') expect(o.appearance).toBe('outline')
      }
    }
  })

  it('withOptionGroups(optionGroupsOf(select)) round-trips a Select with no group_id on any entry', () => {
    const options = [{ value: 'A' }, { value: 'B', color: 'red' }]
    const select = {
      id: 'p',
      name: 'Tags',
      type: 'select',
      select_options: options,
    } as PropertyDefinition
    const selectGroups = optionGroupsOf(select)
    expect(selectGroups).toHaveLength(1)
    expect(selectGroups[0].options.every((o) => o.group_id === 'select')).toBe(true)
    const back = withOptionGroups(select, selectGroups)
    expect(back).toEqual(select)
    expect(back.select_options?.some((o) => 'group_id' in o)).toBe(false)
    expect(
      withOptionGroups(
        select,
        applyOptionEdit(selectGroups, { op: 'add', groupId: 'select', title: 'C' }),
      ).select_options,
    ).toEqual([...options, { value: 'C' }])
  })

  it('optionGroupsOf(status) is status_groups by reference', () => {
    const status = {
      id: 'p',
      name: 'Stage',
      type: 'status',
      status_groups: groups,
    } as PropertyDefinition
    expect(optionGroupsOf(status)).toBe(groups)
    expect(withOptionGroups(status, groups).status_groups).toEqual(groups)
  })
})
