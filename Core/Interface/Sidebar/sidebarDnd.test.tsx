// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { MutateRequest } from '@pommora/core/Nexus/mutateRequest'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import {
  firePointer,
  pressEscape,
  stubPointerCapture,
  stubRect,
} from '@pommora/uix/Interactions/pointerHarness'
import { DISCLOSURE_INDENT } from '@pommora/uix/Theme/theme-vars.css'
import { SidebarDnd, useSidebarDrag } from './sidebarDnd'
import { buildIndex } from './sidebarDndModel'
import { useSession } from '../../Session/store'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

stubPointerCapture()

const tree = {
  pageMetadata: {},
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
  personalization: { defaultIcons: {} },
} as unknown as NexusTree

function Row({ id }: { id: string }): React.JSX.Element {
  const { ref, handle } = useSidebarDrag(id)
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
    // The rows scroll down: p2's fresh span sits below the pointer, so the fresh slot is a no-op while the stale rects would still commit the after-p2 reorder.
    const p2 = host.querySelector('[data-row="p2"]')
    if (p2) stubRect(p2, { top: 72, bottom: 96 })
    await act(async () => {
      const content = row('p1').parentElement as HTMLElement
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

// MenuItem's base inset is 8px, and each depth adds one disclosure step.
const indentAt = (depth: number): string => `${8 + depth * DISCLOSURE_INDENT}px`

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
    const personalization = useSession.getState().personalization
    useSession.setState({
      personalization: { ...personalization, setPlacement: 'top', subSetPlacement: 'bottom' },
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
    useSession.setState({ personalization })
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith(
      { op: 'movePage', path: 'C/S/P1.md', newParentPath: 'C/S', order: ['p2', 'p1'] },
      'p1',
    )
  })
})
