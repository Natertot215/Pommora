// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ok } from '@pommora/core/Contract/result'
import type { StatusGroup } from '@pommora/core/Properties/properties'
import { StatusEditor } from './StatusEditor'
import { useSession } from '../../Session/store'
import { stubDialer } from '../../vitest.setup'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const groups = [
  {
    id: 'todo',
    label: 'To-do',
    color: 'grey',
    options: [{ value: 'Open', label: 'Open', group_id: 'todo' }],
  },
] as StatusGroup[]

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    menu: async () => ok('option:edit-icon'),
  })
  useSession.setState({ personalization: { iconFavorites: ['anchor'] } })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('a Status option menu', () => {
  it('Edit Icon opens the icon picker and sets the picked icon', async () => {
    const onSetGroups = vi.fn()
    act(() =>
      root.render(
        <StatusEditor
          groups={groups}
          look="standard"
          onSetGroups={onSetGroups}
          onRenameOption={vi.fn()}
          onRemoveOption={vi.fn()}
          onClearOption={vi.fn()}
        />,
      ),
    )
    const chip = Array.from(host.querySelectorAll('span')).find((el) => el.textContent === 'Open')
    await act(async () => {
      chip?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    })
    const favorite = document.querySelector<HTMLButtonElement>(
      '[data-picker-portal] button[title="anchor"]',
    )
    act(() => favorite?.click())
    expect(onSetGroups).toHaveBeenCalledWith([
      { ...groups[0], options: [{ ...groups[0]?.options[0], icon: 'anchor' }] },
    ])
  })
})
