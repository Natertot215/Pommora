// The jsdom seat every view suite mounts through: the act environment, the ResizeObserver jsdom lacks, pointer capture, and one render-and-flush of the real ViewHost.

import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, vi } from 'vitest'
import type { CollectionNode } from '../Nexus/tree'
import type { PropertyDefinition } from '../Properties/properties'
import { DragGroup } from '@pommora/uix/Interactions/drag'
import { stubPointerCapture } from '@pommora/uix/Utilities/pointerHarness'
import { ViewHost } from '../Views/Host/ViewHost'
import { useSession } from '../Session/store'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

/** Once per suite, at module scope: the jsdom seat, then a fresh host and root before every test, unmounted and removed after it. jsdom ships no `CSS.escape`, which the ghost's id-scoped queries call. */
export function mountEachTest(onMount: (host: HTMLDivElement, root: Root) => void): void {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
  ;(globalThis as { CSS?: unknown }).CSS ??= { escape: (s: string) => s }
  stubPointerCapture()
  let host: HTMLDivElement
  let root: Root
  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    onMount(host, root)
  })
  afterEach(() => {
    vi.useRealTimers()
    act(() => root.unmount())
    host.remove()
  })
}

export async function renderView(
  root: Root,
  source: CollectionNode,
  beside?: ReactNode,
): Promise<void> {
  await act(async () => {
    const { tree } = useSession.getState()
    if (tree) useSession.setState({ tree: { ...tree, collections: [source] } })
    root.render(
      <DragGroup>
        {beside}
        <ViewHost source={source} />
      </DragGroup>,
    )
  })
  await act(async () => {})
}

/** Lets a timer-gated commit land — a drop's settle, the one-tick click swallower after a drag. */
export const settle = (ms = 1): Promise<void> =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })

/** The two-group Status property the card suites group and reassign across. */
export const STATUS_DEF: PropertyDefinition = {
  id: 'prop_status',
  name: 'Status',
  type: 'status',
  status_groups: [
    {
      id: 'in_progress',
      label: 'In Progress',
      color: 'blue',
      options: [{ value: 'Active', color: 'blue', group_id: 'in_progress' }],
    },
    {
      id: 'done',
      label: 'Done',
      color: 'green',
      options: [{ value: 'Complete', color: 'green', group_id: 'done' }],
    },
  ],
}
