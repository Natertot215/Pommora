// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ok } from '@pommora/core/Contract/result'
import type { PropertyType, StatusGroup } from '@pommora/core/Properties/properties'
import { OptionEditor } from './OptionEditor'
import { useSession } from '../../Session/store'
import { stubDialer } from '../../vitest.setup'
import { firePointer, stubPointerCapture, stubRect } from '@pommora/uix/Testing/pointerHarness'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

stubPointerCapture()

const status = [
  {
    id: 'todo',
    label: 'To-do',
    color: 'grey',
    options: [{ value: 'Open', group_id: 'todo' }],
  },
] as StatusGroup[]

const select = [
  {
    id: 'select',
    label: '',
    color: '',
    options: [
      { value: 'Urgent', group_id: 'select' },
      { value: 'Later', group_id: 'select' },
    ],
  },
] as StatusGroup[]

let host: HTMLDivElement
let root: Root
const onEdit = vi.fn()
const onRenameOption = vi.fn()

beforeEach(() => {
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    menu: async () => ok('option:edit-icon'),
  })
  useSession.setState({ personalization: { iconFavorites: ['anchor'] } })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  onEdit.mockClear()
  onRenameOption.mockClear()
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const render = (type: PropertyType, groups: StatusGroup[]): void =>
  act(() =>
    root.render(
      <OptionEditor
        type={type}
        groups={groups}
        look="standard"
        onEdit={onEdit}
        onRenameOption={onRenameOption}
        onRemoveOption={vi.fn()}
        onClearOption={vi.fn()}
      />,
    ),
  )

const span = (label: string): HTMLSpanElement | undefined =>
  Array.from(host.querySelectorAll('span')).find((el) => el.textContent === label)

const popup = (): Element | null => document.querySelector('[data-picker-portal]')

const openPopup = (): void => {
  act(() => host.querySelector<HTMLButtonElement>('button[aria-label="Edit Option"]')?.click())
}

const titleField = (): HTMLInputElement | null =>
  document.querySelector('[data-picker-portal] input[aria-label="Option Title"]')

const commit = (field: HTMLInputElement | null, next: string): void => {
  if (!field) throw new Error('no field')
  act(() => {
    field.focus()
    field.value = next
    field.blur()
  })
}

const portalButton = (label: string): HTMLButtonElement | null =>
  document.querySelector(`[data-picker-portal] button[aria-label="${label}"]`)

const pickSwatch = (): string => {
  const swatch = document.querySelector<HTMLButtonElement>(
    '[data-picker-portal] button[aria-label="red-4"]',
  )
  if (!swatch) throw new Error('no swatch')
  act(() => swatch.click())
  return 'red-4'
}

describe('a Status option menu', () => {
  it('Edit Icon opens the icon picker and sends the picked icon as an intent', async () => {
    render('status', status)
    const chip = span('Open')
    await act(async () => {
      chip?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    })
    const favorite = document.querySelector<HTMLButtonElement>(
      '[data-picker-portal] button[title="anchor"]',
    )
    act(() => favorite?.click())
    expect(onEdit).toHaveBeenCalledWith({ op: 'icon', value: 'Open', icon: 'anchor' })
  })
})

describe('the popup through a rename (F-134)', () => {
  it('a recolor after a rename addresses the new title, and the popup stays open', () => {
    render('select', select)
    openPopup()
    commit(titleField(), 'Critical')
    expect(onRenameOption).toHaveBeenCalledWith('Urgent', 'Critical')
    const color = pickSwatch()
    expect(onEdit).toHaveBeenCalledWith({ op: 'recolor', value: 'Critical', color })
    act(() => portalButton('Appearance')?.click())
    expect(onEdit).toHaveBeenCalledWith({
      op: 'appearance',
      value: 'Critical',
      appearance: 'clear',
    })
    act(() => portalButton('Edit Icon')?.click())
    act(() =>
      document
        .querySelector<HTMLButtonElement>('[data-picker-portal] button[title="anchor"]')
        ?.click(),
    )
    expect(onEdit).toHaveBeenCalledWith({ op: 'icon', value: 'Critical', icon: 'anchor' })
    expect(popup()).not.toBeNull()
    commit(titleField(), 'Critical')
    expect(onRenameOption).toHaveBeenCalledTimes(1)
  })

  it("a rename back to the row's own title re-keys the popup to it", () => {
    render('select', select)
    openPopup()
    commit(titleField(), 'Critical')
    commit(titleField(), 'Urgent')
    expect(onRenameOption.mock.calls).toEqual([
      ['Urgent', 'Critical'],
      ['Critical', 'Urgent'],
    ])
    const color = pickSwatch()
    expect(onEdit).toHaveBeenCalledWith({ op: 'recolor', value: 'Urgent', color })
  })

  it('the row and its popup survive the refresh that carries the rename', () => {
    render('select', select)
    openPopup()
    commit(titleField(), 'Critical')
    const field = titleField()
    const row = host.querySelector('[data-reveal-host] [data-reveal-host]')
    const refreshed = [
      {
        ...select[0],
        options: [{ value: 'Critical', group_id: 'select' }, select[0].options[1]],
      },
    ]
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    render('select', refreshed)
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
    expect(titleField()).toBe(field)
    expect(row?.isConnected).toBe(true)
    expect(row?.textContent).toContain('Critical')
    const color = pickSwatch()
    expect(onEdit).toHaveBeenCalledWith({ op: 'recolor', value: 'Critical', color })
  })

  it('a rename onto a title another option holds leaves the popup on the old option', () => {
    render('select', select)
    openPopup()
    commit(titleField(), 'Later')
    expect(onRenameOption).toHaveBeenCalledWith('Urgent', 'Later')
    expect(
      document.querySelectorAll('[data-picker-portal] input[aria-label="Option Title"]'),
    ).toHaveLength(1)
    const color = pickSwatch()
    expect(onEdit).toHaveBeenCalledWith({ op: 'recolor', value: 'Urgent', color })
  })
})

describe('the group heading', () => {
  const dblclick = (label: string): void => {
    act(() => {
      span(label)?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })
  }

  it('relabels a Status group on double-click and commit', () => {
    render('status', status)
    dblclick('To-do')
    commit(host.querySelector('input'), 'Backlog')
    expect(onEdit).toHaveBeenCalledWith({ op: 'relabelGroup', groupId: 'todo', label: 'Backlog' })
  })

  it('does nothing on a Select', () => {
    render('select', select)
    dblclick('Options')
    expect(host.querySelector('input')).toBeNull()
    expect(onEdit).not.toHaveBeenCalled()
  })
})

describe('the option drag', () => {
  const three = [
    {
      id: 'todo',
      label: 'To-do',
      color: 'grey',
      options: [
        { value: 'Open', group_id: 'todo' },
        { value: 'Next', group_id: 'todo' },
      ],
    },
    { id: 'doing', label: 'Doing', color: 'blue', options: [] },
    { id: 'done', label: 'Done', color: 'green', options: [{ value: 'Closed', group_id: 'done' }] },
  ] as StatusGroup[]
  const row = (value: string): Element => span(value)!.closest('[data-line-row]')!
  const lay = (): void => {
    stubRect(host.querySelector('.drop-line-host')!, { top: 0, bottom: 200 })
    const [todo, doing, done] = host.querySelectorAll('[class*="optionList"]')
    stubRect(todo, { top: 10, bottom: 50 })
    stubRect(doing, { top: 70, bottom: 90 })
    stubRect(done, { top: 110, bottom: 130 })
    stubRect(row('Open'), { top: 10, bottom: 30 })
    stubRect(row('Next'), { top: 30, bottom: 50 })
    stubRect(row('Closed'), { top: 110, bottom: 130 })
  }
  const drag = (value: string, from: number, ...to: number[]): void => {
    render('status', three)
    lay()
    act(() => {
      firePointer(row(value), 'pointerdown', { x: 50, y: from })
      for (const y of to) firePointer(window, 'pointermove', { x: 50, y })
      firePointer(window, 'pointerup', { x: 50, y: to.at(-1) })
    })
  }

  it('moves an option into an empty group at its top', () => {
    drag('Open', 20, 40, 80)
    expect(onEdit).toHaveBeenCalledExactlyOnceWith({
      op: 'move',
      value: 'Open',
      groupId: 'doing',
      toIndex: 0,
    })
  })

  it('moves an option across groups at the slot', () => {
    drag('Closed', 120, 100, 15)
    expect(onEdit).toHaveBeenCalledExactlyOnceWith({
      op: 'move',
      value: 'Closed',
      groupId: 'todo',
      toIndex: 0,
    })
  })

  it('the keyboard steps into an empty group by its label', () => {
    render('status', three)
    lay()
    const open = row('Open') as HTMLElement
    const key = (k: string): void =>
      act(() => {
        open.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
      })
    act(() => open.focus())
    key(' ')
    key('ArrowDown')
    key('ArrowDown')
    expect(document.querySelector('[role="status"][aria-live="assertive"]')?.textContent).toBe(
      'Into Doing.',
    )
    key(' ')
    expect(onEdit).toHaveBeenCalledExactlyOnceWith({
      op: 'move',
      value: 'Open',
      groupId: 'doing',
      toIndex: 0,
    })
  })

  it('a release on its own slot writes nothing', () => {
    drag('Open', 20, 32, 20)
    expect(onEdit).not.toHaveBeenCalled()
  })
})
