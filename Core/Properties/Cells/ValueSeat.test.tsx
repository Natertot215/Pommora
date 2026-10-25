// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { EditorView } from '@codemirror/view'
import { createPortal } from 'react-dom'
import type { Root } from 'react-dom/client'
import { ok } from '../../Contract/result'
import { stubDialer } from '../../vitest.setup'
import { mountEachTest, settle } from '../../Testing/viewHarness'
import { makeTree } from '../../Testing/testTree'
import { useSession } from '../../Session/store'
import { FILEDATA, type PropertyDefinition } from '../properties'
import { dateDefaults } from '../columnStyles'
import type { ResolvedColumn, ViewRow } from '../../Views/viewRow'
import { propertyColumn } from '../../Views/Pipeline/columns'
import { MenuSeat, type SeatHost, useValueSeat, ValueSeat, type ValueSeatApi } from './ValueSeat'

let root: Root
mountEachTest((_, r) => {
  root = r
})

const def = (id: string, type: PropertyDefinition['type'], extra = {}): PropertyDefinition => ({
  id,
  label: id,
  key: id,
  type,
  ...extra,
})
const SELECT = def('prop_s', 'select', {
  select_options: [{ id: 'opt_alpha', key: 'alpha', label: 'Alpha' }],
})
const DATE = def('prop_d', 'dateTime')
const TEXT = def('prop_t', 'text')
const CHECK = def('prop_c', 'checkbox')
const NUMBER = def('prop_n', 'number', { number_family: 'percent' })
const columnOf = propertyColumn
const STYLE = dateDefaults('full')
const row: ViewRow = {
  id: 'page_1',
  title: 'One',
  path: 'Col/One.md',
  frontmatter: { prop_t: 'words' } as never,
  createdAt: null,
  modifiedAt: null,
}

let commit: ReturnType<typeof vi.fn<SeatHost['commit']>>
let menu: ReturnType<typeof vi.fn>
let seat: ValueSeatApi
const answer = (action: string | null): void => {
  menu = vi.fn(async () => ok(action))
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ menu })
}
beforeEach(() => {
  commit = vi.fn()
  answer(null)
  useSession.setState({ tree: makeTree() })
})

function Surface({
  column,
  over,
  pane,
}: {
  column: ResolvedColumn
  over?: Partial<SeatHost>
  pane?: React.ReactNode
}): React.JSX.Element {
  seat = useValueSeat({
    rowOf: () => row,
    commit,
    anchor: (el) => el,
    holder: () => row,
    columnOf: (id) => (id === column.id ? column : undefined),
    style: () => STYLE,
    ...over,
  })
  return (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a test seat */}
      <span
        data-seat=""
        onClick={(e) => seat.click(row, column, e)}
        onContextMenu={(e) => void seat.menu(row, column, e)}
      >
        {seat.editor(row, column) ?? 'value'}
        {pane}
      </span>
      <ValueSeat seat={seat} />
    </>
  )
}
const mount = (column: ResolvedColumn, over?: Partial<SeatHost>, pane?: React.ReactNode): void =>
  act(() => root.render(<Surface column={column} over={over} pane={pane} />))
const el = (): HTMLElement => document.querySelector<HTMLElement>('[data-seat]')!
const portalText = (): string =>
  [...document.querySelectorAll('[data-picker-portal]')].map((e) => e.textContent).join('')
const rightClick = async (): Promise<void> => {
  await act(async () => {
    el().dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
  })
}
const menuActions = (): (string | undefined)[] =>
  (menu.mock.calls[0][0].items as { action?: string }[]).map((i) => i.action)

describe('a value seat’s click', () => {
  it.each([
    ['an option kind opens its picker', SELECT, 'picker'],
    ['a Date opens the calendar in the picker', DATE, 'picker'],
    ['a Text value opens its editor in place', TEXT, 'editor'],
  ])('%s', (_, d, mode) => {
    mount(columnOf(d))
    act(() => el().click())
    expect(seat.open?.mode).toBe(mode)
    expect(commit).not.toHaveBeenCalled()
  })

  it('a Select’s picker lists its options', () => {
    mount(columnOf(SELECT))
    act(() => el().click())
    expect(portalText()).toContain('Alpha')
  })

  it('an option created while the picker is open joins its list', () => {
    mount(columnOf(SELECT))
    act(() => el().click())
    const beta = { id: 'opt_beta', key: 'beta', label: 'Beta' }
    mount(columnOf({ ...SELECT, select_options: [...(SELECT.select_options ?? []), beta] }))
    expect(portalText()).toContain('Beta')
  })

  it('a Checkbox commits checked, opening nothing', () => {
    mount(columnOf(CHECK))
    act(() => el().click())
    expect(commit).toHaveBeenCalledWith(row, columnOf(CHECK), { kind: 'checkbox', value: true })
    expect(seat.open).toBeNull()
  })

  it('a Number drawn as a bar opens its popover', () => {
    mount(columnOf(NUMBER), { style: () => ({ ...STYLE, look: 'bar' }) })
    act(() => el().click())
    expect(seat.open?.mode).toBe('popover')
  })

  it('a stamp opens nothing', () => {
    mount({ id: FILEDATA.createdAt.id, kind: 'stamp', type: 'createdTime' })
    act(() => el().click())
    expect(seat.open).toBeNull()
  })

  it('a centered host carries the click’s x to the picker, and a plain one carries none', () => {
    mount(columnOf(SELECT), { centered: true })
    act(() => el().dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 40 })))
    expect(seat.open?.x).toBe(40)
    act(() => seat.close())
    mount(columnOf(SELECT))
    act(() => el().dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 40 })))
    expect(seat.open?.x).toBeUndefined()
  })
})

describe('a value seat’s right-click', () => {
  it('pops the column’s cell menu and runs its Edit', async () => {
    answer('cell:edit')
    mount(columnOf(TEXT))
    await rightClick()
    expect(menuActions()).toContain('cell:edit')
    expect(seat.open?.mode).toBe('editor')
  })

  it('runs its Clear as a commit, or as the host’s own clear', async () => {
    answer('cell:clear')
    mount(columnOf(TEXT))
    await rightClick()
    expect(commit).toHaveBeenCalledWith(row, columnOf(TEXT), null)
    const clear = vi.fn()
    commit.mockClear()
    mount(columnOf(TEXT), { clear })
    await rightClick()
    expect(clear).toHaveBeenCalledWith(row, columnOf(TEXT))
    expect(commit).not.toHaveBeenCalled()
  })

  it('offers Remove only to a host that hides, and runs it there', async () => {
    mount(columnOf(TEXT))
    await rightClick()
    expect(menuActions()).not.toContain('cell:hide')
    const run = vi.fn()
    answer('cell:hide')
    mount(columnOf(TEXT), { hide: { from: 'view', run } })
    await rightClick()
    expect(run).toHaveBeenCalledWith(row, columnOf(TEXT))
  })

  it('offers a host with no column look the bare menu, never Style', async () => {
    mount(columnOf(SELECT), { style: () => null, hide: { from: 'row', run: vi.fn() } })
    await rightClick()
    expect(menuActions()).toEqual(['cell:hide'])
  })

  it('runs a Style answer through the host’s style write', async () => {
    const setStyle = vi.fn()
    answer('style:look:compact')
    mount(columnOf(SELECT), { setStyle })
    await rightClick()
    expect(setStyle).toHaveBeenCalledWith(columnOf(SELECT), 'look', 'compact')
  })

  it('holds the host’s ghost for as long as the menu is open', async () => {
    let held = 0
    const hold = vi.fn(async <T,>(show: () => Promise<T>): Promise<T> => {
      held += 1
      const answered = await show()
      held -= 1
      return answered
    })
    menu = vi.fn(async () => {
      expect(held).toBe(1)
      return ok(null)
    })
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ menu })
    mount(columnOf(TEXT), { hold: hold as SeatHost['hold'] })
    await rightClick()
    expect(hold).toHaveBeenCalledTimes(1)
    expect(held).toBe(0)
  })
})

describe('a value seat’s panes', () => {
  it('closes once the element it opened from leaves the page', () => {
    const away = document.createElement('div')
    document.body.appendChild(away)
    mount(columnOf(SELECT), { anchor: () => away })
    act(() => el().click())
    expect(seat.open?.mode).toBe('picker')
    away.remove()
    mount(columnOf(SELECT), { anchor: () => away })
    expect(seat.open).toBeNull()
  })

  it('closes once its column no longer resolves', () => {
    mount(columnOf(SELECT))
    act(() => el().click())
    expect(seat.open?.mode).toBe('picker')
    mount(columnOf(SELECT), { columnOf: () => undefined })
    expect(seat.open).toBeNull()
  })

  it('keeps the picker on its last value through its exit', async () => {
    mount(columnOf(SELECT))
    act(() => el().click())
    act(() => seat.close())
    expect(portalText()).toContain('Alpha')
    await settle(450)
    expect(portalText()).not.toContain('Alpha')
  })

  it('mounts a fresh popover for every open of the same value', async () => {
    mount(columnOf(TEXT))
    act(() => seat.pane(row, columnOf(TEXT), el()))
    const first = document.querySelector('[data-picker-portal] .cm-editor')
    act(() => seat.close())
    await settle(450)
    act(() => seat.pane(row, columnOf(TEXT), el()))
    const second = document.querySelector('[data-picker-portal] .cm-editor')
    expect(first).not.toBeNull()
    expect(second).not.toBe(first)
  })

  it('leaves a click or right-click from a pane portalled out of it alone', async () => {
    mount(columnOf(SELECT), undefined, createPortal(<b data-pane="" />, document.body))
    const pane = document.querySelector<HTMLElement>('[data-pane]')!
    act(() => pane.click())
    expect(seat.open).toBeNull()
    await act(async () => {
      pane.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(menu).not.toHaveBeenCalled()
  })
})

describe('the menu seat', () => {
  const LINK = def('prop_l', 'link')
  let trigger: HTMLElement
  const request = (column: ResolvedColumn, commit = vi.fn()) => ({
    rowOf: () => row,
    column,
    trigger,
    commit,
  })
  beforeEach(() => {
    trigger = document.createElement('div')
    document.body.appendChild(trigger)
    useSession.setState({ tree: makeTree({ registry: [LINK, DATE, TEXT, SELECT] }) })
  })
  afterEach(() => {
    trigger.remove()
    useSession.setState({ pendingPick: null })
  })

  it('an option created while its picker is open joins its list', () => {
    act(() => root.render(<MenuSeat />))
    act(() => useSession.getState().requestPick(request(columnOf(SELECT))))
    const beta = { id: 'opt_beta', key: 'beta', label: 'Beta' }
    const grown = { ...SELECT, select_options: [...(SELECT.select_options ?? []), beta] }
    act(() => useSession.setState({ tree: makeTree({ registry: [LINK, DATE, TEXT, grown] }) }))
    expect(portalText()).toContain('Beta')
  })

  it('a Link value picked from the page menu commits a page link through the index, under the page’s own title', () => {
    const picked = vi.fn()
    act(() => root.render(<MenuSeat />))
    act(() => useSession.getState().requestPick(request(columnOf(LINK), picked)))
    const dom = document.querySelector(
      '[data-picker-portal]:not([data-dismissal-shield]) .value-field .cm-editor',
    ) as HTMLElement
    const view = EditorView.findFromDOM(dom)!
    act(() => {
      view.dispatch({
        changes: { from: 0, insert: '[[alpha]]' },
        selection: { anchor: 9 },
        userEvent: 'input.type',
      })
    })
    expect(view.dom.getAttribute('aria-invalid')).toBe('false')
    act(() => {
      view.contentDOM.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      )
    })
    expect(picked).toHaveBeenCalledWith(columnOf(LINK), { kind: 'link', value: '[[Alpha]]' })
  })

  it('a Date opens the calendar and holds the request while it stands', () => {
    act(() => root.render(<MenuSeat />))
    act(() => useSession.getState().requestPick(request(columnOf(DATE))))
    expect(useSession.getState().pendingPick).not.toBeNull()
    expect(document.querySelector('[data-picker-portal]')).not.toBeNull()
  })

  it('a dismissed pane lets the request go', () => {
    act(() => root.render(<MenuSeat />))
    act(() => useSession.getState().requestPick(request(columnOf(TEXT))))
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(useSession.getState().pendingPick).toBeNull()
  })
})
