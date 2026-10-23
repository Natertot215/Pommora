import { describe, it, expect } from 'vitest'
import { addOption, applyOptionEdit } from './optionModel'
import {
  optionGroupsOf,
  withOptionGroups,
  type PropertyDefinition,
  type SelectOption,
  type StatusGroup,
} from './properties'

const groups: StatusGroup[] = [
  {
    id: 'upcoming',
    label: 'Open',
    color: 'grey',
    options: [{ id: 'opt_A', key: 'A', label: 'A' }],
  },
  {
    id: 'done',
    label: 'Done',
    color: 'green',
    options: [{ id: 'opt_D', key: 'D', label: 'D', color: 'red' }],
  },
]
const A = groups[0].options[0]
const D = groups[1].options[0]

describe('optionModel', () => {
  it('addOption inserts the option it is handed into the matched group only', () => {
    const triage = { id: 'opt_triage', key: 'triage', label: 'Triage' }
    expect(addOption(groups, 'upcoming', triage, 0)[0].options).toEqual([triage, A])
    const backlog = { id: 'opt_Backlog', key: 'Backlog', label: 'Backlog' }
    const next = addOption(groups, 'upcoming', backlog)
    expect(next[0].options).toEqual([A, backlog])
    expect(next[1]).toBe(groups[1])
  })

  it('applyOptionEdit move carries the option as stored and inserts at the target index (cross-group)', () => {
    const next = applyOptionEdit(groups, {
      op: 'move',
      optionId: 'opt_A',
      groupId: 'done',
      toIndex: 0,
    })
    expect(next[0].options).toEqual([])
    expect(next[1].options).toEqual([{ ...A }, D])
  })

  it('applyOptionEdit recolor sets a color on one option and clears it on another', () => {
    expect(
      applyOptionEdit(groups, { op: 'recolor', optionId: 'opt_A', color: 'red' })[0].options[0],
    ).toEqual({ ...A, color: 'red' })
    expect(applyOptionEdit(groups, { op: 'recolor', optionId: 'opt_D' })[1].options[0]).toEqual({
      id: 'opt_D',
      key: 'D',
      label: 'D',
    })
  })

  it('applyOptionEdit icon and appearance set and clear the field on the option in whichever group holds it', () => {
    const icon = (gs: StatusGroup[], icon?: string) =>
      applyOptionEdit(gs, { op: 'icon', optionId: 'opt_D', icon })
    const appearance = (gs: StatusGroup[], appearance: 'clear' | 'filled') =>
      applyOptionEdit(gs, { op: 'appearance', optionId: 'opt_A', appearance })
    expect(icon(groups, 'star')[1].options[0]).toEqual({ ...D, icon: 'star' })
    expect(icon(icon(groups, 'star'), undefined)[1].options[0]).toEqual(D)
    expect(appearance(groups, 'clear')[0].options[0]).toEqual({ ...A, appearance: 'clear' })
    expect(appearance(appearance(groups, 'clear'), 'filled')[0].options[0]).toEqual(A)
  })

  it('add lands the option under the id it carries', () => {
    const next = applyOptionEdit(
      groups,
      { op: 'add', groupId: 'done', id: 'opt_x', label: 'X' },
      'lowercase',
    )
    expect(next[1].options).toEqual([D, { id: 'opt_x', key: 'x', label: 'X' }])
    expect(next[0]).toBe(groups[0])
  })

  it('applyOptionEdit relabelGroup renames the label, keeping id + options', () => {
    expect(
      applyOptionEdit(groups, { op: 'relabelGroup', groupId: 'upcoming', label: 'Backlog' })[0],
    ).toEqual({ ...groups[0], label: 'Backlog' })
  })

  it('every applyOptionEdit op keeps the keys it does not build fresh on every entry', () => {
    type Raw = SelectOption & { tint?: string; appearance?: string }
    const raw = [
      {
        id: 'g1',
        label: 'One',
        color: 'grey',
        tint: 'x',
        options: [
          { id: 'opt_A', key: 'A', label: 'A', tint: 'x', appearance: 'outline' },
          { id: 'opt_B', key: 'B', label: 'B', tint: 'x', appearance: 'outline' },
        ],
      },
      {
        id: 'g2',
        label: 'Two',
        color: 'green',
        tint: 'x',
        options: [{ id: 'opt_C', key: 'C', label: 'C', tint: 'x', appearance: 'outline' }],
      },
    ] as unknown as StatusGroup[]
    const entries = (gs: StatusGroup[]) => gs.flatMap((g) => g.options) as Raw[]
    const edits = [
      { op: 'add', groupId: 'g1', id: 'opt_N', label: 'N' },
      { op: 'recolor', optionId: 'opt_A', color: 'red' },
      { op: 'icon', optionId: 'opt_A', icon: 'star' },
      { op: 'appearance', optionId: 'opt_A', appearance: 'clear' },
      { op: 'move', optionId: 'opt_A', groupId: 'g2', toIndex: 0 },
      { op: 'relabelGroup', groupId: 'g1', label: 'Uno' },
    ] as const
    for (const e of edits) {
      const next = applyOptionEdit(raw, e)
      expect(next.map((g) => (g as { tint?: string }).tint)).toEqual(['x', 'x'])
      expect(entries(next).filter((o) => o.label !== 'N')).toHaveLength(3)
      for (const o of entries(next)) {
        if (o.label === 'N') continue
        expect(o.tint).toBe('x')
        if (o.label !== 'A') expect(o).toEqual(entries(raw).find((r) => r.label === o.label))
        else if (e.op !== 'appearance') expect(o.appearance).toBe('outline')
      }
    }
  })

  it('withOptionGroups(optionGroupsOf(select)) round-trips a Select', () => {
    const options = [
      { id: 'opt_A', key: 'A', label: 'A' },
      { id: 'opt_B', key: 'B', label: 'B', color: 'red' },
    ]
    const select = {
      id: 'p',
      label: 'Tags',
      key: 'Tags',
      type: 'select',
      select_options: options,
    } as PropertyDefinition
    const selectGroups = optionGroupsOf(select)
    expect(selectGroups).toHaveLength(1)
    const back = withOptionGroups(select, selectGroups)
    expect(back).toEqual(select)
    expect(
      withOptionGroups(
        select,
        applyOptionEdit(selectGroups, { op: 'add', groupId: 'select', id: 'opt_C', label: 'C' }),
      ).select_options,
    ).toEqual([...options, { id: 'opt_C', key: 'C', label: 'C' }])
  })

  it('optionGroupsOf(status) is status_groups by reference', () => {
    const status = {
      id: 'p',
      label: 'Stage',
      key: 'Stage',
      type: 'status',
      status_groups: groups,
    } as PropertyDefinition
    expect(optionGroupsOf(status)).toBe(groups)
    expect(withOptionGroups(status, groups).status_groups).toEqual(groups)
  })
})
