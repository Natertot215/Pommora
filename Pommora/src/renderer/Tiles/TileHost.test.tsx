// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { stubEditorBridge } from '@renderer/Testing/editorHarness'
import { TileHost } from './TileHost'

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe(): void {}
    disconnect(): void {}
  },
)

const doc = {
  layout: {
    bands: ['m', 'p', 'v', 'w'].map((id) => ({ node: { kind: 'tile', id, h: 100 } })),
  },
  blocks: [
    { id: 'm', type: 'markdown' },
    { id: 'p', type: 'page', page_id: 'gone' },
    { id: 'v', type: 'view', views: [{ source_id: 's' }] },
    { id: 'w', type: 'widget' },
  ],
  locked: false,
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  stubEditorBridge({
    tiles: {
      get: async () => ({ ok: true, value: doc }),
      save: async () => ({ ok: true, value: null }),
      readMarkdown: async () => ({ ok: true, value: { body: 'hello' } }),
      writeMarkdown: async () => ({ ok: true, value: null }),
    },
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

async function until(cond: () => boolean): Promise<boolean> {
  const deadline = Date.now() + 2000
  while (!cond() && Date.now() < deadline) await new Promise((r) => setTimeout(r, 5))
  return cond()
}

describe('the host over the renderer table', () => {
  it('mounts one surface per known kind and holds space for the rest', async () => {
    await act(async () => root.render(<TileHost host={{ kind: 'homepage' }} />))
    expect(await until(() => host.querySelectorAll('.tile').length === 4)).toBe(true)
    expect(await until(() => host.querySelector('.cm-editor') !== null)).toBe(true)
    // With no tree mounted, the page and view references resolve to nothing; the foreign kind never does.
    expect(host.querySelectorAll('.tile-inert')).toHaveLength(3)
  })
})
