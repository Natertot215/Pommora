// @vitest-environment jsdom
import { propertyMenuModel } from '../../Actions/propertyMenu'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { currentNotification } from '../../Interface/Notifications/notifications'
import { ok } from '../../Contract/result'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { PropertyDefinition } from '../properties'
import type { MutateOutcome, MutateRequest } from '../../Nexus/mutateRequest'
import { defaultStatusSeed } from '../registryProperty'
import {
  firePointer,
  pressEscape,
  stubPointerCapture,
  stubRect,
} from '@pommora/uix/Utilities/pointerHarness'
import { useSession } from '../../Session/store'
import { PropertyFrame } from './PropertyFrame'
import { stubDialer } from '../../vitest.setup'
import { type MenuDoor, setMenuDoor } from '@pommora/uix/Pickers/PickerControl'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

stubPointerCapture()

let picked: string | null = null
const door = vi.fn<MenuDoor>(async () => picked)
setMenuDoor(door)

const titleRenders = vi.hoisted(() => ({ n: 0 }))
vi.mock('@pommora/uix/Fields/RenamableLabel', async (actual) => {
  const real = await actual<typeof import('@pommora/uix/Fields/RenamableLabel')>()
  return {
    RenamableLabel: (props: Parameters<typeof real.RenamableLabel>[0]) => {
      titleRenders.n += 1
      return <real.RenamableLabel {...props} />
    },
  }
})

const defs: PropertyDefinition[] = [
  {
    id: 'prop_status',
    label: 'Status',
    key: 'Status',
    type: 'status',
    status_groups: defaultStatusSeed(),
  },
  { id: 'prop_n', label: 'Count', key: 'Count', type: 'number' },
]

let host: HTMLDivElement
let root: Root
let mutate: ReturnType<typeof vi.fn>
let propertyMenuSpy: ReturnType<typeof vi.fn>
let holdersSpy: ReturnType<typeof vi.fn>
let saveSpy: ReturnType<typeof vi.fn>

const SWEPT = { cascade: { pages: [], hosts: [] } }
const answers: Partial<Record<MutateRequest['op'], MutateOutcome>> = {
  addProperty: { created: { propertyId: 'prop_new' } },
  renameProperty: SWEPT,
  setFormat: SWEPT,
  deleteProperty: { bundled: { bundlePath: '.trash/s__property-prop_status.deleted' } },
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  mutate = vi.fn(async (req: MutateRequest) => answers[req.op] ?? {})
  propertyMenuSpy = vi.fn(async () => null)
  holdersSpy = vi.fn(async () => ok(3))
  saveSpy = vi.fn(async () => ok({ id: 'v1' }))
  picked = null
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'property:holders': holdersSpy,
    'views:save': saveSpy,
    menu: async (req: unknown) =>
      ok(await (propertyMenuSpy as (r: unknown) => Promise<unknown>)(req)),
  })
  useSession.setState({
    mutate: mutate as never,
    tree: { config: { registry: [] } } as never,
  })
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const source = { id: 'col1', kind: 'collection', path: 'Col', title: 'Col', views: [] } as never

const mountPane = async (schema: PropertyDefinition[] = defs): Promise<void> => {
  await act(async () => {
    root.render(
      <PropertyFrame collectionPath="Col" schema={schema} onBack={() => {}} source={source} />,
    )
  })
}

const rowFor = (name: string): HTMLElement => {
  const span = [...host.querySelectorAll<HTMLElement>('span')].find(
    (el) => el.textContent === name && el.children.length === 0,
  )
  if (!span) throw new Error(`no row titled "${name}"`)
  return span
}

const lineRow = (name: string): Element => rowFor(name).closest('[data-line-row]')!
const zone = (): Element => host.querySelector('.line-zone')!
const assignedGroup = (): Element => zone().children[0]
const allGroup = (): Element => rowFor('All Properties').closest('button')!.parentElement!

describe('the DRY nested slide', () => {
  it('list → editor renders BOTH slots (inner FrameSlide keeps them mounted) with the editor active', async () => {
    await mountPane()
    await act(async () => {
      rowFor('Status').click()
    })
    // The slider owns the measure-then-flip: advance a frame so the editor is the live slot and the list is the inert one beneath.
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(undefined)))
    })
    const inertSlots = host.querySelectorAll('[inert]')
    expect(inertSlots.length).toBe(1)
    expect(inertSlots[0].textContent).toContain('Count')
    expect(host.textContent).toContain('Open')
  })

  it('the type picker rides the same slide', async () => {
    await mountPane()
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="New Property"]')!.click()
    })
    expect(host.querySelectorAll('[inert]').length).toBe(1)
    expect(host.textContent).toContain('Checkbox')
  })
})

const effortDef: PropertyDefinition = {
  id: 'prop_x',
  label: 'Effort',
  key: 'Effort',
  type: 'number',
}
const commitTitle = (input: HTMLInputElement, value: string): void => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(
    input,
    value,
  )
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
}

describe('the All Properties section', () => {
  it('lists only unassigned registry defs, in registry order', async () => {
    useSession.setState({ tree: { config: { registry: [effortDef, defs[0]] } } as never })
    await mountPane([defs[0]])
    await act(async () => {
      rowFor('All Properties').click()
    })
    const all = allGroup()
    expect(all.textContent).toContain('Effort')
    expect(all.textContent).not.toContain('Status')
  })

  it('+ assigns the property', async () => {
    useSession.setState({ tree: { config: { registry: [effortDef] } } as never })
    await mountPane([])
    await act(async () => {
      rowFor('All Properties').click()
    })
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="Assign Effort"]')!.click()
    })
    expect(mutate).toHaveBeenCalledWith({
      op: 'assignProperty',
      containerPath: 'Col',
      propertyId: 'prop_x',
    })
  })

  it("the footer's New Property opens the type picker", async () => {
    await mountPane()
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="New Property"]')!.click()
    })
    expect(host.textContent).toContain('Checkbox')
  })

  it('creating a property opens its editor pane', async () => {
    await mountPane([...defs, { id: 'prop_new', label: 'New Text', key: 'New Text', type: 'text' }])
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="New Property"]')!.click()
    })
    await act(async () => {
      ;[...host.querySelectorAll<HTMLElement>('[role="button"]')]
        .find((el) => el.textContent === 'Text')!
        .click()
      await new Promise((r) => requestAnimationFrame(() => r(undefined)))
    })
    const editor = host.querySelector('[aria-label="Property Menu"]')!.closest('[inert]')
    expect(editor).toBeNull()
    expect(host.querySelector('[inert]')!.textContent).toContain('Count')
    expect(host.querySelector('[aria-label="Edit icon"]')!.parentElement!.textContent).toBe(
      'New Text',
    )
  })

  it('the assigned group runs down to the All heading, so its lane owns the space between', async () => {
    await mountPane()
    expect(assignedGroup().nextElementSibling).toBe(allGroup())
  })

  it('the assigned group renders inside its region wrapper', async () => {
    await mountPane()
    const assigned = assignedGroup()
    expect(assigned.textContent).toContain('Status')
    expect(assigned.textContent).toContain('Count')
  })
})

describe('the two-region drag — state-level; geometry truth lives in the live pass', () => {
  const unassigned = { op: 'unassignProperty', containerPath: 'Col', propertyId: 'prop_status' }
  const assigned = (toIndex: number) => ({
    op: 'assignProperty',
    containerPath: 'Col',
    propertyId: 'prop_x',
    toIndex,
  })

  const stubGeometry = (): void => {
    stubRect(zone(), { top: 0, bottom: 300 })
    stubRect(assignedGroup(), { top: 10, bottom: 50 })
    stubRect(allGroup(), { top: 70, bottom: 110 })
    stubRect(lineRow('Status'), { top: 10, bottom: 30 })
    stubRect(lineRow('Count'), { top: 30, bottom: 50 })
    stubRect(lineRow('Effort'), { top: 70, bottom: 90 })
  }

  it('assigned → all commits the Remove after an area-highlight hover', async () => {
    useSession.setState({ tree: { config: { registry: [effortDef] } } as never })
    await mountPane()
    await act(async () => {
      rowFor('All Properties').click()
    })
    stubGeometry()
    const row = lineRow('Status')
    await act(async () => {
      firePointer(row, 'pointerdown', { x: 100, y: 20 })
      firePointer(window, 'pointermove', { x: 100, y: 40 })
      firePointer(window, 'pointermove', { x: 100, y: 80 })
    })
    expect(allGroup().className).toContain('restHighlight')
    await act(async () => {
      firePointer(window, 'pointerup', { x: 100, y: 80 })
    })
    expect(mutate).toHaveBeenCalledWith(unassigned)
  })

  it('a slot change repaints the All group alone — no row re-renders', async () => {
    useSession.setState({ tree: { config: { registry: [effortDef] } } as never })
    await mountPane()
    await act(async () => {
      rowFor('All Properties').click()
    })
    stubGeometry()
    await act(async () => {
      firePointer(lineRow('Status'), 'pointerdown', { x: 100, y: 20 })
      firePointer(window, 'pointermove', { x: 100, y: 40 })
    })
    const before = titleRenders.n
    await act(async () => {
      firePointer(window, 'pointermove', { x: 100, y: 80 })
    })
    expect(allGroup().className).toContain('restHighlight')
    expect(titleRenders.n).toBe(before)
    pressEscape()
  })

  it('stepping into the All zone announces the group, not the last row', async () => {
    useSession.setState({ tree: { config: { registry: [effortDef] } } as never })
    await mountPane()
    await act(async () => {
      rowFor('All Properties').click()
    })
    stubGeometry()
    const row = lineRow('Count') as HTMLElement
    await act(async () => {
      row.focus()
      row.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    })
    await act(async () => {
      row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    })
    expect(document.querySelector('[role="status"][aria-live="assertive"]')?.textContent).toBe(
      'Into All Properties.',
    )
    pressEscape()
  })

  it('the keyboard reaches an empty assigned group and names it', async () => {
    useSession.setState({ tree: { config: { registry: [effortDef] } } as never })
    await mountPane([])
    await act(async () => {
      rowFor('All Properties').click()
    })
    stubRect(zone(), { top: 0, bottom: 300 })
    stubRect(assignedGroup(), { top: 10, bottom: 50 })
    stubRect(allGroup(), { top: 70, bottom: 110 })
    stubRect(lineRow('Effort'), { top: 70, bottom: 90 })
    const row = lineRow('Effort') as HTMLElement
    await act(async () => {
      row.focus()
      row.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    })
    await act(async () => {
      row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    })
    expect(document.querySelector('[role="status"][aria-live="assertive"]')?.textContent).toBe(
      'Into Properties.',
    )
    await act(async () => {
      row.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    })
    expect(mutate).toHaveBeenCalledWith(assigned(0))
  })

  it('all → assigned commits the atomic assign at the slot index', async () => {
    useSession.setState({ tree: { config: { registry: [effortDef] } } as never })
    await mountPane()
    await act(async () => {
      rowFor('All Properties').click()
    })
    stubGeometry()
    const row = lineRow('Effort')
    await act(async () => {
      firePointer(row, 'pointerdown', { x: 100, y: 80 })
      firePointer(window, 'pointermove', { x: 100, y: 60 })
      firePointer(window, 'pointermove', { x: 100, y: 15 })
      firePointer(window, 'pointerup', { x: 100, y: 15 })
    })
    expect(mutate).toHaveBeenCalledWith(assigned(0))
  })

  it('Escape aborts an active drag without committing', async () => {
    useSession.setState({ tree: { config: { registry: [effortDef] } } as never })
    await mountPane()
    await act(async () => {
      rowFor('All Properties').click()
    })
    stubGeometry()
    const row = lineRow('Status')
    await act(async () => {
      firePointer(row, 'pointerdown', { x: 100, y: 20 })
      firePointer(window, 'pointermove', { x: 100, y: 80 })
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      firePointer(window, 'pointerup', { x: 100, y: 80 })
    })
    expect(mutate).not.toHaveBeenCalled()
  })

  it('the all region owns its FIELD — a release in the empty space below the rows still unassigns', async () => {
    useSession.setState({ tree: { config: { registry: [effortDef] } } as never })
    await mountPane()
    await act(async () => {
      rowFor('All Properties').click()
    })
    stubGeometry()
    // The pane box runs far past the all-block's rendered rows; the region must extend with it.
    stubRect(zone(), { top: 0, bottom: 300 })
    const row = lineRow('Status')
    await act(async () => {
      firePointer(row, 'pointerdown', { x: 100, y: 20 })
      firePointer(window, 'pointermove', { x: 100, y: 40 })
      firePointer(window, 'pointermove', { x: 100, y: 250 })
      firePointer(window, 'pointerup', { x: 100, y: 250 })
    })
    expect(mutate).toHaveBeenCalledWith(unassigned)
  })

  it("a drag begun on the row's + button lifts the row past 12px and assigns at the slot", async () => {
    useSession.setState({ tree: { config: { registry: [effortDef] } } as never })
    await mountPane()
    await act(async () => {
      rowFor('All Properties').click()
    })
    stubGeometry()
    const plus = host.querySelector<HTMLButtonElement>('[aria-label="Assign Effort"]')!
    await act(async () => {
      firePointer(plus, 'pointerdown', { x: 100, y: 80 })
      firePointer(window, 'pointermove', { x: 100, y: 20 })
      firePointer(window, 'pointerup', { x: 100, y: 20 })
    })
    expect(mutate).toHaveBeenCalledWith(assigned(1))
  })

  it("a sub-12px wobble on the row's + button still clicks", async () => {
    useSession.setState({ tree: { config: { registry: [effortDef] } } as never })
    await mountPane()
    await act(async () => {
      rowFor('All Properties').click()
    })
    stubGeometry()
    const plus = host.querySelector<HTMLButtonElement>('[aria-label="Assign Effort"]')!
    await act(async () => {
      firePointer(plus, 'pointerdown', { x: 100, y: 80 })
      firePointer(window, 'pointermove', { x: 100, y: 84 })
      firePointer(window, 'pointerup', { x: 100, y: 84 })
      plus.click()
    })
    expect(mutate).toHaveBeenCalledWith({
      op: 'assignProperty',
      containerPath: 'Col',
      propertyId: 'prop_x',
    })
  })
})

describe('native menus + the inline-rename channel', () => {
  const openEditor = async (): Promise<void> => {
    await mountPane()
    await act(async () => {
      rowFor('Status').click()
    })
  }

  it("the editor's ⋮ Remove unassigns and returns to the list", async () => {
    propertyMenuSpy.mockResolvedValueOnce('property:remove')
    await openEditor()
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="Property Menu"]')!.click()
    })
    expect(propertyMenuSpy).toHaveBeenCalledWith({
      items: propertyMenuModel({ kind: 'editor' }),
      anchor: undefined,
    })
    expect(mutate).toHaveBeenCalledWith({
      op: 'unassignProperty',
      containerPath: 'Col',
      propertyId: 'prop_status',
    })
  })

  it('a Remove that missed pages returns to the list', async () => {
    propertyMenuSpy.mockResolvedValueOnce('property:remove')
    mutate.mockResolvedValueOnce({
      cascade: { pages: [], hosts: [], warning: 'Couldn’t update 1 Item.', owed: true },
    })
    await openEditor()
    const menu = (): HTMLButtonElement =>
      host.querySelector<HTMLButtonElement>('[aria-label="Property Menu"]')!
    expect(menu().closest('[inert]')).toBeNull()
    await act(async () => {
      menu().click()
    })
    expect(menu().closest('[inert]')).not.toBeNull()
  })

  it('⋮ Delete asks first, then deletes the property everywhere', async () => {
    propertyMenuSpy.mockResolvedValueOnce('property:destroy')
    await openEditor()
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="Property Menu"]')!.click()
    })
    const pending = useSession.getState().pendingConfirm
    expect(pending?.req.message).toBe('Delete “Status” everywhere?')
    expect(pending?.req.detail).toContain('stripped from 3 Items;')
    expect(mutate).not.toHaveBeenCalled()
    await act(async () => {
      pending!.settle(true)
    })
    expect(mutate).toHaveBeenCalledWith({ op: 'deleteProperty', propertyId: 'prop_status' })
    expect(useSession.getState().pendingConfirm).toBeNull()
    expect(currentNotification()).toMatchObject({
      message: 'Deleted “Status”',
      action: { label: 'Undo' },
    })
  })

  it('⋮ Delete cancelled leaves the property alone', async () => {
    propertyMenuSpy.mockResolvedValueOnce('property:destroy')
    await openEditor()
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="Property Menu"]')!.click()
    })
    await act(async () => {
      useSession.getState().pendingConfirm!.settle(false)
    })
    expect(mutate).not.toHaveBeenCalled()
    expect(useSession.getState().pendingConfirm).toBeNull()
  })

  it('a row right-click Rename flips the title to the inline input; Enter commits the rename', async () => {
    holdersSpy.mockResolvedValueOnce(ok(0))
    propertyMenuSpy.mockResolvedValueOnce('property:rename')
    await mountPane()
    await act(async () => {
      lineRow('Status')
        .querySelector('[class*="item"]')!
        .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(propertyMenuSpy).toHaveBeenCalledWith({
      items: propertyMenuModel({ kind: 'assigned-row' }),
      anchor: undefined,
    })
    const input = host.querySelector<HTMLInputElement>('.row-title-input')
    expect(input).toBeTruthy()
    await act(async () => {
      commitTitle(input!, 'Stage')
      input!.blur()
    })
    expect(mutate).toHaveBeenCalledWith({
      op: 'renameProperty',
      propertyId: 'prop_status',
      label: 'Stage',
    })
    expect(useSession.getState().valuesEpoch).toMatchObject({ kind: 'rename' })
    expect(host.querySelector('.row-title-input')).toBeNull()
  })

  it('a rename keeping its key leaves the values epoch, and one moving it bumps it', async () => {
    const renameTo = async (to: string, reply: MutateOutcome): Promise<void> => {
      mutate.mockResolvedValueOnce(reply)
      propertyMenuSpy.mockResolvedValueOnce('property:rename')
      await act(async () => {
        lineRow('Status')
          .querySelector('[class*="item"]')!
          .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
      })
      const input = host.querySelector<HTMLInputElement>('.row-title-input')!
      await act(async () => {
        commitTitle(input, to)
        input.blur()
      })
    }
    holdersSpy.mockResolvedValue(ok(0))
    await mountPane()
    const before = useSession.getState().valuesEpoch
    await renameTo('status', {})
    expect(useSession.getState().valuesEpoch).toBe(before)
    await renameTo('Phase', SWEPT)
    expect(useSession.getState().valuesEpoch).not.toBe(before)
    expect(useSession.getState().valuesEpoch).toMatchObject({ kind: 'rename' })
  })

  it('a rename that would rewrite pages asks first, and Cancel sends nothing', async () => {
    propertyMenuSpy.mockResolvedValueOnce('property:rename')
    await mountPane()
    await act(async () => {
      lineRow('Status')
        .querySelector('[class*="item"]')!
        .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    const input = host.querySelector<HTMLInputElement>('.row-title-input')!
    await act(async () => {
      commitTitle(input, 'Phase')
      input.blur()
    })
    expect(holdersSpy).toHaveBeenCalledWith('prop_status', { of: 'rename', label: 'Phase' })
    const pending = useSession.getState().pendingConfirm
    expect(pending?.req.message).toBe('This action would rewrite metadata in 3 Items.')
    await act(async () => {
      pending!.settle(false)
    })
    expect(mutate).not.toHaveBeenCalled()
  })

  const openCount = async (): Promise<void> => {
    await mountPane()
    await act(async () => {
      rowFor('Count').click()
    })
  }
  const pick = async (label: string, format: string): Promise<void> => {
    picked = format
    await act(async () => {
      host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click()
    })
  }

  it('a Number editor shows the Label Format row reading Match Title, and no Value Format row', async () => {
    await openCount()
    expect(host.querySelector('button[aria-label="Label Format"]')!.textContent).toBe('Match Title')
    expect(host.querySelector('button[aria-label="Value Format"]')).toBeNull()
  })

  it('a Status editor shows both format rows, the Value Format row reading Match Title', async () => {
    await openEditor()
    expect(host.querySelector('button[aria-label="Label Format"]')).toBeTruthy()
    expect(host.querySelector('button[aria-label="Value Format"]')!.textContent).toBe('Match Title')
  })

  it('a Label Format pick over more than one Item asks with the count, then sets the format and bumps the values epoch', async () => {
    await openCount()
    await pick('Label Format', 'lowercase')
    const pending = useSession.getState().pendingConfirm
    expect(pending?.req.message).toBe('This action would rewrite metadata in 3 Items.')
    expect(mutate).not.toHaveBeenCalled()
    await act(async () => {
      pending!.settle(true)
    })
    expect(mutate).toHaveBeenCalledWith({
      op: 'setFormat',
      propertyId: 'prop_n',
      change: { key_format: 'lowercase' },
    })
    expect(useSession.getState().valuesEpoch).toMatchObject({ kind: 'rename' })
  })

  it('a Label Format pick over one Item sets the format unasked', async () => {
    holdersSpy.mockResolvedValueOnce(ok(1))
    await openCount()
    await pick('Label Format', 'lowercase')
    expect(useSession.getState().pendingConfirm).toBeNull()
    expect(mutate).toHaveBeenCalledWith({
      op: 'setFormat',
      propertyId: 'prop_n',
      change: { key_format: 'lowercase' },
    })
  })

  it('a Value Format pick over no Item sets the format unasked', async () => {
    holdersSpy.mockResolvedValueOnce(ok(0))
    await openEditor()
    await pick('Value Format', 'kebab-case')
    expect(useSession.getState().pendingConfirm).toBeNull()
    expect(mutate).toHaveBeenCalledWith({
      op: 'setFormat',
      propertyId: 'prop_status',
      change: { value_format: 'kebab-case' },
    })
  })

  it('a registry row opens no menu', async () => {
    useSession.setState({ tree: { config: { registry: [effortDef] } } as never })
    await mountPane()
    await act(async () => {
      rowFor('All Properties').click()
    })
    await act(async () => {
      lineRow('Effort')
        .querySelector('[class*="item"]')!
        .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(propertyMenuSpy).not.toHaveBeenCalled()
  })
})

describe('the Date & Time Format editor writes the active view', () => {
  const dateDef: PropertyDefinition = {
    id: 'prop_due',
    label: 'Due',
    key: 'Due',
    type: 'dateTime',
  }
  const pickIn = async (label: string, value: string): Promise<void> => {
    await mountPane([dateDef])
    await act(async () => {
      rowFor('Due').click()
    })
    picked = value
    await act(async () => {
      host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click()
    })
  }

  it('picking Short Date saves column_styles on the source node, not the schema', async () => {
    await pickIn('Date format', 'short')
    expect(saveSpy).toHaveBeenCalledWith('Col', 'collection', expect.anything(), {
      column_styles: { prop_due: { date_format: 'short' } },
    })
  })

  it("a time on the Nexus's own clock stores as shown, so it keeps following that clock", async () => {
    useSession.setState({
      tree: {
        config: { registry: [], personalization: { timeFormat: 'twentyFourHour' } },
      } as never,
    })
    await pickIn('Time format', 'twentyFourHour')
    expect(saveSpy).toHaveBeenCalledWith('Col', 'collection', expect.anything(), {
      column_styles: { prop_due: { time_format: 'shown' } },
    })
  })
})
