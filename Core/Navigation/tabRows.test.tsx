// @vitest-environment jsdom
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest'
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { carries, DragGroup, SortableZone, useDragItem } from '@pommora/uix/Interactions/drag'
import { DEFAULT_FEEL } from '@pommora/uix/Animations/feel'
import { SETTLE_FALLBACK } from '@pommora/uix/Interactions/shared'
import { firePointer, stubPointerCapture, stubRect } from '@pommora/uix/Testing/pointerHarness'
import { isWindowTarget, type SelectTarget, TAB_FAMILY, type TabTarget } from './navRef'
import { TabStripZone, useTabClose } from './tabRows'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
stubPointerCapture()

const TARGETS: Record<string, TabTarget> = {
  page: { kind: 'page', id: 'p1', path: 'Notes/A.md' },
  space: { kind: 'space', id: 's1' },
  set: { kind: 'set', id: 'st1', path: 'Notes/Set' },
  collection: { kind: 'collection', id: 'c1' },
  newtab: { kind: 'newtab' },
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function Tab({ id }: { id: string }): React.JSX.Element {
  const { setNodeRef, style, handle } = useDragItem(id)
  return <div ref={setNodeRef} data-id={id} style={style} {...handle} />
}

const selectable = (t: TabTarget): SelectTarget | null => (t.kind === 'newtab' ? null : t)

const MAIN = ['page', 'space', 'collection']
const WINDOW = ['w1', 'w2']

describe('the tab strips', () => {
  const open = vi.fn<(target: SelectTarget, index: number) => void>()

  const mount = async (): Promise<void> => {
    open.mockClear()
    await act(async () =>
      root.render(
        <DragGroup>
          <TabStripZone
            items={MAIN}
            label={(id) => id}
            forced={false}
            targetOf={(id) => TARGETS[id]}
            open={open}
          >
            {MAIN.map((id) => (
              <Tab key={id} id={id} />
            ))}
          </TabStripZone>
          <TabStripZone
            items={WINDOW}
            label={(id) => id}
            forced={false}
            targetOf={() => undefined}
            accepts={isWindowTarget}
            open={open}
          >
            {WINDOW.map((id) => (
              <Tab key={id} id={id} />
            ))}
          </TabStripZone>
        </DragGroup>,
      ),
    )
    const [main, win] = container.querySelectorAll('.tab-strip')
    stubRect(main, { top: 0, bottom: 100, left: 0, right: 400 })
    stubRect(win, { top: 300, bottom: 400, left: 0, right: 400 })
    MAIN.forEach((id, i) => {
      stubRect(item(id), { top: 0, bottom: 100, left: i * 100, right: i * 100 + 100 })
    })
    WINDOW.forEach((id, i) => {
      stubRect(item(id), { top: 300, bottom: 400, left: i * 100, right: i * 100 + 100 })
    })
  }

  const item = (id: string): HTMLElement =>
    container.querySelector(`[data-id="${id}"]`) as HTMLElement

  const carryTo = async (id: string, x: number, y: number): Promise<void> => {
    const r = item(id).getBoundingClientRect()
    await act(async () => {
      firePointer(item(id), 'pointerdown', { x: r.left + 50, y: r.top + 50 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x, y })
    })
    await act(async () => {
      firePointer(window, 'pointerup', { x, y })
    })
    await act(async () => {
      await new Promise((res) => setTimeout(res, DEFAULT_FEEL.duration + SETTLE_FALLBACK + 20))
    })
  }

  it('carries a page tab to the other row and opens it at the slot', async () => {
    await mount()
    await carryTo('page', 20, 350)
    expect(open).toHaveBeenCalledExactlyOnceWith(TARGETS.page, 0)
  })

  it('the window row accepts only a page or a Space', async () => {
    for (const kind of ['page', 'space', 'set', 'collection']) {
      open.mockClear()
      await act(async () =>
        root.render(
          <DragGroup>
            <SortableZone
              className="source"
              items={['src']}
              label={(id) => id}
              family={TAB_FAMILY}
              carry={[carries(TAB_FAMILY, () => selectable(TARGETS[kind]))]}
            >
              <Tab id="src" />
            </SortableZone>
            <TabStripZone
              items={WINDOW}
              label={(id) => id}
              forced={false}
              targetOf={() => undefined}
              accepts={isWindowTarget}
              open={open}
            >
              {WINDOW.map((id) => (
                <Tab key={id} id={id} />
              ))}
            </TabStripZone>
          </DragGroup>,
        ),
      )
      stubRect(container.querySelector('.source') as Element, {
        top: 0,
        bottom: 100,
        left: 0,
        right: 400,
      })
      stubRect(container.querySelector('.tab-strip') as Element, {
        top: 300,
        bottom: 400,
        left: 0,
        right: 400,
      })
      stubRect(item('src'), { top: 0, bottom: 100, left: 0, right: 100 })
      WINDOW.forEach((id, i) => {
        stubRect(item(id), { top: 300, bottom: 400, left: i * 100, right: i * 100 + 100 })
      })
      await carryTo('src', 20, 350)
      if (kind === 'page' || kind === 'space')
        expect(open).toHaveBeenCalledExactlyOnceWith(TARGETS[kind], 0)
      else expect(open).not.toHaveBeenCalled()
    }
  })

  it('holds the strip still through its own reorder, so the moved tab never replays its entrance', async () => {
    function Strip(): React.JSX.Element {
      const [order, setOrder] = useState(MAIN)
      return (
        <DragGroup>
          <TabStripZone
            items={order}
            label={(id) => id}
            forced={false}
            targetOf={(id) => TARGETS[id]}
            open={open}
            onMove={() => setOrder((o) => [...o.slice(1), o[0]])}
          >
            {order.map((id) => (
              <Tab key={id} id={id} />
            ))}
          </TabStripZone>
        </DragGroup>
      )
    }
    await act(async () => root.render(<Strip />))
    stubRect(container.querySelector('.tab-strip') as Element, {
      top: 0,
      bottom: 100,
      left: 0,
      right: 400,
    })
    MAIN.forEach((id, i) => {
      stubRect(item(id), { top: 0, bottom: 100, left: i * 100, right: i * 100 + 100 })
    })
    const r = item('page').getBoundingClientRect()
    await act(async () => {
      firePointer(item('page'), 'pointerdown', { x: r.left + 50, y: r.top + 50 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 290, y: 50 })
    })
    await act(async () => {
      firePointer(window, 'pointerup', { x: 290, y: 50 })
    })
    expect(container.querySelector('.tab-strip')?.classList.contains('is-still')).toBe(true)
  })

  it('a tab with no window target stays on its row', async () => {
    await mount()
    await carryTo('collection', 20, 350)
    expect(open).not.toHaveBeenCalled()
  })
})

describe('the tab close', () => {
  const seamsAfterClose = (ids: string[], closing: string): (boolean | null)[] => {
    let seams: (boolean | null)[] = []
    let requestClose: (id: string) => void = () => {}
    function Strip(): null {
      const [entries, setEntries] = useState(() => ids.map((id) => ({ tab: { id } })))
      const close = useTabClose(entries, (id) =>
        setEntries((all) => all.filter((e) => e.tab.id !== id)),
      )
      seams = close.renderEntries.map((e) => e.seam)
      requestClose = close.requestClose
      return null
    }
    act(() => root.render(createElement(Strip)))
    act(() => requestClose(closing))
    return seams
  }

  it('closes the closing tab’s separator, and the next one’s once that tab leads the strip', () => {
    expect(seamsAfterClose(['a', 'b', 'c'], 'a')).toEqual([null, true, false])
  })

  it('keeps the separator after a leading tab that never closes', () => {
    expect(seamsAfterClose(['map', 'a', 'b'], 'a')).toEqual([null, true, false])
  })
})
