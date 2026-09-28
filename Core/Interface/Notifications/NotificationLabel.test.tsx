// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { NotificationLabel } from './NotificationLabel'
import { clearNotification, notifyDeleted } from './notifications'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.body.appendChild(document.createElement('div'))
  root = createRoot(host)
  act(() => root.render(<NotificationLabel />))
})

afterEach(() => {
  act(() => {
    clearNotification()
    root.unmount()
  })
  host.remove()
})

const label = (): Element | null => host.querySelector('[role=status]')

describe('NotificationLabel', () => {
  it('draws the count after the title behind one hidden divider', () => {
    act(() => notifyDeleted('Ideas', vi.fn(), { pages: ['A.md', 'B.md'] }))
    const dividers = label()?.querySelectorAll('[aria-hidden="true"]') ?? []
    expect(dividers).toHaveLength(1)
    expect([
      dividers[0].previousSibling?.textContent,
      dividers[0].nextSibling?.textContent,
    ]).toEqual(['Deleted “Ideas”', '2 Internal Links'])
  })

  it('draws a notice without a count as its message alone', () => {
    act(() => notifyDeleted('Ideas', vi.fn()))
    expect(label()?.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
    expect(label()?.textContent).toBe('Deleted “Ideas”Undo')
  })
})
