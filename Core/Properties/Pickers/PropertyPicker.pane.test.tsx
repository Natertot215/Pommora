// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { fail, ok } from '../../Contract/result'
import { stubDialer } from '../../vitest.setup'
import type { MutateReply, MutateRequest } from '../../Nexus/mutateRequest'
import { dateDefaults } from '../columnStyles'
import type { PropertyDefinition } from '../properties'
import { defaultStatusSeed } from '../registryProperty'
import { separator } from '@pommora/uix/Menus/menu-row.css'
import { contextColumn, propertyColumn } from '../../Views/Pipeline/columns'
import { PropertyPicker, type PickTarget } from './PropertyPicker'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const selectDef: PropertyDefinition = {
  id: 'prop_sel',
  label: 'Stage',
  key: 'Stage',
  type: 'select',
  select_options: [
    { id: 'opt_Alpha', key: 'Alpha', label: 'Alpha' },
    { id: 'opt_Beta', key: 'Beta', label: 'Beta' },
  ],
}

const optionsTarget = (): PickTarget => ({
  kind: 'options',
  column: propertyColumn(selectDef),
  pick: 'select',
  currents: [null],
})
const dateTimeTarget = (): PickTarget => ({ kind: 'dateTime', current: null })

function Host(props: {
  target?: PickTarget | null
  centerX?: number
  onCommit?: (commits: unknown) => void
  onDismiss?: () => void
}): React.JSX.Element {
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button ref={ref} type="button" data-id="trigger">
        Trigger
      </button>
      <PropertyPicker
        triggerRef={ref}
        target={props.target ?? null}
        centerX={props.centerX}
        onCommit={props.onCommit ?? (() => {})}
        onDismiss={props.onDismiss ?? (() => {})}
      />
    </>
  )
}

let host: HTMLDivElement
let root: Root
const menu = vi.fn(async (_req: unknown) => ok(null))
const editOption = vi.fn(async (_id: string, _edit: unknown): Promise<MutateReply> => ok({}))
beforeEach(() => {
  menu.mockClear()
  editOption.mockClear()
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    menu,
    mutate: (req: MutateRequest) =>
      req.op === 'editOption' ? editOption(req.propertyId, req.edit) : ok({}),
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const render = async (props: Parameters<typeof Host>[0]): Promise<void> => {
  await act(async () => {
    root.render(<Host {...props} />)
  })
  await act(async () => {})
}

const portal = (): HTMLElement | null => document.querySelector('[data-picker-portal]')
const portalText = (): string =>
  [...document.querySelectorAll('[data-picker-portal]')].map((e) => e.textContent ?? '').join('')
// jsdom measures the pane at zero width, so a centred pane's left edge sits exactly on the click.
const isCentred = (): boolean =>
  [...document.querySelectorAll<HTMLElement>('[data-picker-portal]')].some(
    (e) => e.style.left === '200px',
  )
const rowText = (label: string): HTMLElement | undefined =>
  [...document.querySelectorAll<HTMLElement>('[data-picker-portal] *')].find(
    (e) => e.textContent === label && e.children.length === 0,
  )

describe('PropertyPicker panes', () => {
  it('an options target renders its option chips', async () => {
    await render({ target: optionsTarget() })
    expect(portalText()).toContain('Alpha')
    expect(portalText()).toContain('Beta')
  })

  it('an options target follows the column look: a compact Select shows glyphs, not labels', async () => {
    await render({
      target: {
        kind: 'options',
        column: propertyColumn(selectDef),
        pick: 'select',
        currents: [null],
        style: { current: { ...dateDefaults('full'), look: 'compact' }, set: () => {} },
      },
    })
    expect(portal()).toBeTruthy()
    expect(portalText()).not.toContain('Alpha')
  })

  it('a Multi-Select target toggles values, staying open, committing the full array each time', async () => {
    const onCommit = vi.fn()
    const onDismiss = vi.fn()
    await render({
      target: {
        kind: 'options',
        column: propertyColumn({ ...selectDef, type: 'multiSelect' }),
        pick: 'multiSelect',
        currents: [{ kind: 'multiSelect', value: ['opt_Alpha'] }],
      },
      onCommit,
      onDismiss,
    })
    await act(async () => {
      rowText('Beta')?.click()
    })
    expect(onCommit).toHaveBeenCalledWith([
      { index: 0, next: { kind: 'multiSelect', value: ['opt_Alpha', 'opt_Beta'] } },
    ])
    expect(onDismiss).not.toHaveBeenCalled()
    await act(async () => {
      rowText('Alpha')?.click()
    })
    expect(onCommit).toHaveBeenLastCalledWith([
      { index: 0, next: { kind: 'multiSelect', value: [] } },
    ])
  })

  it('a dateTime target renders the calendar, not option chips', async () => {
    await render({ target: dateTimeTarget() })
    expect(portal()).toBeTruthy()
    expect(portalText()).not.toContain('Alpha')
    expect(portalText()).toContain('Sun')
    expect(portalText()).toContain('Mon')
  })

  it('an options target anchored to a click centres its pane', async () => {
    await render({ target: optionsTarget(), centerX: 200 })
    expect(isCentred()).toBe(true)
  })

  it('a calendar ignores the click and opens on its trigger', async () => {
    await render({ target: dateTimeTarget(), centerX: 200 })
    expect(isCentred()).toBe(false)
  })

  it('an options target with no click does not centre', async () => {
    await render({ target: optionsTarget() })
    expect(isCentred()).toBe(false)
  })
})

describe('editing options from the picker', () => {
  const newOption = (): HTMLButtonElement | null =>
    document.querySelector('[data-picker-portal] button[aria-label="New Option"]')
  const draft = (): HTMLInputElement | null => document.querySelector('[data-picker-portal] input')
  const beginDraft = async (): Promise<HTMLInputElement> => {
    await act(async () => {
      newOption()?.click()
    })
    const input = draft()
    if (!input) throw new Error('no draft row')
    return input
  }
  const key = (input: HTMLInputElement, name: string): void =>
    act(() => {
      input.focus()
      input.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }))
    })

  it('a Select target offers New Option beneath its rows; the draft is the last row and Enter adds the option unassigned', async () => {
    const onCommit = vi.fn()
    await render({ target: optionsTarget(), onCommit })
    expect(newOption()).toBeTruthy()
    const input = await beginDraft()
    const beta = rowText('Beta')
    expect(
      beta && beta.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    input.value = 'Fresh'
    key(input, 'Enter')
    expect(editOption).toHaveBeenCalledWith('prop_sel', {
      op: 'add',
      groupId: 'select',
      id: expect.stringMatching(/^opt_[0-9A-HJKMNP-TV-Z]{26}$/),
      label: 'Fresh',
    })
    expect(onCommit).not.toHaveBeenCalled()
    await act(async () => {})
    expect(draft()).toBeNull()
  })

  it('a refused add keeps its name in the draft', async () => {
    editOption.mockResolvedValueOnce(fail('invalid-property', 'taken'))
    await render({ target: optionsTarget() })
    const input = await beginDraft()
    input.value = 'Fresh'
    key(input, 'Enter')
    await act(async () => {})
    expect(draft()?.value).toBe('Fresh')
  })

  it('New Option waits while a draft is open', async () => {
    await render({ target: optionsTarget() })
    await beginDraft()
    expect(newOption()?.disabled).toBe(true)
  })

  it('a blank Enter and an Escape on the draft add nothing', async () => {
    await render({ target: optionsTarget() })
    key(await beginDraft(), 'Enter')
    expect(draft()).toBeNull()
    const second = await beginDraft()
    second.value = 'Nope'
    key(second, 'Escape')
    expect(draft()).toBeNull()
    expect(editOption).not.toHaveBeenCalled()
  })

  it('a Status target reorders and edits in place without New Option, its non-empty groups apart behind dividers; a Context target stays pick-only', async () => {
    const [open, active, done] = defaultStatusSeed()
    const statusDef: PropertyDefinition = {
      id: 'prop_st',
      label: 'Status',
      key: 'Status',
      type: 'status',
      status_groups: [open, { ...active, options: [] }, done],
    }
    await render({
      target: {
        kind: 'options',
        column: propertyColumn(statusDef),
        pick: 'select',
        currents: [null],
      },
    })
    expect(newOption()).toBeNull()
    const order = [
      ...document.querySelectorAll(
        `[data-picker-portal] [data-line-row], [data-picker-portal] .${separator}`,
      ),
    ].map((e) => (e.matches(`.${separator}`) ? '—' : e.textContent))
    expect(order).toEqual(['Open', '—', 'Done'])
    await render({
      target: {
        kind: 'options',
        column: contextColumn('ctx_a'),
        pick: 'context',
        currents: [null],
        contextOptions: [{ id: 'Home', label: 'Home' }],
      },
    })
    expect(newOption()).toBeNull()
    expect(document.querySelector('[data-picker-portal] [data-line-row]')).toBeNull()
  })

  it('Enter on a focused row picks it', async () => {
    const onCommit = vi.fn()
    await render({ target: optionsTarget(), onCommit })
    const row = document.querySelector<HTMLElement>('[data-picker-portal] [data-line-row]')
    await act(async () => {
      row?.focus()
      row?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(onCommit).toHaveBeenCalledWith([
      { index: 0, next: { kind: 'select', value: 'opt_Alpha' } },
    ])
  })

  it("a row's right-click offers the option menu, without Style where no view is in hand and without Clear or Delete", async () => {
    await render({ target: optionsTarget() })
    await act(async () => {
      rowText('Alpha')?.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      )
    })
    const req = menu.mock.calls[0]?.[0] as { items: { label: string }[] } | undefined
    expect(req?.items.map((i) => i.label)).toEqual(['Edit Option'])
  })
})
