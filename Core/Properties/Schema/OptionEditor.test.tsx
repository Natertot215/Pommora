// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ok } from '../../Contract/result'
import { currentNotification } from '../../Interface/Notifications/notifications'
import { dateDefaults } from '../columnStyles'
import type { PropertyType, StatusGroup } from '../properties'
import { OptionEditor } from './OptionEditor'
import { useSession } from '../../Session/store'
import { makeTree } from '../../Testing/testTree'
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
const menu = vi.fn(async () => ok<string | null>(null))
const editOption = vi.fn(async () => ok(null))
const renameOption = vi.fn(async () => ok({ cascade: {} }))
const removeOption = vi.fn(async () => ok({ cascade: {} }))
const clearOption = vi.fn(async () => ok(null))
const style = { current: { ...dateDefaults('full'), look: 'standard' as const }, set: vi.fn() }

beforeEach(() => {
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    menu,
    'property:editOption': editOption,
    'property:renameOption': renameOption,
    'property:removeOption': removeOption,
    'property:clearOption': clearOption,
  })
  useSession.setState({ tree: makeTree({ personalization: { iconFavorites: ['anchor'] } }) })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  for (const fn of [menu, editOption, renameOption, removeOption, clearOption, style.set])
    fn.mockClear()
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const render = (type: PropertyType, groups: StatusGroup[]): void =>
  act(() => root.render(<OptionEditor propertyId="p1" type={type} groups={groups} style={style} />))

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

const rightClick = async (label: string): Promise<void> => {
  await act(async () => {
    span(label)?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
  })
}

const confirm = async (): Promise<void> => {
  await act(async () => {
    useSession.getState().pendingConfirm!.settle(true)
  })
}

describe('the option menu', () => {
  it('Edit Option opens the popup on the row', async () => {
    menu.mockResolvedValueOnce(ok('option:edit'))
    render('status', status)
    await rightClick('Open')
    expect(titleField()?.value).toBe('Open')
  })

  it('a Style pick sets the look through the control it was handed', async () => {
    menu.mockResolvedValueOnce(ok('style:look:compact'))
    render('select', select)
    await rightClick('Urgent')
    expect(style.set).toHaveBeenCalledWith('look', 'compact')
  })

  it('Clear asks, then clears the option from every page', async () => {
    menu.mockResolvedValueOnce(ok('option:clear'))
    render('select', select)
    await rightClick('Urgent')
    expect(clearOption).not.toHaveBeenCalled()
    await confirm()
    expect(clearOption).toHaveBeenCalledWith('p1', 'Urgent')
  })

  it('Remove asks, then removes the option; a kept record offers Try Again', async () => {
    menu.mockResolvedValueOnce(ok('option:remove'))
    removeOption.mockResolvedValueOnce(
      ok({ cascade: { warning: 'w' }, owed: { op: 'option-remove', id: 'p1', value: 'Urgent' } }),
    )
    render('select', select)
    await rightClick('Urgent')
    await confirm()
    expect(removeOption).toHaveBeenCalledWith('p1', 'Urgent')
    expect(currentNotification()).toMatchObject({ message: 'w', action: { label: 'Try Again' } })
  })

  it('a remove with no record shows its line without an action', async () => {
    menu.mockResolvedValueOnce(ok('option:remove'))
    removeOption.mockResolvedValueOnce(ok({ cascade: { warning: 'w' } }))
    render('select', select)
    await rightClick('Urgent')
    await confirm()
    expect(currentNotification()).toMatchObject({ message: 'w', tone: 'error' })
    expect(currentNotification()?.action).toBeUndefined()
  })
})

describe('creating an option', () => {
  const plus = (): void =>
    act(() => host.querySelector<HTMLButtonElement>('[aria-label="Add Option"]')?.click())

  it('the + names a new option at the end of its group', () => {
    render('select', select)
    plus()
    commit(host.querySelector('input'), 'Fresh')
    expect(editOption).toHaveBeenCalledWith('p1', {
      op: 'add',
      groupId: 'select',
      title: 'Fresh',
      atIndex: 2,
    })
  })

  it('a blank name adds nothing', () => {
    render('select', select)
    plus()
    commit(host.querySelector('input'), '')
    expect(editOption).not.toHaveBeenCalled()
    expect(host.querySelector('input')).toBeNull()
  })

  it("a blank popup title leaves the option's name in place", () => {
    render('select', select)
    openPopup()
    commit(titleField(), '')
    expect(renameOption).not.toHaveBeenCalled()
    expect(titleField()?.value).toBe('Urgent')
  })
})

describe('the popup through a rename (F-134)', () => {
  it('a recolor after a rename addresses the new title, and the popup stays open', () => {
    render('select', select)
    openPopup()
    commit(titleField(), 'Critical')
    expect(renameOption).toHaveBeenCalledWith('p1', 'Urgent', 'Critical')
    const color = pickSwatch()
    expect(editOption).toHaveBeenCalledWith('p1', { op: 'recolor', value: 'Critical', color })
    act(() => portalButton('Appearance')?.click())
    expect(editOption).toHaveBeenCalledWith('p1', {
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
    expect(editOption).toHaveBeenCalledWith('p1', { op: 'icon', value: 'Critical', icon: 'anchor' })
    expect(popup()).not.toBeNull()
    commit(titleField(), 'Critical')
    expect(renameOption).toHaveBeenCalledTimes(1)
  })

  it("a rename back to the row's own title re-keys the popup to it", () => {
    render('select', select)
    openPopup()
    commit(titleField(), 'Critical')
    commit(titleField(), 'Urgent')
    expect(renameOption.mock.calls).toEqual([
      ['p1', 'Urgent', 'Critical'],
      ['p1', 'Critical', 'Urgent'],
    ])
    const color = pickSwatch()
    expect(editOption).toHaveBeenCalledWith('p1', { op: 'recolor', value: 'Urgent', color })
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
    expect(editOption).toHaveBeenCalledWith('p1', { op: 'recolor', value: 'Critical', color })
  })

  it('a second rename after the refresh keeps the popup on its row', () => {
    render('select', select)
    openPopup()
    commit(titleField(), 'Critical')
    render('select', [
      { ...select[0], options: [{ value: 'Critical', group_id: 'select' }, select[0].options[1]] },
    ])
    const field = titleField()
    commit(field, 'Severe')
    expect(renameOption).toHaveBeenLastCalledWith('p1', 'Critical', 'Severe')
    expect(titleField()).toBe(field)
    render('select', [
      { ...select[0], options: [{ value: 'Severe', group_id: 'select' }, select[0].options[1]] },
    ])
    expect(titleField()).toBe(field)
    const color = pickSwatch()
    expect(editOption).toHaveBeenCalledWith('p1', { op: 'recolor', value: 'Severe', color })
  })

  it('a rename differing only in case from another title leaves the popup addressed to the old one', () => {
    render('select', select)
    openPopup()
    commit(titleField(), 'later')
    expect(renameOption).toHaveBeenCalledWith('p1', 'Urgent', 'later')
    const color = pickSwatch()
    expect(editOption).toHaveBeenCalledWith('p1', { op: 'recolor', value: 'Urgent', color })
  })

  it('a later option taking an intermediate name keys apart from the renamed row', () => {
    render('select', select)
    openPopup()
    commit(titleField(), 'High')
    render('select', [
      { ...select[0], options: [{ value: 'High', group_id: 'select' }, select[0].options[1]] },
    ])
    commit(titleField(), 'Critical')
    const refreshed = [{ value: 'Critical', group_id: 'select' }, select[0].options[1]]
    render('select', [{ ...select[0], options: refreshed }])
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    render('select', [
      { ...select[0], options: [...refreshed, { value: 'High', group_id: 'select' }] },
    ])
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
    expect(span('High')).toBeTruthy()
  })

  it('the popup closes when its option is removed from under it', async () => {
    render('select', select)
    openPopup()
    expect(titleField()).toBeTruthy()
    render('select', [{ ...select[0], options: [select[0].options[1]] }])
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600))
    })
    expect(titleField()).toBeNull()
    expect(host.querySelector('[data-reveal-held]')).toBeNull()
    act(() => host.querySelector<HTMLButtonElement>('button[aria-label="Edit Option"]')?.click())
    expect(titleField()?.value).toBe('Later')
  })

  it('a rename onto a title another option holds leaves the popup on the old option', () => {
    render('select', select)
    openPopup()
    commit(titleField(), 'Later')
    expect(renameOption).toHaveBeenCalledWith('p1', 'Urgent', 'Later')
    expect(
      document.querySelectorAll('[data-picker-portal] input[aria-label="Option Title"]'),
    ).toHaveLength(1)
    const color = pickSwatch()
    expect(editOption).toHaveBeenCalledWith('p1', { op: 'recolor', value: 'Urgent', color })
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
    expect(editOption).toHaveBeenCalledWith('p1', {
      op: 'relabelGroup',
      groupId: 'todo',
      label: 'Backlog',
    })
  })

  it('a blank relabel keeps the label', () => {
    render('status', status)
    dblclick('To-do')
    commit(host.querySelector('input'), '')
    expect(editOption).not.toHaveBeenCalled()
    expect(span('To-do')).toBeTruthy()
  })

  it('does nothing on a Select', () => {
    render('select', select)
    dblclick('Options')
    expect(host.querySelector('input')).toBeNull()
    expect(editOption).not.toHaveBeenCalled()
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
    stubRect(host.querySelector('.line-zone')!, { top: 0, bottom: 200 })
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
    expect(editOption).toHaveBeenCalledExactlyOnceWith('p1', {
      op: 'move',
      value: 'Open',
      groupId: 'doing',
      toIndex: 0,
    })
  })

  it('moves an option across groups at the slot', () => {
    drag('Closed', 120, 100, 15)
    expect(editOption).toHaveBeenCalledExactlyOnceWith('p1', {
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
    expect(editOption).toHaveBeenCalledExactlyOnceWith('p1', {
      op: 'move',
      value: 'Open',
      groupId: 'doing',
      toIndex: 0,
    })
  })

  it('a release on its own slot writes nothing', () => {
    drag('Open', 20, 32, 20)
    expect(editOption).not.toHaveBeenCalled()
  })
})
