// @vitest-environment jsdom
import { propertyMenuModel } from '@pommora/core/Actions/propertyMenu'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { currentNotification } from '@pommora/core/Interface/Notifications/notifications'
import { ok } from '@pommora/core/Contract/result'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { defaultStatusSeed, type PropertyDefinition } from '@pommora/core/Properties/properties'
import {
  firePointer,
  pressEscape,
  stubPointerCapture,
  stubRect,
} from '@pommora/uix/Testing/pointerHarness'
import { useSession } from '../../Session/store'
import { PropertyFrame } from './PropertyFrame'
import { stubDialer } from '../../vitest.setup'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

stubPointerCapture()

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

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const defs: PropertyDefinition[] = [
  { id: 'prop_status', name: 'Status', type: 'status', status_groups: defaultStatusSeed() },
  { id: 'prop_n', name: 'Count', type: 'number' },
]

let host: HTMLDivElement
let root: Root
let loadSpy: ReturnType<typeof vi.fn>
let assignSpy: ReturnType<typeof vi.fn>
let renameSpy: ReturnType<typeof vi.fn>
let propertyMenuSpy: ReturnType<typeof vi.fn>
let destroySpy: ReturnType<typeof vi.fn>
let unassignSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  loadSpy = vi.fn(async () => {})
  assignSpy = vi.fn(async () => ({ ok: true, value: null }))
  renameSpy = vi.fn(async () => ({ ok: true, value: { from: 'Status', to: 'Stage' } }))
  propertyMenuSpy = vi.fn(async () => null)
  destroySpy = vi.fn(async () => ({
    ok: true,
    value: { trashed: { bundlePath: '.trash/s__property-prop_status.deleted' } },
  }))
  unassignSpy = vi.fn(async () => ({ ok: true, value: null }))
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'schema:add': vi.fn(async () => ({ ok: true, value: { id: 'prop_new' } })),
    'property:rename': renameSpy,
    'schema:reorder': vi.fn(async () => ({ ok: true, value: null })),
    'schema:unassign': unassignSpy,
    'schema:assign': assignSpy,
    'property:delete': destroySpy,
    menu: async (req: unknown) =>
      ok(await (propertyMenuSpy as (r: unknown) => Promise<unknown>)(req)),
  })
  useSession.setState({
    load: loadSpy as never,
    tree: { registry: [] } as never,
    renamingProperty: null,
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
const zone = (): Element => host.querySelector('.drop-line-host')!
const assignedGroup = (): Element => zone().children[0]
const allGroup = (): Element => rowFor('All Properties').closest('button')!.parentElement!

describe('the DRY nested slide (A-7)', () => {
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

const effortDef: PropertyDefinition = { id: 'prop_x', name: 'Effort', type: 'number' }
const titleDef: PropertyDefinition = { id: '_title', name: 'Title', type: 'link' }

describe('the All Properties section (T5)', () => {
  it('lists only unassigned, unreserved registry defs (A-4/E-5), in registry order (B-1)', async () => {
    useSession.setState({ tree: { registry: [effortDef, defs[0], titleDef] } as never })
    await mountPane([defs[0]])
    await act(async () => {
      rowFor('All Properties').click()
    })
    const all = allGroup()
    expect(all.textContent).toContain('Effort')
    expect(all.textContent).not.toContain('Status')
    expect(all.textContent).not.toContain('Title')
  })

  it('+ assigns through the IPC; the confirming push carries the promotion, not a reload', async () => {
    useSession.setState({ tree: { registry: [effortDef] } as never })
    await mountPane([])
    await act(async () => {
      rowFor('All Properties').click()
    })
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="Assign Effort"]')!.click()
    })
    expect(assignSpy).toHaveBeenCalledWith('Col', 'prop_x')
    expect(loadSpy).not.toHaveBeenCalled()
  })

  it('header ⊕ opens the type picker; the footer create-row is gone (A-9)', async () => {
    await mountPane()
    expect(host.textContent).not.toContain('New Property')
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="New Property"]')!.click()
    })
    expect(host.textContent).toContain('Checkbox')
  })

  it('the assigned group runs down to the All heading, so its lane owns the space between', async () => {
    await mountPane()
    expect(assignedGroup().nextElementSibling).toBe(allGroup())
  })

  it('the assigned group renders inside its region wrapper (T6 hangs rects on it)', async () => {
    await mountPane()
    const assigned = assignedGroup()
    expect(assigned.textContent).toContain('Status')
    expect(assigned.textContent).toContain('Count')
  })
})

describe('the two-region drag (T6) — state-level; geometry truth lives in the live pass', () => {
  const deleteSpy = (): ReturnType<typeof vi.fn> => unassignSpy

  const stubGeometry = (): void => {
    stubRect(zone(), { top: 0, bottom: 300 })
    stubRect(assignedGroup(), { top: 10, bottom: 50 })
    stubRect(allGroup(), { top: 70, bottom: 110 })
    stubRect(lineRow('Status'), { top: 10, bottom: 30 })
    stubRect(lineRow('Count'), { top: 30, bottom: 50 })
    stubRect(lineRow('Effort'), { top: 70, bottom: 90 })
  }

  it('assigned → all commits the Remove (schema.delete) after an area-highlight hover', async () => {
    useSession.setState({ tree: { registry: [effortDef] } as never })
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
    expect(allGroup().className).toContain('allHighlight')
    await act(async () => {
      firePointer(window, 'pointerup', { x: 100, y: 80 })
    })
    expect(deleteSpy()).toHaveBeenCalledWith('Col', 'prop_status')
  })

  it('a slot change repaints the All group alone — no row re-renders', async () => {
    useSession.setState({ tree: { registry: [effortDef] } as never })
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
    expect(allGroup().className).toContain('allHighlight')
    expect(titleRenders.n).toBe(before)
    pressEscape()
  })

  it('stepping into the All zone announces the group, not the last row', async () => {
    useSession.setState({ tree: { registry: [effortDef] } as never })
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
    useSession.setState({ tree: { registry: [effortDef] } as never })
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
    expect(assignSpy).toHaveBeenCalledWith('Col', 'prop_x', 0)
  })

  it('all → assigned commits the atomic assign at the slot index', async () => {
    useSession.setState({ tree: { registry: [effortDef] } as never })
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
    expect(assignSpy).toHaveBeenCalledWith('Col', 'prop_x', 0)
  })

  it('Escape aborts an active drag without committing', async () => {
    useSession.setState({ tree: { registry: [effortDef] } as never })
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
    expect(deleteSpy()).not.toHaveBeenCalled()
  })

  it('the all region owns its FIELD — a release in the empty space below the rows still unassigns', async () => {
    useSession.setState({ tree: { registry: [effortDef] } as never })
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
    expect(deleteSpy()).toHaveBeenCalledWith('Col', 'prop_status')
  })

  it("a drag begun on the row's + button lifts the row past 12px and assigns at the slot", async () => {
    useSession.setState({ tree: { registry: [effortDef] } as never })
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
    expect(assignSpy).toHaveBeenCalledWith('Col', 'prop_x', 1)
  })

  it("a sub-12px wobble on the row's + button still clicks", async () => {
    useSession.setState({ tree: { registry: [effortDef] } as never })
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
    expect(assignSpy).toHaveBeenCalledWith('Col', 'prop_x')
  })
})

describe('native menus + the inline-rename channel (T7)', () => {
  const openEditor = async (): Promise<void> => {
    await mountPane()
    await act(async () => {
      rowFor('Status').click()
    })
  }

  it("the editor's ⋮ Remove routes through schema.delete and returns to the list (A-8)", async () => {
    propertyMenuSpy.mockResolvedValueOnce('property:remove')
    await openEditor()
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="Property Menu"]')!.click()
    })
    expect(propertyMenuSpy).toHaveBeenCalledWith({
      items: propertyMenuModel({ kind: 'editor', name: 'Status' }),
      anchor: undefined,
    })
    expect(unassignSpy).toHaveBeenCalledWith('Col', 'prop_status')
  })

  it('⋮ Delete asks first, then runs the global property.delete — and the footer Delete row is GONE (A-8/D-1)', async () => {
    propertyMenuSpy.mockResolvedValueOnce('property:destroy')
    await openEditor()
    expect(host.textContent).not.toContain('Delete Property')
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="Property Menu"]')!.click()
    })
    const pending = useSession.getState().pendingConfirm
    expect(pending?.req.message).toBe('Delete “Status” everywhere?')
    expect(destroySpy).not.toHaveBeenCalled()
    await act(async () => {
      pending!.settle(true)
    })
    expect(destroySpy).toHaveBeenCalledWith('prop_status')
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
    expect(destroySpy).not.toHaveBeenCalled()
    expect(useSession.getState().pendingConfirm).toBeNull()
  })

  it('a row right-click Rename flips the title to the inline input; Enter commits schema.rename (A-10)', async () => {
    propertyMenuSpy.mockResolvedValueOnce('property:rename')
    await mountPane()
    await act(async () => {
      lineRow('Status')
        .querySelector('[class*="item"]')!
        .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(propertyMenuSpy).toHaveBeenCalledWith({
      items: propertyMenuModel({ kind: 'assigned-row', name: 'Status' }),
      anchor: undefined,
    })
    const input = host.querySelector<HTMLInputElement>('.row-title-input')
    expect(input).toBeTruthy()
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(
        input,
        'Stage',
      )
      input!.dispatchEvent(new Event('input', { bubbles: true }))
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      input!.blur()
    })
    expect(renameSpy).toHaveBeenCalledWith('prop_status', 'Stage')
    expect(useSession.getState().valuesEpoch).toMatchObject({
      kind: 'rename',
      oldKey: 'Status',
      newKey: 'Stage',
    })
    expect(host.querySelector('.row-title-input')).toBeNull()
  })

  it('a registry row offers Rename only (registry-row context)', async () => {
    useSession.setState({ tree: { registry: [effortDef] } as never })
    propertyMenuSpy.mockResolvedValueOnce(null)
    await mountPane()
    await act(async () => {
      rowFor('All Properties').click()
    })
    await act(async () => {
      lineRow('Effort')
        .querySelector('[class*="item"]')!
        .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(propertyMenuSpy).toHaveBeenCalledWith({
      items: propertyMenuModel({ kind: 'registry-row', name: 'Effort' }),
      anchor: undefined,
    })
  })
})
