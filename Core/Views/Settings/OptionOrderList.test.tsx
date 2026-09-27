// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { mountEachTest } from '../../Testing/viewHarness'
import { PropertyPreview } from './OptionOrderList'

let host: HTMLDivElement
let root: Root
mountEachTest((h, r) => {
  host = h
  root = r
})

describe('PropertyPreview', () => {
  it('previews a Select by its own options, never as a stale status_groups array it still carries', () => {
    const def: PropertyDefinition = {
      id: 'p',
      name: 'Kind',
      type: 'select',
      select_options: [{ value: 'Alpha' }],
      status_groups: [
        {
          id: 'g',
          label: 'Stale Group',
          color: 'grey',
          options: [{ value: 'Zeta', group_id: 'g' }],
        },
      ],
    }
    act(() => root.render(<PropertyPreview group={{ order_mode: 'configured' }} def={def} />))
    expect(host.textContent).toContain('Alpha')
    expect(host.textContent).not.toContain('Stale Group')
    expect(host.textContent).not.toContain('Zeta')
  })
})
