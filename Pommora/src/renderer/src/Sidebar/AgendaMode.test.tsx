// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { AgendaEntry } from '@shared/types'
import { AgendaMode } from './AgendaMode'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

async function mount(tasks: AgendaEntry[], events: AgendaEntry[]): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<AgendaMode tasks={tasks} events={events} />)
  })
}

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('AgendaMode', () => {
  it('renders tasks then events from its props', async () => {
    await mount(
      [{ id: 't1', title: 'Buy milk', kind: 'task' }],
      [{ id: 'e1', title: 'Standup', kind: 'event' }],
    )
    const text = host.textContent ?? ''
    expect(text).toContain('Buy milk')
    expect(text).toContain('Standup')
  })

  it('shows the empty state when there are none', async () => {
    await mount([], [])
    expect(host.textContent).toContain('No tasks or events')
  })

  // The sidebar's mode-exit overlay mounts a SECOND copy of the outgoing layer. A component that
  // fetched its own list would render that copy empty, painting the empty state over the list it is
  // meant to be animating away — so this one must render with no IPC reachable at all.
  it('renders without touching the IPC, so a second mount shows the same list', async () => {
    ;(globalThis as { nexus?: unknown }).nexus = undefined
    await mount([{ id: 't1', title: 'Buy milk', kind: 'task' }], [])
    expect(host.textContent).toContain('Buy milk')
  })
})
