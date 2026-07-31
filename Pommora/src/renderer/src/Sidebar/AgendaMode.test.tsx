// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { AgendaMode } from './AgendaMode'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

async function mount(): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<AgendaMode />)
  })
}

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('AgendaMode', () => {
  it('renders the empty state', async () => {
    await mount()
    expect(host.textContent).toContain('No tasks or events')
  })

  // The sidebar's mode-exit overlay mounts a SECOND copy of the outgoing layer, so the mode must
  // stay renderable with no IPC reachable at all.
  it('renders without touching the IPC', async () => {
    ;(globalThis as { nexus?: unknown }).nexus = undefined
    await mount()
    expect(host.textContent).toContain('No tasks or events')
  })
})
