// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { fail, ok } from '../../Contract/result'
import type { MutateReply, MutateRequest } from '../../Nexus/mutateRequest'
import { currentNotification } from '../../Interface/Notifications/notifications'
import { dateDefaults } from '../columnStyles'
import type { PropertyType, StatusGroup } from '../properties'
import { OptionEditor } from './OptionEditor'
import { useSession } from '../../Session/store'
import { makeTree } from '../../Testing/testTree'
import { stubDialer } from '../../vitest.setup'
import { firePointer, stubPointerCapture, stubRect } from '@pommora/uix/Utilities/pointerHarness'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

stubPointerCapture()

const status = [
  {
    id: 'todo',
    label: 'To-do',
    color: 'grey',
    options: [{ id: 'opt_Open', key: 'Open', label: 'Open' }],
  },
] as StatusGroup[]

const select = [
  {
    id: 'select',
    label: '',
    color: '',
    options: [
      { id: 'opt_Urgent', key: 'Urgent', label: 'Urgent' },
      { id: 'opt_Later', key: 'Later', label: 'Later' },
    ],
  },
] as StatusGroup[]

let host: HTMLDivElement
let root: Root
const menu = vi.fn(async () => ok<string | null>(null))
const editOption = vi.fn(async (_id: string, _edit: unknown): Promise<MutateReply> => ok({}))
const renameOption = vi.fn(
  async (_id: string, _optionId: string, _label: string): Promise<MutateReply> => ok({}),
)
const deleteOption = vi.fn(async (_id: string, _optionId: string): Promise<MutateReply> => ok({}))
const clearOption = vi.fn(async (_id: string, _optionId: string): Promise<MutateReply> => ok({}))
const finishOwed = vi.fn(async (): Promise<MutateReply> => ok({}))
const holders = vi.fn(async () => ok(2))
const style = { current: { ...dateDefaults('full'), look: 'standard' as const }, set: vi.fn() }

const mutate = (req: MutateRequest): Promise<MutateReply> => {
  switch (req.op) {
    case 'editOption':
      return editOption(req.propertyId, req.edit)
    case 'renameOption':
      return renameOption(req.propertyId, req.optionId, req.label)
    case 'deleteOption':
      return deleteOption(req.propertyId, req.optionId)
    case 'clearOption':
      return clearOption(req.propertyId, req.optionId)
    default:
      return finishOwed()
  }
}

beforeEach(() => {
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    menu,
    mutate,
    'property:holders': holders,
  })
  useSession.setState({ tree: makeTree({ personalization: { iconFavorites: ['anchor'] } }) })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  for (const fn of [
    menu,
    editOption,
    renameOption,
    deleteOption,
    clearOption,
    holders,
    finishOwed,
    style.set,
  ])
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

const commit = async (field: HTMLInputElement | null, next: string): Promise<void> => {
  if (!field) throw new Error('no field')
  await act(async () => {
    field.focus()
    field.value = next
    field.blur()
  })
}
const refuse = fail('invalid-property', 'taken')

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

  it('Clear asks, naming the Items holding the option, then clears it from each', async () => {
    menu.mockResolvedValueOnce(ok('option:clear'))
    render('select', select)
    await rightClick('Urgent')
    expect(clearOption).not.toHaveBeenCalled()
    expect(holders).toHaveBeenCalledWith('p1', { of: 'option', optionId: 'opt_Urgent' })
    expect(useSession.getState().pendingConfirm?.req.message).toBe('Clear “Urgent” from 2 Items?')
    await confirm()
    expect(clearOption).toHaveBeenCalledWith('p1', 'opt_Urgent')
  })

  it('Delete asks, then deletes the option; a missed page offers Try Again', async () => {
    menu.mockResolvedValueOnce(ok('option:delete'))
    deleteOption.mockResolvedValueOnce(
      ok({ cascade: { pages: [], hosts: [], warning: 'w', owed: true } }),
    )
    render('select', select)
    await rightClick('Urgent')
    expect(useSession.getState().pendingConfirm?.req).toMatchObject({
      message: 'Delete “Urgent”?',
      action: 'Delete',
    })
    await confirm()
    expect(deleteOption).toHaveBeenCalledWith('p1', 'opt_Urgent')
    expect(currentNotification()).toMatchObject({ message: 'w', action: { label: 'Try Again' } })
    await act(async () => currentNotification()?.action?.run())
    expect(finishOwed).toHaveBeenCalledOnce()
  })

  it('a delete that owes nothing shows its line without an action', async () => {
    menu.mockResolvedValueOnce(ok('option:delete'))
    deleteOption.mockResolvedValueOnce(ok({ cascade: { pages: [], hosts: [], warning: 'w' } }))
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

  it('the + names a new option at the end of its group', async () => {
    render('select', select)
    plus()
    await commit(host.querySelector('input'), 'Fresh')
    expect(editOption).toHaveBeenCalledWith('p1', {
      op: 'add',
      groupId: 'select',
      id: expect.stringMatching(/^opt_[0-9A-HJKMNP-TV-Z]{26}$/),
      label: 'Fresh',
      atIndex: 2,
    })
  })

  it('a refused add leaves the draft reading its name', async () => {
    editOption.mockResolvedValueOnce(refuse)
    render('select', select)
    plus()
    await commit(host.querySelector('input'), 'Fresh')
    await act(async () => {})
    expect(host.querySelector('input')?.value).toBe('Fresh')
  })

  it('the draft stays open until its option lands, and gives way to it', async () => {
    let reply: (r: MutateReply) => void = () => {}
    editOption.mockImplementationOnce(() => new Promise((r) => (reply = r)))
    render('select', select)
    plus()
    await commit(host.querySelector('input'), 'Fresh')
    expect(host.querySelector('input')?.value).toBe('Fresh')
    const { id } = editOption.mock.calls[0][1] as { id: string }
    render('select', [
      { ...select[0], options: [...select[0].options, { id, key: 'Fresh', label: 'Fresh' }] },
    ])
    expect(host.querySelector('input')).toBeNull()
    await act(async () => reply(ok({})))
  })

  it('a refused draft repeating a held name keeps its name, and the held row stays put', async () => {
    editOption.mockResolvedValueOnce(refuse)
    render('select', select)
    const urgent = span('Urgent')
    plus()
    await commit(host.querySelector('input'), 'Urgent')
    await act(async () => {})
    expect(host.querySelector('input')?.value).toBe('Urgent')
    expect(span('Urgent')).toBe(urgent)
    expect(urgent?.isConnected).toBe(true)
  })

  it('a blank name adds nothing', async () => {
    render('select', select)
    plus()
    await commit(host.querySelector('input'), '')
    expect(editOption).not.toHaveBeenCalled()
    expect(host.querySelector('input')).toBeNull()
  })

  it("a blank popup title leaves the option's name in place", async () => {
    render('select', select)
    openPopup()
    await commit(titleField(), '')
    expect(renameOption).not.toHaveBeenCalled()
    expect(titleField()?.value).toBe('Urgent')
  })
})

describe('the popup through a rename', () => {
  it('a recolor after a rename addresses the same option id, and the popup stays open', async () => {
    holders.mockResolvedValueOnce(ok(0))
    render('select', select)
    openPopup()
    await commit(titleField(), 'Critical')
    expect(renameOption).toHaveBeenCalledWith('p1', 'opt_Urgent', 'Critical')
    render('select', [
      {
        ...select[0],
        options: [{ id: 'opt_Urgent', key: 'Critical', label: 'Critical' }, select[0].options[1]],
      },
    ])
    expect(titleField()?.value).toBe('Critical')
    const color = pickSwatch()
    expect(editOption).toHaveBeenCalledWith('p1', { op: 'recolor', optionId: 'opt_Urgent', color })
    expect(popup()).not.toBeNull()
  })

  it('an option rename that would rewrite pages asks first', async () => {
    render('select', select)
    openPopup()
    await commit(titleField(), 'Critical')
    expect(holders).toHaveBeenCalledWith('p1', {
      of: 'rename',
      label: 'Critical',
      optionId: 'opt_Urgent',
    })
    expect(useSession.getState().pendingConfirm?.req.message).toBe(
      'This action would rewrite metadata in 2 Items.',
    )
    expect(renameOption).not.toHaveBeenCalled()
    await confirm()
    expect(renameOption).toHaveBeenCalledWith('p1', 'opt_Urgent', 'Critical')
  })

  it('a rename the host refuses leaves the field reading the old title', async () => {
    holders.mockResolvedValueOnce(ok(0))
    renameOption.mockResolvedValueOnce(refuse)
    render('select', select)
    openPopup()
    await commit(titleField(), 'later')
    expect(renameOption).toHaveBeenCalledWith('p1', 'opt_Urgent', 'later')
    expect(titleField()?.value).toBe('Urgent')
  })

  it('the popup closes when its option is deleted from under it', async () => {
    render('select', select)
    openPopup()
    expect(titleField()).toBeTruthy()
    render('select', [{ ...select[0], options: [select[0].options[1]] }])
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600))
    })
    expect(titleField()).toBeNull()
    expect(host.querySelector('[data-reveal-held]')).toBeNull()
  })
})

describe('the group heading', () => {
  const dblclick = (label: string): void => {
    act(() => {
      span(label)?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })
  }

  it('relabels a Status group on double-click and commit', async () => {
    render('status', status)
    dblclick('To-do')
    await commit(host.querySelector('input'), 'Backlog')
    expect(editOption).toHaveBeenCalledWith('p1', {
      op: 'relabelGroup',
      groupId: 'todo',
      label: 'Backlog',
    })
  })

  it('a blank relabel keeps the label', async () => {
    render('status', status)
    dblclick('To-do')
    await commit(host.querySelector('input'), '')
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
        { id: 'opt_Open', key: 'Open', label: 'Open' },
        { id: 'opt_Next', key: 'Next', label: 'Next' },
      ],
    },
    { id: 'doing', label: 'Doing', color: 'blue', options: [] },
    {
      id: 'done',
      label: 'Done',
      color: 'green',
      options: [{ id: 'opt_Closed', key: 'Closed', label: 'Closed' }],
    },
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
      optionId: 'opt_Open',
      groupId: 'doing',
      toIndex: 0,
    })
  })

  it('moves an option across groups at the slot', () => {
    drag('Closed', 120, 100, 15)
    expect(editOption).toHaveBeenCalledExactlyOnceWith('p1', {
      op: 'move',
      optionId: 'opt_Closed',
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
      optionId: 'opt_Open',
      groupId: 'doing',
      toIndex: 0,
    })
  })

  it('a release on its own slot writes nothing', () => {
    drag('Open', 20, 32, 20)
    expect(editOption).not.toHaveBeenCalled()
  })
})
