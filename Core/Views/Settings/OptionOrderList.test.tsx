// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import type { PropertyDefinition } from '../../Properties/properties'
import { DragGroup } from '@pommora/uix/Interactions/drag'
import { firePointer, pressEscape, stubRect } from '@pommora/uix/Utilities/pointerHarness'
import { mountEachTest } from '../../Testing/viewHarness'
import { OptionOrderList } from './OptionOrderList'

let host: HTMLDivElement
let root: Root
mountEachTest((h, r) => {
  host = h
  root = r
})

const selectDef: PropertyDefinition = {
  id: 'p',
  label: 'Kind',
  key: 'Kind',
  type: 'select',
  select_options: [
    { id: 'opt_Alpha', key: 'Alpha', label: 'Alpha' },
    { id: 'opt_Beta', key: 'Beta', label: 'Beta' },
    { id: 'opt_Gamma', key: 'Gamma', label: 'Gamma' },
  ],
}

const statusDef: PropertyDefinition = {
  id: 's',
  label: 'Status',
  key: 'Status',
  type: 'status',
  status_groups: [
    {
      id: 'upcoming',
      label: 'Upcoming',
      color: 'gray',
      options: [{ id: 'opt_not_started', key: 'not_started', label: 'not_started' }],
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      color: 'blue',
      options: [{ id: 'opt_active', key: 'active', label: 'active', color: 'blue' }],
    },
    {
      id: 'done',
      label: 'Done',
      color: 'green',
      options: [{ id: 'opt_complete', key: 'complete', label: 'complete', color: 'green' }],
    },
  ],
}

const rows = (): HTMLElement[] => [...host.querySelectorAll<HTMLElement>('[data-line-row]')]

const mount = async (
  group: { order_mode: 'configured' | 'manual' | 'reversed'; order?: string[] },
  def: PropertyDefinition,
  onSave?: (order: string[]) => void,
): Promise<void> => {
  await act(async () => {
    root.render(
      <DragGroup>
        <OptionOrderList group={group} def={def} onSave={onSave} />
      </DragGroup>,
    )
  })
  const zone = host.querySelector('.line-zone')
  if (zone) stubRect(zone, { top: 0, bottom: rows().length * 30 })
  for (const [i, el] of rows().entries()) stubRect(el, { top: i * 30, bottom: i * 30 + 30 })
}

const drag = async (from: number, toY: number): Promise<void> => {
  await act(async () => {
    firePointer(rows()[from], 'pointerdown', { x: 10, y: from * 30 + 15 })
  })
  await act(async () => {
    firePointer(window, 'pointermove', { x: 10, y: toY })
  })
}
const release = async (): Promise<void> => {
  await act(async () => {
    firePointer(window, 'pointerup')
  })
}

describe('OptionOrderList', () => {
  it('previews a Select by its own options, never as a stale status_groups array it still carries', async () => {
    const def: PropertyDefinition = {
      ...selectDef,
      select_options: [{ id: 'opt_Alpha', key: 'Alpha', label: 'Alpha' }],
      status_groups: [
        {
          id: 'g',
          label: 'Stale Group',
          color: 'grey',
          options: [{ id: 'opt_Zeta', key: 'Zeta', label: 'Zeta' }],
        },
      ],
    }
    await mount({ order_mode: 'configured' }, def)
    expect(host.textContent).toContain('Alpha')
    expect(host.textContent).not.toContain('Stale Group')
    expect(host.textContent).not.toContain('Zeta')
  })

  it('under Default, a drag saves the shown order with the move applied', async () => {
    const onSave = vi.fn()
    await mount({ order_mode: 'configured' }, selectDef, onSave)
    await drag(2, 5)
    await release()
    expect(onSave).toHaveBeenCalledExactlyOnceWith(['opt_Gamma', 'opt_Alpha', 'opt_Beta'])
  })

  it('a Status list under Reversed saves the reversed order, moved', async () => {
    const onSave = vi.fn()
    await mount({ order_mode: 'reversed' }, statusDef, onSave)
    await drag(0, 70)
    await release()
    expect(onSave).toHaveBeenCalledExactlyOnceWith([
      'opt_active',
      'opt_complete',
      'opt_not_started',
    ])
  })

  it('without onSave, a press never lifts', async () => {
    await mount({ order_mode: 'configured' }, selectDef)
    await drag(2, 5)
    expect(host.querySelector('.drop-line')).toBeNull()
    expect(rows()[2].hasAttribute('data-drag-source')).toBe(false)
    pressEscape()
  })
})
