// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { CollectionNode } from '@pommora/core/Nexus/tree'
import { GHOST_DWELL_MS } from '@pommora/uix/Interactions/ghostCreate'
import { ID_KEY } from '@pommora/core/Nexus/identityMark'
import { useSession } from '../../Session/store'
import { installViewEnvironment, renderView } from '../../Testing/viewHarness'
import { valuesReply } from '../../Testing/pageValues'
import { stubDialer } from '../../vitest.setup'

installViewEnvironment()

const source = (): CollectionNode =>
  ({
    kind: 'collection',
    id: 'col1',
    title: 'Col',
    path: 'Col',
    sets: [],
    pages: [
      { kind: 'page', id: 'p1', title: 'One', path: 'Col/One.md' },
      { kind: 'page', id: 'p2', title: 'Two', path: 'Col/Two.md' },
    ],
    properties: [],
    views: [
      {
        id: 'view_1',
        name: 'Cards',
        type: 'cards',
        property_order: ['_title'],
        hidden_properties: [],
        group: { kind: 'structural' },
      },
    ],
  }) as unknown as CollectionNode

const VALUES = valuesReply({ p1: { [ID_KEY]: 'p1' }, p2: { [ID_KEY]: 'p2' } })

let host: HTMLDivElement
let root: Root
let mutateSpy: ReturnType<typeof vi.fn>
let renameSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  mutateSpy = vi.fn(async (req: { op: string }, onCreated?: (c: unknown) => void) => {
    if (req.op === 'createPage') onCreated?.({ id: 'p3', path: 'Col/Untitled.md' })
    return true
  })
  renameSpy = vi.fn()
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'view:loadValues': async () => VALUES,
    'views:save': async () => ({ ok: true, value: { id: 'view_1' } }),
    menu: async () => ({ ok: true, value: null }),
  })
  useSession.setState({
    tree: { collections: [], contexts: [], personalization: {}, nexus: { id: 'nx' } } as never,
    selection: { kind: 'none' } as never,
    renamingPath: null,
    mutate: mutateSpy as never,
    select: vi.fn(async () => {}) as never,
    beginRename: renameSpy as never,
  })
})
afterEach(() => {
  vi.useRealTimers()
  act(() => root.unmount())
  host.remove()
})

const card = (id: string): HTMLElement => host.querySelector(`[data-rid="${id}"]`) as HTMLElement
const ghost = (): HTMLElement | null => host.querySelector('.ghost-card')

// React derives enter/leave from pointerover/pointerout plus relatedTarget — a native pointerenter reaches nothing.
const hover = (el: HTMLElement, entering: boolean): void => {
  el.dispatchEvent(
    new MouseEvent(entering ? 'pointerover' : 'pointerout', {
      bubbles: true,
      relatedTarget: document.body,
    }),
  )
}
const tick = async (ms: number): Promise<void> => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

const dwellOn = async (id: string): Promise<void> => {
  await renderView(root, source())
  vi.useFakeTimers()
  await act(async () => {
    hover(card(id), true)
  })
  await tick(GHOST_DWELL_MS)
}

describe('the cards ghost — dwell, create, and exit', () => {
  it('a dwell over a card mounts the ghost beside it', async () => {
    await dwellOn('p1')
    expect(ghost()).toBeTruthy()
  })

  it('clicking the ghost creates a page below its anchor and opens the rename', async () => {
    await dwellOn('p1')
    await act(async () => {
      ghost()?.click()
    })
    expect(mutateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        op: 'createPage',
        parentPath: 'Col',
        order: ['p1', '$new-page', 'p2'],
      }),
      expect.any(Function),
    )
    expect(renameSpy).toHaveBeenCalledWith('Col/Untitled.md', true, 'detail')
  })

  it('leaving the card past the grace closes the ghost out', async () => {
    await dwellOn('p1')
    await act(async () => {
      hover(card('p1'), false)
    })
    // The ghost owns the only armed timers here: its grace, then its exit beat.
    await act(async () => {
      vi.runAllTimers()
    })
    expect(ghost()).toBeNull()
  })
})
