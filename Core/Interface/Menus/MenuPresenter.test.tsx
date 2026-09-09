// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { ActionItem } from '@pommora/core/Actions/menuModel'
import { slotContent } from '@pommora/uix/Menus/frame-slide.css'
import { optionSelected } from '@pommora/uix/Pickers/picker-base.css'
import { useSession } from '../../Session/store'
import { MenuPresenter } from './MenuPresenter'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let trigger: HTMLButtonElement
let root: Root

beforeEach(() => {
  vi.useFakeTimers()
  host = document.createElement('div')
  trigger = document.createElement('button')
  document.body.append(host, trigger)
  root = createRoot(host)
  act(() => root.render(<MenuPresenter />))
})

afterEach(() => {
  act(() => vi.advanceTimersByTime(1000))
  act(() => root.unmount())
  host.remove()
  trigger.remove()
  vi.useRealTimers()
})

const rows = (): HTMLElement[] =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-picker-portal] [role="button"], [data-picker-portal] button',
    ),
  )
const labelled = (text: string): HTMLElement | undefined =>
  rows().find((r) => r.textContent === text)

describe('the in-app menu presenter', () => {
  it('draws the rows it was asked for and resolves the picked action', async () => {
    let promise!: Promise<string | null>
    await act(async () => {
      promise = useSession.getState().presentMenu(
        [
          { label: 'Rename', action: 'rename' },
          { label: 'Delete', action: 'delete', separatorBefore: true },
        ],
        trigger,
      )
    })
    expect(rows().map((r) => r.textContent)).toEqual(['Rename', 'Delete'])
    await act(async () => {
      labelled('Delete')?.click()
    })
    await expect(promise).resolves.toBe('delete')
    expect(useSession.getState().pendingMenu).toBeNull()
  })

  it('resolves null once dismissed, and keeps the rows drawn through the exit', async () => {
    let promise!: Promise<string | null>
    await act(async () => {
      promise = useSession.getState().presentMenu([{ label: 'Rename', action: 'rename' }], trigger)
    })
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    await expect(promise).resolves.toBeNull()
    expect(useSession.getState().pendingMenu).toBeNull()
    expect(labelled('Rename')).toBeDefined()
    act(() => vi.advanceTimersByTime(1000))
    expect(labelled('Rename')).toBeUndefined()
  })

  it('drills into a branch and resolves its leaf', async () => {
    let promise!: Promise<string | null>
    await act(async () => {
      promise = useSession.getState().presentMenu(
        [
          {
            label: 'Style',
            action: 'style:a',
            submenu: [{ label: 'Bordered', action: 'style:a' }],
          },
        ],
        trigger,
      )
    })
    await act(async () => {
      labelled('Style')?.click()
    })
    expect(labelled('Bordered')).toBeDefined()
    await act(async () => {
      labelled('Bordered')?.click()
    })
    await expect(promise).resolves.toBe('style:a')
  })

  it('draws a checked row as a ringed option beside an unchecked command row', async () => {
    await act(async () => {
      void useSession.getState().presentMenu(
        [
          { label: 'Bordered', action: 'style:bordered', checked: true },
          { label: 'Rename', action: 'rename' },
        ],
        trigger,
      )
    })
    expect(labelled('Bordered')?.tagName).toBe('BUTTON')
    expect(labelled('Rename')?.getAttribute('role')).toBe('button')
    await act(async () => {
      useSession.getState().pendingMenu?.settle(null)
    })
  })

  it('keeps a stay row’s pane open and redraws it with the rows the handler returns', async () => {
    let promise!: Promise<string | null>
    const styleItems = (borderless: boolean): ActionItem<string>[] => [
      {
        label: 'Bordered',
        action: 'style:bordered',
        checked: !borderless,
        stay: true,
      },
      { label: 'Borderless', action: 'style:borderless', checked: borderless, stay: true },
    ]
    const items = (borderless: boolean): ActionItem<string>[] => [
      { label: 'Style', action: 'style', submenu: styleItems(borderless) },
      { label: 'Delete', action: 'delete' },
    ]
    const stay = vi.fn((action: string) => items(action === 'style:borderless'))
    await act(async () => {
      promise = useSession.getState().presentMenu(items(false), trigger, { stay })
    })
    await act(async () => {
      labelled('Style')?.click()
    })
    expect(labelled('Bordered')?.className).toContain(optionSelected)
    await act(async () => {
      labelled('Borderless')?.click()
    })
    expect(stay).toHaveBeenCalledWith('style:borderless')
    expect(useSession.getState().pendingMenu).not.toBeNull()
    expect(labelled('Borderless')?.className).toContain(optionSelected)
    expect(labelled('Bordered')?.className).not.toContain(optionSelected)
    await act(async () => {
      useSession.getState().pendingMenu?.settle(null)
    })
    await expect(promise).resolves.toBeNull()
  })

  it('resolves on the first pick that is not a stay row', async () => {
    let promise!: Promise<string | null>
    const stay = vi.fn(() => [
      { label: 'Lock', action: 'lock', stay: true },
      { label: 'Delete', action: 'delete' },
    ])
    await act(async () => {
      promise = useSession.getState().presentMenu(
        [
          { label: 'Lock', action: 'lock', stay: true },
          { label: 'Delete', action: 'delete' },
        ],
        trigger,
        { stay },
      )
    })
    await act(async () => {
      labelled('Lock')?.click()
    })
    expect(stay).toHaveBeenCalledTimes(1)
    expect(useSession.getState().pendingMenu).not.toBeNull()
    await act(async () => {
      labelled('Delete')?.click()
    })
    await expect(promise).resolves.toBe('delete')
  })

  it('draws a compact list at its natural width, without the pane floor and cap', async () => {
    await act(async () => {
      void useSession
        .getState()
        .presentMenu([{ label: '100%', action: '1', checked: true }], trigger, { compact: true })
    })
    const slot = document.querySelector<HTMLElement>(`[data-picker-portal] .${slotContent}`)
    expect(slot?.style.minWidth).toBe('')
    expect(slot?.style.maxWidth).toBe('')
    await act(async () => {
      useSession.getState().pendingMenu?.settle(null)
    })
  })

  it('draws a row’s icon in its leading slot', async () => {
    await act(async () => {
      void useSession
        .getState()
        .presentMenu([{ label: 'Open', action: 'open', icon: 'link' }], trigger)
    })
    expect(labelled('Open')?.querySelector('svg')).not.toBeNull()
    await act(async () => {
      useSession.getState().pendingMenu?.settle(null)
    })
  })
})
