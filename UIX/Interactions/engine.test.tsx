// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  type DisplaceSpec,
  DragGroup,
  DropSlot,
  LineRow,
  type LineSpec,
  LineZone,
  SortableZone,
  useDragItem,
  useLineEl,
  useLooseItem,
} from './engine'
import { firePointer, pressEscape, stubPointerCapture, stubRect } from '../Testing/pointerHarness'
import { DEFAULT_FEEL } from '../Animations/feel'
import { addSpring } from './dragDisclose'
import type { Row } from './reorderModel'
import { type CarryEntry, carries, type Family, SETTLE_FALLBACK } from './shared'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
stubPointerCapture()

// ── Board ───────────────────────────────────────────────────────────────────

type Tab = { id: string; window: boolean }
type Spy = Mock<(item: unknown, beforeId: string | null) => void>

const BOARD: Family<unknown> = { name: 'board' }
const TAB: Family<Tab> = { name: 'tab' }
const tabOf = (id: string): Tab => ({ id, window: id === 'a1' })
const isWindowTarget = (t: Tab): boolean => t.window
const BOTH: CarryEntry[] = [carries(BOARD, (id) => id), carries(TAB, tabOf)]

const ITEMS: Record<string, string[]> = {
  E: [],
  A: ['a1', 'a2'],
  B: ['b1'],
  C: [],
  D: ['d1'],
  F: ['f1'],
  X: ['x1', 'x2', 'x3'],
  T: [],
  L: [],
  P: [],
  S: ['s1'],
}
const TOP: Record<string, number> = {
  E: -200,
  A: 0,
  B: 200,
  C: 400,
  D: 600,
  F: 800,
  X: 1000,
  T: 1200,
  L: 1400,
  P: 200,
  S: 1600,
}
const BOARD_ZONES = ['E', 'A', 'B', 'C', 'D', 'F', 'X', 'T']
const TAB_W = [200, 120, 120]

let onMove: Mock<(id: string, beforeId: string | null) => void>
let receives: Record<string, Spy>
let extra: Record<string, Partial<DisplaceSpec<unknown>>>
let hidden: Set<string>
let aside: ReactNode
const renders = new Map<string, number>()
const label = (id: string): string => id

function specOf(zid: string): DisplaceSpec<unknown> {
  const own = { items: ITEMS[zid], label, onMove: (id: string, b: string | null) => onMove(id, b) }
  if (zid === 'F') return own
  return {
    ...own,
    axis: zid === 'X' ? 'x' : undefined,
    family: zid === 'T' || zid === 'L' ? TAB : BOARD,
    carry: [carries(BOARD, (id) => id)],
    receive: (item, beforeId) => receives[zid](item, beforeId),
  }
}

function Item({ id, onOpen }: { id: string; onOpen?: () => void }): React.JSX.Element {
  renders.set(id, (renders.get(id) ?? 0) + 1)
  const { setNodeRef, style, handle } = useDragItem(id, { open: onOpen })
  return (
    <div ref={setNodeRef} data-id={id} style={style} {...handle}>
      <button type="button" data-inner={id} />
    </div>
  )
}

function Zone({ zid }: { zid: string }): React.JSX.Element {
  return (
    <SortableZone className={`zone-${zid}`} {...specOf(zid)} {...extra[zid]}>
      {ITEMS[zid].map((id) => (
        <Item key={id} id={id} />
      ))}
      <DropSlot />
    </SortableZone>
  )
}

function Loose(): React.JSX.Element {
  const board = useLooseItem(BOARD)
  const tab = useLooseItem(TAB)
  return (
    <b
      data-loose={board === null ? '' : String(board)}
      data-tab={tab?.id ?? ''}
      data-window={String(tab !== null && isWindowTarget(tab))}
    />
  )
}

function Late(): ReactNode {
  const tab = useLooseItem(TAB)
  if (tab === null) return null
  return (
    <div ref={(el) => void (el && layZone(el, 'L'))}>
      <Zone zid="L" />
    </div>
  )
}

function Board(): React.JSX.Element {
  return (
    <DragGroup>
      {BOARD_ZONES.filter((zid) => !hidden.has(zid)).map((zid) => (
        <Zone key={zid} zid={zid} />
      ))}
      {aside}
      <Loose />
    </DragGroup>
  )
}

// ── Line list ───────────────────────────────────────────────────────────────

const ROWS = ['r1', 'r2', 'r3']
let lineRows = ROWS
let commit: Mock<(id: string, slot: string) => void>
let lineSpec: Partial<LineSpec<string, Row[]>>
let rowOpts: Record<string, { open?: () => void }>
let watch: number

function slotAt(id: string, p: { y: number }, rows: Row[]): string | null {
  const before = rows.find((r) => r.id !== id && r.mid > p.y)?.id ?? 'end'
  const home = rows[rows.findIndex((r) => r.id === id) + 1]?.id ?? 'end'
  return before === home ? null : before
}

function Reader(): null {
  useLineEl()
  renders.set('reader', (renders.get('reader') ?? 0) + 1)
  return null
}

function Lines(): React.JSX.Element {
  return (
    <DragGroup>
      <LineZone<string, Row[]>
        label={label}
        snap={(_id, g) => g.rows}
        resolve={slotAt}
        commit={(id, slot) => commit(id, slot)}
        line={(slot, rows) => ({
          top: slot === 'end' ? rows[rows.length - 1].bottom : rows.find((r) => r.id === slot)?.top,
        })}
        chip={(id) => <i data-chip>{id}</i>}
        watch={[watch]}
        {...lineSpec}
      >
        {lineRows.map((id) => (
          <LineRow key={id} id={id} data-id={id} {...rowOpts[id]}>
            <button type="button" data-inner={id} />
          </LineRow>
        ))}
        <Reader />
      </LineZone>
      {aside}
    </DragGroup>
  )
}

// ── Harness ─────────────────────────────────────────────────────────────────

let host: HTMLDivElement
let root: Root
let View: () => React.JSX.Element = Board

const REGION = '[role="status"][aria-live="assertive"]'
const said: string[] = []
const hear = (records: MutationRecord[]): void => {
  for (const m of records)
    if (m.target instanceof Element && m.target.matches(REGION))
      for (const n of m.addedNodes) said.push(n.textContent ?? '')
}
const heard = new MutationObserver(hear)
const spoken = (): string[] => {
  hear(heard.takeRecords())
  return said
}

function layZone(scope: ParentNode, zid: string): void {
  const box = scope.querySelector(`.zone-${zid}`)
  if (!box) return
  const top = TOP[zid]
  const wide = zid === 'D' || zid === 'X'
  stubRect(box, { top, bottom: top + (zid === 'X' ? 100 : 200), right: wide ? 1000 : 200 })
  ITEMS[zid].forEach((id, i) => {
    const el = box.querySelector(`[data-id="${id}"]`) as Element
    if (zid === 'X') {
      const left = TAB_W.slice(0, i).reduce((a, b) => a + b, 0)
      stubRect(el, { top, bottom: top + 100, left, right: left + TAB_W[i] })
    } else stubRect(el, { top: top + i * 100, bottom: top + i * 100 + 100, left: 0, right: 200 })
  })
}

function layLines(order = ROWS): void {
  const list = host.querySelector('.line-zone')
  if (!list) return
  stubRect(list, { top: 0, bottom: 90 })
  for (const [i, id] of order.entries()) stubRect(item(id), { top: i * 30, bottom: i * 30 + 30 })
}

const mount = async (): Promise<void> => {
  await act(async () => root.render(<View />))
  for (const zid of Object.keys(ITEMS)) layZone(host, zid)
  layLines()
}

beforeEach(() => {
  onMove = vi.fn()
  receives = Object.fromEntries(Object.keys(ITEMS).map((zid) => [zid, vi.fn()]))
  commit = vi.fn()
  extra = {}
  hidden = new Set()
  aside = null
  lineSpec = {}
  rowOpts = {}
  lineRows = ROWS
  watch = 0
  ITEMS.D = ['d1']
  renders.clear()
  View = Board
  said.length = 0
  heard.observe(document.body, { childList: true, subtree: true })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  pressEscape()
  act(() => root.unmount())
  host.remove()
  heard.disconnect()
})

const item = (id: string): HTMLElement => host.querySelector(`[data-id="${id}"]`) as HTMLElement
const slotEl = (): HTMLElement | null => document.querySelector('.drop-slot')

const move = (x: number, y: number): Promise<void> =>
  act(async () => {
    firePointer(window, 'pointermove', { x, y })
  })

const dragHold = async (id: string, x: number, y: number): Promise<void> => {
  const r = item(id).getBoundingClientRect()
  await act(async () => {
    firePointer(item(id), 'pointerdown', { x: r.left + r.width / 2, y: r.top + r.height / 2 })
  })
  await move(x, y)
}

const release = async (x: number, y: number): Promise<void> => {
  await act(async () => {
    firePointer(window, 'pointerup', { x, y })
  })
}

const dragTo = async (id: string, x: number, y: number): Promise<void> => {
  await dragHold(id, x, y)
  await release(x, y)
}

const settle = (): Promise<void> =>
  act(async () => {
    await new Promise((r) => setTimeout(r, DEFAULT_FEEL.duration + SETTLE_FALLBACK + 20))
  })

const dropAt = async (id: string, x: number, y: number): Promise<void> => {
  await dragTo(id, x, y)
  await settle()
}

const press = (
  el: EventTarget,
  key: string,
  init: KeyboardEventInit = {},
): Promise<KeyboardEvent> =>
  act(async () => {
    const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
    el.dispatchEvent(e)
    return e
  })

// ── Displacement ────────────────────────────────────────────────────────────

describe('the drag engine across zones', () => {
  beforeEach(mount)

  it('reorders within the source zone and reports the slot it landed on', async () => {
    await dropAt('a1', 100, 150)
    expect(onMove).toHaveBeenCalledExactlyOnceWith('a1', null)
  })

  it('writes nothing when the item is dropped back on its own slot', async () => {
    await dropAt('a1', 100, 60)
    expect(onMove).not.toHaveBeenCalled()
    expect(spoken().at(-1)).toBe('a1 returned to its place.')
  })

  it('drops before an item in a foreign zone', async () => {
    await dropAt('a1', 100, 210)
    expect(receives.B).toHaveBeenCalledExactlyOnceWith('a1', 'b1')
    expect(onMove).not.toHaveBeenCalled()
  })

  it('appends past the last item of a foreign zone', async () => {
    await dropAt('a1', 100, 358)
    expect(receives.B).toHaveBeenCalledExactlyOnceWith('a1', null)
  })

  it('appends to the right of the last card in a wide foreign row', async () => {
    await dropAt('a1', 300, 650)
    expect(receives.D).toHaveBeenCalledExactlyOnceWith('a1', null)
  })

  it('sizes the landing slot to the cell it lands in and floors only the empty admitted zones while in flight', async () => {
    stubRect(item('b1'), { top: 200, bottom: 350, left: 0, right: 200 })
    const floorOf = (zid: string): string =>
      (host.querySelector(`.zone-${zid}`) as HTMLElement).style.getPropertyValue('--drag-floor')
    await dragHold('a1', 100, 210)
    expect(slotEl()?.style.height).toBe('150px')
    expect(floorOf('A')).toBe('')
    expect(floorOf('B')).toBe('')
    expect(floorOf('C')).toBe('100.0px')
    expect(floorOf('F')).toBe('')
    await release(100, 210)
    await settle()
    expect(floorOf('C')).toBe('')
  })

  it('grows a foreign grid by the row its preview spills into, only while it is the landing', async () => {
    const spillOf = (zid: string): string =>
      (host.querySelector(`.zone-${zid}`) as HTMLElement).style.getPropertyValue('--drag-spill')
    await dragHold('a1', 100, 150)
    expect(BOARD_ZONES.map(spillOf).every((v) => v === '')).toBe(true)
    await move(100, 358)
    expect(spillOf('B')).toBe('100.0px')
    expect(spillOf('A')).toBe('')
    await move(100, 450)
    expect(spillOf('B')).toBe('')
    expect(spillOf('C')).toBe('100.0px')
    await release(100, 450)
    await settle()
    expect(spillOf('C')).toBe('')
  })

  it('re-reads the landing once the floors of empty zones have grown on lift', async () => {
    const grown = (): number =>
      parseFloat(
        (host.querySelector('.zone-E') as HTMLElement).style.getPropertyValue('--drag-floor'),
      ) || 0
    const shifted = (el: Element, top: number, bottom: number): void => {
      el.getBoundingClientRect = () => {
        const dy = grown()
        return {
          top: top + dy,
          bottom: bottom + dy,
          left: 0,
          right: 200,
          width: 200,
          height: bottom - top,
        } as DOMRect
      }
    }
    shifted(host.querySelector('.zone-A') as Element, 0, 200)
    shifted(item('a1'), 0, 100)
    shifted(item('a2'), 100, 200)
    await act(async () => {
      firePointer(item('a1'), 'pointerdown', { x: 100, y: 50 })
    })
    await move(100, 250)
    expect(slotEl()?.style.top).toBe('200px')
    pressEscape()
  })

  it('lands at index 0 in an empty zone', async () => {
    await dropAt('a1', 100, 450)
    expect(receives.C).toHaveBeenCalledExactlyOnceWith('a1', null)
  })

  it('snaps back and commits nothing when the landing is refused', async () => {
    extra = { B: { resolveIndex: () => null } }
    await mount()
    await dropAt('a1', 100, 210)
    expect(receives.B).not.toHaveBeenCalled()
    expect(onMove).not.toHaveBeenCalled()
  })

  it('asks the resolver once per slot change, not once per pointer move', async () => {
    const resolveIndex = vi.fn((index: number, _id: string) => index)
    extra = { B: { resolveIndex } }
    await mount()
    await dragHold('a1', 100, 210)
    for (const y of [215, 220, 225]) await move(100, y)
    expect(resolveIndex).toHaveBeenCalledExactlyOnceWith(0, 'a1')
    await move(100, 358)
    expect(resolveIndex).toHaveBeenCalledTimes(2)
    expect(resolveIndex).toHaveBeenLastCalledWith(1, 'a1')
    pressEscape()
  })

  it('glides the overlay to where the committed layout puts the item, not to the release point', async () => {
    extra = { A: { renderOverlay: (id) => <span data-overlay={id} /> } }
    await mount()
    onMove.mockImplementation(() => stubRect(item('a1'), { top: 150, bottom: 250, right: 200 }))
    await dragTo('a1', 100, 130)
    const overlay = document.querySelector('[data-overlay="a1"]')?.parentElement as HTMLElement
    expect(overlay.style.transform).toBe('translate3d(0.0px, 150.0px, 0)')
    await settle()
  })

  it('keeps the keyboard lift off the keypress that lifted it', async () => {
    await press(item('a1'), ' ')
    await press(document, 'ArrowDown')
    await press(document, ' ')
    await settle()
    expect(onMove).toHaveBeenCalledExactlyOnceWith('a1', null)
  })

  it('marks a disabled zone on its items from the first render', async () => {
    const box = document.createElement('div')
    document.body.appendChild(box)
    const local = createRoot(box)
    await act(async () =>
      local.render(
        <SortableZone items={['a', 'b']} label={label} disabled>
          <Item id="a" />
          <Item id="b" />
        </SortableZone>,
      ),
    )
    const handle = box.querySelector('[data-id="a"]') as HTMLElement
    expect(handle.getAttribute('tabindex')).toBe('-1')
    expect(handle.getAttribute('aria-disabled')).toBe('true')
    act(() => local.unmount())
    box.remove()
  })

  it('ends the overlay at once when the landed item has no element to glide to', async () => {
    extra = { A: { renderOverlay: (id) => <span data-overlay={id} /> } }
    await mount()
    await dragTo('a1', 100, 210)
    expect(receives.B).toHaveBeenCalledExactlyOnceWith('a1', 'b1')
    expect(document.querySelector('[data-overlay="a1"]')).toBeNull()
    expect(item('a1').style.visibility).toBe('')
  })

  it('a commit that throws still lands, and the next drag lifts', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    onMove.mockImplementationOnce(() => {
      throw new Error('commit failed')
    })
    await dropAt('a1', 100, 150)
    expect(error).toHaveBeenCalledOnce()
    expect(item('a1').style.zIndex).toBe('')
    await dropAt('a1', 100, 150)
    expect(onMove).toHaveBeenCalledTimes(2)
    error.mockRestore()
  })

  it('commits at release, then glides', async () => {
    await dragTo('a1', 100, 150)
    expect(onMove).toHaveBeenCalledOnce()
    expect(item('a1').style.zIndex).toBe('10')
    await settle()
    expect(item('a1').style.zIndex).toBe('')
    expect(onMove).toHaveBeenCalledOnce()
  })

  it('renders only the lifted item, at most twice', async () => {
    renders.clear()
    await dragHold('a1', 100, 150)
    await move(100, 210)
    await move(100, 358)
    await release(100, 358)
    await settle()
    expect(receives.B).toHaveBeenCalledExactlyOnceWith('a1', null)
    expect([...renders.keys()]).toEqual(['a1'])
    expect(renders.get('a1')).toBeLessThanOrEqual(2)
  })

  it('a press during a glide fast-forwards the settle', async () => {
    await dragTo('a1', 100, 150)
    expect(item('a1').style.zIndex).toBe('10')
    await act(async () => {
      firePointer(item('b1'), 'pointerdown', { x: 100, y: 250 })
    })
    expect(item('a1').style.zIndex).toBe('')
    expect(onMove).toHaveBeenCalledExactlyOnceWith('a1', null)
    await release(100, 250)
  })

  it('an unmounting source zone ends a live drag', async () => {
    await dragHold('a1', 100, 150)
    hidden = new Set(['A'])
    await act(async () => root.render(<Board />))
    expect(spoken().at(-1)).toBe('Canceled moving a1.')
    expect(slotEl()).toBeNull()
    await release(100, 150)
    await settle()
    expect(onMove).not.toHaveBeenCalled()
  })

  it('a function disclose springs for one id and not another', async () => {
    extra = { A: { disclose: (id) => id === 'a1' } }
    await mount()
    const sprung: string[] = []
    const offs = ['a1', 'a2'].map((id) => addSpring(item(id), () => sprung.push(id)))
    const under = vi.spyOn(document, 'elementFromPoint')
    vi.useFakeTimers()
    const wait = (ms: number): Promise<void> =>
      act(async () => {
        vi.advanceTimersByTime(ms)
      })
    try {
      under.mockReturnValue(item('a2'))
      await dragHold('a1', 100, 60)
      await wait(1000)
      await act(async () => pressEscape())
      await wait(1000)
      under.mockReturnValue(item('a1'))
      await dragHold('a2', 100, 140)
      await wait(1000)
      await act(async () => pressEscape())
      await wait(1000)
      expect(sprung).toContain('a2')
      expect(sprung).not.toContain('a1')
    } finally {
      for (const off of offs) off()
      vi.useRealTimers()
      under.mockRestore()
    }
  })
})

describe('the drag handle keyboard', () => {
  const renderZone = async (
    onOpen: (() => void) | undefined,
    zone: Partial<DisplaceSpec<unknown>> = {},
  ): Promise<{ handle: HTMLElement; done: () => void }> => {
    const box = document.createElement('div')
    document.body.appendChild(box)
    const local = createRoot(box)
    await act(async () =>
      local.render(
        <SortableZone items={['k', 'j']} label={label} {...zone}>
          <Item id="k" onOpen={onOpen} />
          <Item id="j" />
        </SortableZone>,
      ),
    )
    for (const [i, id] of ['k', 'j'].entries())
      stubRect(box.querySelector(`[data-id="${id}"]`) as Element, {
        top: i * 100,
        bottom: i * 100 + 100,
        left: 0,
        right: 200,
      })
    return {
      handle: box.querySelector('[data-id="k"]') as HTMLElement,
      done: () => {
        pressEscape()
        act(() => local.unmount())
        box.remove()
      },
    }
  }
  const lifted = (el: HTMLElement): boolean => el.getAttribute('aria-pressed') === 'true'

  it('opens on Enter when the item opens, without lifting', async () => {
    const onOpen = vi.fn()
    const { handle, done } = await renderZone(onOpen)
    expect((await press(handle, 'Enter')).defaultPrevented).toBe(true)
    expect(onOpen).toHaveBeenCalledOnce()
    expect(lifted(handle)).toBe(false)
    done()
  })

  it('lifts on Space when the item opens', async () => {
    const onOpen = vi.fn()
    const { handle, done } = await renderZone(onOpen)
    await press(handle, ' ')
    expect(lifted(handle)).toBe(true)
    expect(onOpen).not.toHaveBeenCalled()
    done()
  })

  it('drops on Enter without opening an item it lifted', async () => {
    const onOpen = vi.fn()
    const { handle, done } = await renderZone(onOpen)
    await press(handle, ' ')
    await press(handle, 'Enter')
    await settle()
    expect(onOpen).not.toHaveBeenCalled()
    expect(lifted(handle)).toBe(false)
    done()
  })

  it('keeps a lifted item home in a fixed zone', async () => {
    const { handle, done } = await renderZone(undefined, { fixed: true, onMove })
    await press(handle, ' ')
    await press(document, 'ArrowDown')
    await press(document, ' ')
    await settle()
    expect(onMove).not.toHaveBeenCalled()
    done()
  })

  it('lifts on Enter when the item has no open action', async () => {
    const { handle, done } = await renderZone(undefined)
    await press(handle, 'Enter')
    expect(lifted(handle)).toBe(true)
    done()
  })

  it("leaves a focusable descendant's Enter to it", async () => {
    const onOpen = vi.fn()
    const { handle, done } = await renderZone(onOpen)
    await press(handle.querySelector('[data-inner]') as Element, 'Enter')
    expect(onOpen).not.toHaveBeenCalled()
    expect(lifted(handle)).toBe(false)
    done()
  })

  it('never lifts in a disabled zone, and leaves the tab order only with nothing to open', async () => {
    const inert = await renderZone(undefined, { disabled: true })
    await press(inert.handle, 'Enter')
    await press(inert.handle, ' ')
    expect(lifted(inert.handle)).toBe(false)
    expect(inert.handle.getAttribute('tabindex')).toBe('-1')
    inert.done()

    const onOpen = vi.fn()
    const openable = await renderZone(onOpen, { disabled: true })
    await press(openable.handle, ' ')
    expect(lifted(openable.handle)).toBe(false)
    await press(openable.handle, 'Enter')
    expect(onOpen).toHaveBeenCalledOnce()
    expect(openable.handle.getAttribute('tabindex')).toBe('0')
    expect(openable.handle.hasAttribute('aria-disabled')).toBe(false)
    openable.done()
  })

  it('T1: the lifting and dropping Space are both prevented', async () => {
    const { handle, done } = await renderZone(undefined, { onMove })
    expect((await press(handle, ' ')).defaultPrevented).toBe(true)
    await press(document, 'ArrowDown')
    await press(document, ' ', { repeat: true })
    expect(lifted(handle)).toBe(true)
    expect((await press(document, ' ')).defaultPrevented).toBe(true)
    await settle()
    expect(onMove).toHaveBeenCalledExactlyOnceWith('k', null)
    done()
  })

  it('T2: a press on the lifted item cancels the lift', async () => {
    const { handle, done } = await renderZone(undefined)
    const opened = vi.fn()
    handle.addEventListener('click', opened)
    await press(handle, ' ')
    await act(async () => {
      firePointer(handle, 'pointerdown', { x: 100, y: 50 })
      firePointer(handle, 'pointerup', { x: 100, y: 50 })
      handle.click()
    })
    await settle()
    expect(handle.getAttribute('aria-pressed')).toBeNull()
    expect(spoken().at(-1)).toBe('Canceled moving k.')
    expect(opened).not.toHaveBeenCalled()
    done()
  })

  it('focus leaving a keyboard-lifted item cancels the lift', async () => {
    const { handle, done } = await renderZone(undefined, { onMove })
    const away = document.body.appendChild(document.createElement('button'))
    await act(async () => handle.focus())
    await press(handle, ' ')
    expect(lifted(handle)).toBe(true)
    await act(async () => away.focus())
    await settle()
    expect(lifted(handle)).toBe(false)
    expect(spoken().at(-1)).toBe('Canceled moving k.')
    expect(onMove).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(away)
    away.remove()
    done()
  })

  it('a press outside a keyboard-lifted item cancels the lift and leaves focus where it went', async () => {
    const { handle, done } = await renderZone(undefined, { onMove })
    const field = document.body.appendChild(document.createElement('input'))
    await act(async () => handle.focus())
    await press(handle, ' ')
    await act(async () => {
      firePointer(field, 'pointerdown', { x: 500, y: 500 })
      field.focus()
    })
    await settle()
    expect(spoken().at(-1)).toBe('Canceled moving k.')
    expect(document.activeElement).toBe(field)
    field.remove()
    done()
  })

  it('a keyboard drop hands focus back to the item once its commit has taken it', async () => {
    const { handle, done } = await renderZone(undefined, {
      onMove: () => (document.activeElement as HTMLElement | null)?.blur(),
    })
    await act(async () => handle.focus())
    await press(handle, ' ')
    await press(document, 'ArrowDown')
    await press(document, ' ')
    await settle()
    expect(document.activeElement).toBe(handle)
    done()
  })

  it('a canceled lift leaves the item with no transform or transition, by keyboard or pointer', async () => {
    const { handle, done } = await renderZone(undefined, { onMove })
    await act(async () => handle.focus())
    await press(handle, ' ')
    await press(document, 'ArrowDown')
    expect(handle.style.transform).not.toBe('')
    await press(document, 'Escape')
    await settle()
    expect([handle.style.transform, handle.style.transition]).toEqual(['', ''])
    await act(async () => {
      firePointer(handle, 'pointerdown', { x: 100, y: 50 })
    })
    await move(100, 150)
    expect(handle.style.transform).not.toBe('')
    pressEscape()
    await settle()
    expect([handle.style.transform, handle.style.transition]).toEqual(['', ''])
    expect(onMove).not.toHaveBeenCalled()
    done()
  })

  it('prevents Space and Enter on a handle while a drop still glides', async () => {
    const { handle, done } = await renderZone(undefined, { onMove })
    const other = handle.nextElementSibling as HTMLElement
    await act(async () => handle.focus())
    await press(handle, ' ')
    await press(document, 'ArrowDown')
    await press(document, ' ')
    expect((await press(other, ' ')).defaultPrevented).toBe(true)
    expect((await press(other, 'Enter')).defaultPrevented).toBe(true)
    await settle()
    done()
  })
})

// ── Families and carries ────────────────────────────────────────────────────

describe('the drag engine across a family', () => {
  beforeEach(mount)

  it('keeps an item home when its zone has no family', async () => {
    await dropAt('f1', 100, 210)
    expect(onMove).not.toHaveBeenCalled()
    for (const spy of Object.values(receives)) expect(spy).not.toHaveBeenCalled()
  })

  it('keeps an item home when carry declines it', async () => {
    extra = { A: { carry: [carries(BOARD, () => null)] } }
    await mount()
    await dropAt('a1', 100, 210)
    expect(receives.B).not.toHaveBeenCalled()
    expect(onMove).toHaveBeenCalledExactlyOnceWith('a1', null)
  })

  it('holds an item with nowhere else to go inside its own zone', async () => {
    extra = { A: { carry: [carries(BOARD, () => null)] } }
    await mount()
    await dragHold('a1', 100, 900)
    expect(item('a1').style.transform).toMatch(/,\s*100(\.0)?px/)
    await release(100, 900)
  })

  it('returns to its slot when released over nothing', async () => {
    await dropAt('a1', 300, 250)
    expect(onMove).not.toHaveBeenCalled()
    for (const spy of Object.values(receives)) expect(spy).not.toHaveBeenCalled()
  })

  it('lands home unchanged when it strays off every zone and comes back to its own slot', async () => {
    await dragHold('a1', 300, 250)
    await move(100, 50)
    await release(100, 50)
    await settle()
    expect(onMove).not.toHaveBeenCalled()
    for (const spy of Object.values(receives)) expect(spy).not.toHaveBeenCalled()
  })

  it('holds the source gap open while the landing is foreign', async () => {
    await dragTo('a1', 100, 210)
    expect(item('a2').style.transform).toBe('')
    await settle()
  })

  it('closes the source gap while the landing is foreign when the source releases', async () => {
    const releaseA = vi.fn()
    extra = { A: { release: releaseA } }
    await mount()
    await dragHold('a1', 100, 210)
    expect(item('a2').style.transform).toBe('translate3d(0.0px, -100.0px, 0)')
    await release(100, 210)
    await settle()
    expect(releaseA).toHaveBeenCalledExactlyOnceWith('a1')
  })

  it('holds the source gap while previewing another zone of its family, and receives at release', async () => {
    await dragHold('a1', 100, 210)
    expect(item('a2').style.transform).toBe('')
    expect(receives.B).not.toHaveBeenCalled()
    await release(100, 210)
    expect(receives.B).toHaveBeenCalledExactlyOnceWith('a1', 'b1')
    await settle()
  })

  it('a carry lands at once and announces the open', async () => {
    extra = { A: { carry: BOTH }, T: { opens: true } }
    await mount()
    await dragTo('a1', 100, 1250)
    expect(receives.T).toHaveBeenCalledExactlyOnceWith(tabOf('a1'), null)
    expect(spoken().filter((m) => m === 'Opened a1 in new tab.')).toHaveLength(1)
    await settle()
  })

  it('hands the carried item to the zone it lands in', async () => {
    extra = { A: { carry: [carries(BOARD, (id) => ({ id, from: 'A' }))] } }
    await mount()
    await dropAt('a1', 100, 210)
    expect(receives.B).toHaveBeenCalledExactlyOnceWith({ id: 'a1', from: 'A' }, 'b1')
  })

  it('still receives when the landing zone unmounts during the drop animation', async () => {
    await dragTo('a1', 100, 210)
    hidden = new Set(['B'])
    await act(async () => root.render(<Board />))
    await settle()
    expect(receives.B).toHaveBeenCalledExactlyOnceWith('a1', 'b1')
  })

  it('marks only the lifted zone item as dragging when two zones share an id', async () => {
    ITEMS.D = ['d1', 'a1']
    await mount()
    const twins = host.querySelectorAll('[data-id="a1"]')
    const r = twins[0].getBoundingClientRect()
    await act(async () => {
      firePointer(twins[0], 'pointerdown', { x: r.left + r.width / 2, y: r.top + r.height / 2 })
    })
    await move(100, 150)
    expect(twins[0].getAttribute('aria-pressed')).toBe('true')
    expect(twins[1].getAttribute('aria-pressed')).toBeNull()
    pressEscape()
  })

  it('reports the family once the item is loose and nothing after', async () => {
    const loose = (): string | null | undefined =>
      host.querySelector('[data-loose]')?.getAttribute('data-loose')
    await dragTo('a1', 100, 150)
    expect(loose()).toBe('')
    await settle()
    await dragHold('a1', 100, 210)
    expect(loose()).toBe('a1')
    await release(100, 210)
    expect(loose()).toBe('')
    await settle()
  })

  it('parts an axis row by the width of the item coming in', async () => {
    await dragHold('x1', 260, 1050)
    expect(item('x2').style.transform).toBe('translate3d(-200.0px, 0.0px, 0)')
    expect(slotEl()?.style.left).toBe('120px')
    await release(260, 1050)
    await settle()
  })

  it('keeps an axis row item in its row when it overshoots the row end', async () => {
    await dropAt('x1', 900, 1050)
    expect(onMove).toHaveBeenCalledExactlyOnceWith('x1', null)
  })

  it('lands a foreign item past the last item of an axis row at the row own size', async () => {
    await dragHold('a1', 500, 1050)
    expect(slotEl()?.style.left).toBe('440px')
    expect(slotEl()?.style.width).toBe('120px')
    await release(500, 1050)
    await settle()
    expect(receives.X).toHaveBeenCalledExactlyOnceWith('a1', null)
  })

  it('a receiver whose accepts refuses the item shows no slot and receives nothing', async () => {
    extra = { B: { accepts: (item) => item !== 'a1' } }
    await mount()
    await dragHold('a1', 100, 210)
    expect(slotEl()).toBeNull()
    await release(100, 210)
    await settle()
    expect(receives.B).not.toHaveBeenCalled()
    await dropAt('a2', 100, 210)
    expect(receives.B).toHaveBeenCalledExactlyOnceWith('a2', 'b1')
  })

  it('an item carrying two families is admitted by each family receiver', async () => {
    extra = { A: { carry: BOTH } }
    await mount()
    await dropAt('a1', 100, 210)
    await dropAt('a1', 100, 1250)
    expect(receives.B).toHaveBeenCalledExactlyOnceWith('a1', 'b1')
    expect(receives.T).toHaveBeenCalledExactlyOnceWith(tabOf('a1'), null)
  })

  it('a fixed zone lifts and carries and never previews its own order', async () => {
    extra = { A: { fixed: true } }
    await mount()
    await dragHold('a1', 100, 150)
    expect(item('a2').style.transform).toBe('')
    expect(slotEl()).toBeNull()
    await release(100, 150)
    await settle()
    expect(onMove).not.toHaveBeenCalled()
    await dropAt('a1', 100, 210)
    expect(receives.B).toHaveBeenCalledExactlyOnceWith('a1', 'b1')
  })

  it('useLooseItem holds the typed item only while it is loose, and the strip forces only on isWindowTarget', async () => {
    extra = { A: { carry: BOTH } }
    await mount()
    const probe = (): string[] => {
      const b = host.querySelector('[data-tab]') as HTMLElement
      return [b.dataset.tab ?? '', b.dataset.window ?? '']
    }
    await dragHold('a1', 100, 150)
    expect(probe()).toEqual(['', 'false'])
    await move(300, 250)
    expect(probe()).toEqual(['a1', 'true'])
    await release(300, 250)
    await settle()
    expect(probe()).toEqual(['', 'false'])
    await dragHold('a2', 300, 250)
    expect(probe()).toEqual(['a2', 'false'])
    await release(300, 250)
    await settle()
  })
})

// ── Line zone ───────────────────────────────────────────────────────────────

describe('the line zone', () => {
  beforeEach(async () => {
    View = Lines
    await mount()
  })

  const lineHost = (): HTMLElement => host.querySelector('.line-zone') as HTMLElement

  it('shows the chip, marks the source, and commits on release', async () => {
    await dragHold('r1', 100, 70)
    expect(document.querySelector('.drag-ghost [data-chip]')?.textContent).toBe('r1')
    expect(item('r1').hasAttribute('data-drag-source')).toBe(true)
    expect((host.querySelector('.drop-line') as HTMLElement).style.top).toBe('60px')
    await release(100, 70)
    expect(commit).toHaveBeenCalledExactlyOnceWith('r1', 'r3')
    expect(spoken().at(-1)).toBe('Moved r1.')
    expect(item('r1').hasAttribute('data-drag-source')).toBe(false)
    expect(document.querySelector('.drag-ghost')).toBeNull()
    expect(host.querySelector('.drop-line')).toBeNull()
  })

  it('builds the chip from the glyph and the label when no custom chip is given', async () => {
    lineSpec = { chip: undefined, glyph: (id) => <b data-glyph={id} /> }
    await mount()
    await dragHold('r1', 100, 70)
    const ghost = document.querySelector('.drag-ghost')
    expect(ghost?.querySelector('[data-glyph="r1"]')).not.toBeNull()
    expect(ghost?.textContent).toBe('r1')
    pressEscape()
  })

  it('anchors the chip at the grab point', async () => {
    await act(async () => {
      firePointer(item('r1'), 'pointerdown', { x: 7, y: 15 })
    })
    await move(40, 70)
    const chrome = document.querySelector('.drag-ghost')?.parentElement as HTMLElement
    expect([chrome.style.left, chrome.style.top]).toEqual(['7px', '15px'])
    pressEscape()
  })

  it('aims a row carried into a displace zone with the pointer, not the row centre', async () => {
    lineSpec = { carry: [carries(TAB, tabOf)] }
    extra = { X: { family: TAB } }
    aside = <Zone zid="X" />
    await mount()
    stubRect(item('r1'), { top: 0, bottom: 30, left: 0, right: 1000 })
    await act(async () => {
      firePointer(item('r1'), 'pointerdown', { x: 10, y: 15 })
    })
    await move(130, 1050)
    await release(130, 1050)
    expect(receives.X).toHaveBeenCalledExactlyOnceWith(tabOf('r1'), 'x1')
  })

  it('Enter on a row opens nothing while another row is lifted', async () => {
    const open = vi.fn()
    rowOpts = { r2: { open } }
    await mount()
    await dragHold('r1', 100, 70)
    await press(item('r2'), 'Enter')
    expect(open).not.toHaveBeenCalled()
    pressEscape()
  })

  it('Space on a row lifts nothing while another drop still glides', async () => {
    aside = <Zone zid="A" />
    await mount()
    await act(async () => item('a1').focus())
    await press(item('a1'), ' ')
    await press(document, 'ArrowDown')
    await press(document, ' ')
    expect((await press(item('r1'), ' ')).defaultPrevented).toBe(true)
    expect(item('r1').hasAttribute('data-drag-source')).toBe(false)
    await settle()
  })

  it('refuses a lift with no snapshot and nothing to carry', async () => {
    lineSpec = { snap: () => null }
    await mount()
    await dragHold('r1', 100, 70)
    await release(100, 70)
    await act(async () => item('r1').focus())
    await press(item('r1'), ' ')
    expect(spoken()).toEqual([])
    expect(item('r1').hasAttribute('data-drag-source')).toBe(false)
    lineSpec = { snap: () => null, carry: [carries(BOARD, (id) => id)] }
    await mount()
    await dragHold('r1', 100, 70)
    expect(spoken()).toEqual(['Picked up r1.'])
    pressEscape()
  })

  it('steps by keyboard naming the neighbour and commits', async () => {
    await act(async () => item('r1').focus())
    await press(item('r1'), ' ')
    await press(document, 'ArrowDown')
    expect(spoken().at(-1)).toBe('After r2.')
    await press(document, 'ArrowDown')
    expect(spoken().at(-1)).toBe('After r3.')
    await press(document, 'ArrowUp')
    expect(spoken().at(-1)).toBe('Before r3.')
    await press(document, ' ')
    expect(commit).toHaveBeenCalledExactlyOnceWith('r1', 'r3')
    expect(spoken().at(-1)).toBe('Moved r1.')
  })

  it('is one tab stop that forwards to a row and moves between rows', async () => {
    const away = document.body.appendChild(document.createElement('button'))
    expect(lineHost().tabIndex).toBe(0)
    expect(ROWS.map((id) => item(id).tabIndex)).toEqual([-1, -1, -1])
    await act(async () => lineHost().focus())
    expect(document.activeElement).toBe(item('r1'))
    expect(lineHost().tabIndex).toBe(-1)
    await press(item('r1'), 'ArrowDown')
    expect(document.activeElement).toBe(item('r2'))
    await act(async () => away.focus())
    expect(lineHost().tabIndex).toBe(0)
    await act(async () => lineHost().focus())
    expect(document.activeElement).toBe(item('r2'))
    away.remove()
  })

  it("a pointer press on the host's blank space focuses no row and holds the scroll", async () => {
    const scrolled = vi.spyOn(HTMLElement.prototype, 'scrollIntoView')
    await act(async () => {
      firePointer(lineHost(), 'pointerdown', { x: 100, y: 88 })
      lineHost().focus()
      firePointer(window, 'pointerup', { x: 100, y: 88 })
    })
    expect(document.activeElement).toBe(lineHost())
    expect(scrolled).not.toHaveBeenCalled()
    scrolled.mockRestore()
  })

  it('an arrow key on a pointer-focused host hands focus to a row', async () => {
    await act(async () => {
      firePointer(lineHost(), 'pointerdown', { x: 100, y: 88 })
      lineHost().focus()
      firePointer(window, 'pointerup', { x: 100, y: 88 })
    })
    await press(lineHost(), 'ArrowDown')
    expect(document.activeElement).toBe(item('r1'))
  })

  it('a click inside a row focuses the row', async () => {
    const inner = item('r2').querySelector('[data-inner]') as HTMLElement
    await act(async () => {
      firePointer(inner, 'pointerdown', { x: 100, y: 45 })
      inner.focus()
      firePointer(window, 'pointerup', { x: 100, y: 45 })
    })
    expect(document.activeElement).toBe(item('r2'))
  })

  it('a release over nothing returns', async () => {
    lineSpec = { carry: [carries(BOARD, (id) => id)] }
    await mount()
    await dragTo('r1', 100, 300)
    expect(commit).not.toHaveBeenCalled()
    expect(spoken().at(-1)).toBe('r1 returned to its place.')
    expect(item('r1').hasAttribute('data-drag-source')).toBe(false)
  })

  it('a carried line row held in the gutter beside its list still resolves a slot', async () => {
    lineSpec = { carry: [carries(BOARD, (id) => id)] }
    await mount()
    await dragTo('r1', -12, 70)
    expect(commit).toHaveBeenCalledExactlyOnceWith('r1', 'r3')
  })

  it('a line row carried into an admitted zone lands at once', async () => {
    lineSpec = { carry: [carries(BOARD, (id) => id)] }
    aside = <Zone zid="P" />
    await mount()
    await dragTo('r1', 100, 300)
    expect(receives.P).toHaveBeenCalledExactlyOnceWith('r1', null)
    expect(commit).not.toHaveBeenCalled()
    expect(spoken().at(-1)).toBe('Moved r1.')
  })

  it('a watch change mid-drag re-measures, and the release commits against the fresh slot', async () => {
    await dragHold('r1', 100, 70)
    layLines(['r1', 'r3', 'r2'])
    watch = 1
    await act(async () => root.render(<Lines />))
    expect((host.querySelector('.drop-line') as HTMLElement).style.top).toBe('60px')
    await release(100, 70)
    expect(commit).toHaveBeenCalledExactlyOnceWith('r1', 'r2')
  })
})

// ── Seams ───────────────────────────────────────────────────────────────────

describe('the engine seams', () => {
  beforeEach(mount)

  it('a zone mounting mid-drag registers, syncs bounds, and receives', async () => {
    extra = { A: { carry: BOTH } }
    aside = <Late />
    await mount()
    expect(host.querySelector('.zone-L')).toBeNull()
    await dragHold('a1', 300, 250)
    const late = host.querySelector('.zone-L') as HTMLElement
    expect(late.style.getPropertyValue('--drag-floor')).toBe('100.0px')
    await move(100, 1450)
    expect(slotEl()).not.toBeNull()
    await release(100, 1450)
    expect(receives.L).toHaveBeenCalledExactlyOnceWith(tabOf('a1'), null)
  })

  it('a zone mounting mid-drag outside a scrolled element keeps its bounds through that scroll', async () => {
    extra = { A: { carry: BOTH } }
    aside = (
      <>
        <Late />
        <div className="scroller" style={{ overflowY: 'auto' }}>
          <Zone zid="S" />
        </div>
      </>
    )
    await mount()
    await dragHold('a1', 300, 250)
    const read = vi.spyOn(host.querySelector('.zone-L') as HTMLElement, 'getBoundingClientRect')
    await act(async () => {
      host.querySelector('.scroller')?.dispatchEvent(new Event('scroll'))
    })
    expect(read).not.toHaveBeenCalled()
    await move(100, 1450)
    await release(100, 1450)
    expect(receives.L).toHaveBeenCalledExactlyOnceWith(tabOf('a1'), null)
  })

  it('clips a receiver to its scroller, so its overflow is not a target', async () => {
    aside = (
      <div className="scroller" style={{ overflowY: 'auto' }}>
        <Zone zid="S" />
      </div>
    )
    await mount()
    stubRect(host.querySelector('.scroller') as Element, { top: 1600, bottom: 1650 })
    await dragHold('a1', 100, 1700)
    expect(slotEl()).toBeNull()
    await move(100, 1620)
    expect(slotEl()?.style.clipPath).toBe('inset(0.0px 0.0px 50.0px 0.0px)')
    await release(100, 1620)
    await settle()
    expect(receives.S).toHaveBeenCalledExactlyOnceWith('a1', 's1')
  })

  it('holds a foreign grid zone while the pointer rides its tail slot below the box', async () => {
    aside = <Zone zid="S" />
    await mount()
    stubRect(host.querySelector('.zone-S') as Element, { top: 1600, bottom: 1700 })
    await dragHold('a1', 100, 1650)
    await move(100, 1750)
    expect(slotEl()?.style.top).toBe('1700px')
    await release(100, 1750)
    await settle()
    expect(receives.S).toHaveBeenCalledExactlyOnceWith('a1', null)
  })

  it('a zone registering during a keyboard lift keeps the stepped landing', async () => {
    await press(item('a1'), ' ')
    await press(document, 'ArrowDown')
    aside = <Zone zid="S" />
    await act(async () => root.render(<Board />))
    await press(document, ' ')
    await settle()
    expect(onMove).toHaveBeenCalledExactlyOnceWith('a1', null)
  })

  it('the spec names a step when it declares step', async () => {
    View = Lines
    lineSpec = { step: (slot) => ({ part: 'into', id: slot }) }
    await mount()
    await act(async () => item('r1').focus())
    await press(item('r1'), ' ')
    await press(document, 'ArrowDown')
    expect(spoken().at(-1)).toBe('Into r3.')
    pressEscape()
  })

  it('Enter on a focused row calls its open', async () => {
    View = Lines
    const open = vi.fn()
    rowOpts = { r1: { open } }
    await mount()
    await act(async () => item('r1').focus())
    expect((await press(item('r1'), 'Enter')).defaultPrevented).toBe(true)
    expect(open).toHaveBeenCalledOnce()
    expect(spoken()).toEqual([])
  })

  it('a held Enter opens a row once, not on its repeats', async () => {
    View = Lines
    const open = vi.fn()
    rowOpts = { r1: { open } }
    await mount()
    await act(async () => item('r1').focus())
    await press(item('r1'), 'Enter', { repeat: true })
    expect(open).not.toHaveBeenCalled()
  })

  it('a keyboard drop whose row leaves the list hands focus to the list', async () => {
    View = Lines
    commit.mockImplementation((id) => {
      lineRows = ROWS.filter((x) => x !== id)
      root.render(<View />)
    })
    await mount()
    await act(async () => item('r1').focus())
    await press(item('r1'), ' ')
    await press(document, 'ArrowDown')
    await press(document, ' ')
    await settle()
    expect(commit).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(item('r2'))
  })

  it('keeps the chip inside the viewport, measuring it once at lift', async () => {
    View = Lines
    await mount()
    const width = Object.getOwnPropertyDescriptor(window, 'innerWidth')
    Object.defineProperty(window, 'innerWidth', { value: 300, configurable: true })
    const measure = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ top: 0, bottom: 20, left: 0, right: 80, width: 80, height: 20 } as DOMRect)
    await act(async () => {
      firePointer(item('r1'), 'pointerdown', { x: 100, y: 15 })
    })
    await move(200, 70)
    const chrome = document.querySelector('.drag-ghost')?.parentElement as HTMLElement
    const reads = measure.mock.calls.length
    await move(290, 70)
    await move(295, 60)
    expect(measure.mock.calls.length).toBe(reads)
    expect(chrome.style.transform).toBe('translate3d(120.0px, 45.0px, 0)')
    pressEscape()
    measure.mockRestore()
    if (width) Object.defineProperty(window, 'innerWidth', width)
  })

  it('a row-element reader never re-renders on a slot change', async () => {
    View = Lines
    await mount()
    renders.clear()
    await dragHold('r1', 100, 70)
    await move(100, 88)
    await move(100, 50)
    await release(100, 50)
    expect(commit).toHaveBeenCalledOnce()
    expect(renders.get('reader')).toBeUndefined()
  })
})
