// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { MutateRequest } from '../../Nexus/mutateRequest'
import type { NexusTree } from '../../Nexus/tree'
import {
  firePointer,
  pressEscape,
  stubPointerCapture,
  stubRect,
} from '@pommora/uix/Testing/pointerHarness'
import { menuDropLine } from '@pommora/uix/Menus'
import { DragGroup, useLineRow, useLooseItem } from '@pommora/uix/Interactions/drag'
import { TAB_FAMILY } from '../../Navigation/tabRows'
import { SidebarDnd } from './sidebarDnd'
import { buildIndex } from './sidebarDndModel'
import { useSession } from '../../Session/store'
import { personalizationOf } from '../../Session/configSlice'
import { makeTree } from '../../Testing/testTree'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

stubPointerCapture()

const tree = {
  collections: [
    {
      kind: 'collection',
      id: 'c1',
      title: 'C',
      path: 'C',
      sets: [],
      pages: [
        { kind: 'page', id: 'p1', title: 'P1', path: 'C/P1.md' },
        { kind: 'page', id: 'p2', title: 'P2', path: 'C/P2.md' },
      ],
    },
  ],
  contexts: [],
  nexus: {},
  config: { pageMetadata: {}, personalization: { defaultIcons: {} } },
} as unknown as NexusTree

function Row({ id }: { id: string }): React.JSX.Element {
  const { ref, handle } = useLineRow(id)
  return <div ref={ref} data-row={id} {...handle} />
}

let host: HTMLDivElement
let root: Root
let commitSpy: ReturnType<typeof vi.fn<(commit: MutateRequest, id: string) => void>>

beforeEach(async () => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  commitSpy = vi.fn()
  await act(async () => {
    root.render(
      <SidebarDnd index={buildIndex(tree)} onCommit={commitSpy}>
        <Row id="p1" />
        <Row id="p2" />
      </SidebarDnd>,
    )
  })
  for (const [i, id] of ['p1', 'p2'].entries()) {
    const el = host.querySelector(`[data-row="${id}"]`)
    if (el) stubRect(el, { top: i * 24, bottom: i * 24 + 24 })
  }
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

const row = (id: string): HTMLElement => host.querySelector(`[data-row="${id}"]`) as HTMLElement
// Scoped to .drag-ghost — the a11y announce live region also carries the title text.
const ghost = (): boolean =>
  [...document.body.querySelectorAll<HTMLElement>('.drag-ghost')].some(
    (el) => el.textContent === 'P1',
  )

const startDrag = async (): Promise<void> => {
  await act(async () => {
    firePointer(row('p1'), 'pointerdown', { x: 4, y: 12 })
  })
  await act(async () => {
    firePointer(row('p1'), 'pointermove', { x: 4, y: 40 })
  })
}

function Loose(): React.JSX.Element {
  const target = useLooseItem(TAB_FAMILY)
  return <b data-loose={JSON.stringify(target)} />
}

describe('sidebar drag — carry', () => {
  it('carries a page row loose as its page target', async () => {
    await act(async () => {
      root.render(
        <DragGroup>
          <SidebarDnd index={buildIndex(tree)} onCommit={commitSpy}>
            <Row id="p1" />
            <Row id="p2" />
          </SidebarDnd>
          <Loose />
        </DragGroup>,
      )
    })
    stubRect(host.querySelector('.line-zone') as Element, { top: 0, bottom: 48, right: 200 })
    stubRect(row('p1'), { top: 0, bottom: 24 })
    stubRect(row('p2'), { top: 24, bottom: 48 })
    await act(async () => {
      firePointer(row('p1'), 'pointerdown', { x: 4, y: 12 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 600, y: 12 })
    })
    expect(
      JSON.parse(host.querySelector('[data-loose]')?.getAttribute('data-loose') ?? ''),
    ).toEqual({
      kind: 'page',
      id: 'p1',
      path: 'C/P1.md',
    })
    await act(async () => {
      pressEscape()
    })
  })
})

describe('sidebar drag — Esc abort', () => {
  it('clears the ghost + target and commits nothing on Escape', async () => {
    await startDrag()
    expect(ghost()).toBe(true)
    await act(async () => {
      pressEscape()
    })
    expect(ghost()).toBe(false)
    await act(async () => {
      firePointer(row('p1'), 'pointerup')
    })
    expect(commitSpy).not.toHaveBeenCalled()
  })

  it('is a no-op while idle and still commits a normal drop afterwards', async () => {
    await act(async () => {
      pressEscape()
    })
    await startDrag()
    await act(async () => {
      firePointer(row('p1'), 'pointerup')
    })
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith(
      {
        op: 'movePage',
        path: 'C/P1.md',
        newParentPath: 'C',
        order: ['p2', 'p1'],
      },
      'p1',
    )
  })

  it('detaches the keydown listener after the gesture settles', async () => {
    const adds = vi.spyOn(window, 'addEventListener')
    const removes = vi.spyOn(window, 'removeEventListener')
    await startDrag()
    await act(async () => {
      pressEscape()
    })
    const added = adds.mock.calls.filter(([t]) => t === 'keydown').length
    const removed = removes.mock.calls.filter(([t]) => t === 'keydown').length
    expect(added).toBeGreaterThan(0)
    expect(removed).toBe(added)
  })

  it('a scroll with the pointer held still re-aims, so a release without moving resolves fresh', async () => {
    await startDrag()
    const content = row('p1').parentElement as HTMLElement
    stubRect(content, { top: 48, bottom: 96 })
    stubRect(row('p1'), { top: 48, bottom: 72 })
    stubRect(row('p2'), { top: 72, bottom: 96 })
    await act(async () => {
      content.dispatchEvent(new Event('scroll', { bubbles: false }))
    })
    await act(async () => {
      firePointer(row('p1'), 'pointerup')
    })
    expect(commitSpy).not.toHaveBeenCalled()
  })

  // Identity, not counts — a leak that removes a DIFFERENT function than it added still passes a count-based assertion.
  it('an unmount mid-drag removes the exact window listeners it added', async () => {
    await startDrag()
    await act(async () => {
      firePointer(row('p1'), 'pointerup')
    })
    const adds = vi.spyOn(window, 'addEventListener')
    const removes = vi.spyOn(window, 'removeEventListener')
    await startDrag()
    await act(async () => root.unmount())
    const addedFns = adds.mock.calls.map(([type, fn]) => ({ type, fn }))
    const removedFns = removes.mock.calls.map(([, fn]) => fn)
    for (const { type, fn } of addedFns) {
      expect(removedFns, `leaked '${type}' listener`).toContain(fn)
    }
  })
})

const indentAt = (depth: number): string => `${menuDropLine({ edge: 0, depth }).left}px`

describe('sidebar drag — the line', () => {
  it("draws at the slot's edge in the content's own coordinates, indented to the slot's depth", async () => {
    const content = row('p1').parentElement as HTMLElement
    stubRect(content, { top: 10, bottom: 58 })
    stubRect(row('p1'), { top: 10, bottom: 34 })
    stubRect(row('p2'), { top: 34, bottom: 58 })
    await act(async () => firePointer(row('p1'), 'pointerdown', { x: 4, y: 22 }))
    await act(async () => firePointer(row('p1'), 'pointermove', { x: 4, y: 50 }))
    // After P2: its bottom (58) less the content's top (10).
    const line = host.querySelector<HTMLElement>('.drop-line')
    expect(line?.style.top).toBe('48px')
    expect(line?.style.left).toBe(indentAt(1))
  })
})

describe('sidebar drag — the stored Set placement', () => {
  it("reads a Set's Sets-below-pages from subSetPlacement, whatever setPlacement says", async () => {
    const held = useSession.getState()
    useSession.setState({
      tree: makeTree({
        personalization: {
          ...personalizationOf(held),
          setPlacement: 'top',
          subSetPlacement: 'bottom',
        },
      }),
    })
    const placedTree = {
      ...tree,
      collections: [
        {
          kind: 'collection',
          id: 'c1',
          title: 'C',
          path: 'C',
          pages: [],
          sets: [
            {
              kind: 'set',
              id: 's1',
              title: 'S',
              path: 'C/S',
              pages: [
                { kind: 'page', id: 'p1', title: 'P1', path: 'C/S/P1.md' },
                { kind: 'page', id: 'p2', title: 'P2', path: 'C/S/P2.md' },
              ],
              sets: [{ kind: 'set', id: 's2', title: 'T', path: 'C/S/T', pages: [] }],
            },
          ],
        },
      ],
    } as unknown as NexusTree
    await act(async () => {
      root.render(
        <SidebarDnd index={buildIndex(placedTree)} onCommit={commitSpy}>
          <Row id="p1" />
          <Row id="p2" />
          <Row id="s2" />
        </SidebarDnd>,
      )
    })
    for (const [i, id] of ['p1', 'p2', 's2'].entries())
      stubRect(row(id), { top: i * 24, bottom: i * 24 + 24 })
    // Grazing the sibling Set's top quarter: below the pages, so P1 joins the end of its group.
    await act(async () => firePointer(row('p1'), 'pointerdown', { x: 4, y: 12 }))
    await act(async () => firePointer(row('p1'), 'pointermove', { x: 4, y: 50 }))
    expect(host.querySelector<HTMLElement>('.drop-line')?.style.left).toBe(indentAt(2))
    await act(async () => firePointer(row('p1'), 'pointerup'))
    useSession.setState({ tree: held.tree })
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith(
      { op: 'movePage', path: 'C/S/P1.md', newParentPath: 'C/S', order: ['p2', 'p1'] },
      'p1',
    )
  })
})

describe('sidebar drag — keyboard focus after a remounting drop', () => {
  it('keeps focus on a page dropped Into a Set once the async move remounts its row', async () => {
    const nested = {
      ...tree,
      collections: [
        {
          kind: 'collection',
          id: 'c1',
          title: 'C',
          path: 'C',
          sets: [{ kind: 'set', id: 's1', title: 'S1', path: 'C/S1', sets: [], pages: [] }],
          pages: [{ kind: 'page', id: 'p1', title: 'P1', path: 'C/P1.md' }],
        },
      ],
    } as unknown as NexusTree
    let moved = false
    const view = (): React.JSX.Element => (
      <SidebarDnd
        index={buildIndex(nested)}
        onCommit={() => {
          window.setTimeout(() => {
            moved = true
            act(() => root.render(view()))
          }, 40)
        }}
      >
        <Row id="s1" />
        {moved ? (
          <section>
            <Row id="p1" />
          </section>
        ) : (
          <Row id="p1" />
        )}
      </SidebarDnd>
    )
    const draw = (): Promise<void> => act(async () => root.render(view()))
    await draw()
    stubRect(host.querySelector('.line-zone') as Element, { top: 0, bottom: 48 })
    stubRect(row('s1'), { top: 0, bottom: 24 })
    stubRect(row('p1'), { top: 24, bottom: 48 })
    const region = (): string =>
      document.querySelector('[role="status"][aria-live="assertive"]')?.textContent ?? ''
    await act(async () => row('p1').focus())
    const key = (el: EventTarget, k: string): Promise<void> =>
      act(async () => {
        el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
      })
    await key(row('p1'), ' ')
    for (let i = 0; i < 4 && !region().startsWith('Into'); i++) {
      await key(document, 'ArrowUp')
    }
    expect(region()).toBe('Into S1.')
    await key(document, ' ')
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    expect(moved).toBe(true)
    expect(document.activeElement).toBe(row('p1'))
  })
})
