// @vitest-environment jsdom
import { detail } from '@pommora/core/Testing/fixtures'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { bumpBodyEpoch, cachePageDetail, clearCache } from '../../Session/pageDetailCache'

vi.mock('../../MarkdownPM/MarkdownEditor', () => ({
  MarkdownEditor: (p: { initialBody: string }) => {
    const [body] = useState(p.initialBody)
    return createElement('div', { className: 'stub-editor' }, body)
  },
}))
vi.mock('../../Session/saveScheduler', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../Session/saveScheduler')>()),
  flushPageSave: vi.fn(async () => undefined),
  schedulePageSave: vi.fn(),
}))

import { PageTile } from './PageTile'
import { stubDialer } from '../../vitest.setup'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  clearCache()
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'page:open': vi.fn(async () => ({
      ok: true,
      value: detail({ path: 'Notes/a.md', body: 'fetched' }),
    })),
    'headingIcon:get': vi.fn(async () => ({ ok: true, value: {} })),
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

describe('PageTile re-seeds on a body epoch', () => {
  it('shows the fresh slot body in the same commit as its new key, ignoring the warm doc', async () => {
    cachePageDetail(detail({ path: 'Notes/a.md', body: 'before' }))
    const warm = {
      restore: () => ({ editorState: { doc: 'before' }, scrollTop: 0 }),
      capture: () => {},
    }
    await act(async () => {
      root.render(
        createElement(PageTile, {
          path: 'Notes/a.md',
          editing: false,
          onBeginEdit: () => {},
          warm,
        }),
      )
    })
    expect(container.querySelector('.stub-editor')?.textContent).toBe('before')
    await act(async () => {
      cachePageDetail(detail({ path: 'Notes/a.md', body: 'RESTORED' }))
      bumpBodyEpoch('Notes/a.md')
    })
    expect(container.querySelector('.stub-editor')?.textContent).toBe('RESTORED')
  })
})

describe('the window rung', () => {
  const mount = (chrome: 'none' | 'window', frontmatter: Record<string, unknown>) =>
    act(async () => {
      cachePageDetail(detail({ path: 'Notes/a.md', body: 'plain', frontmatter }))
      root.render(
        createElement(PageTile, {
          path: 'Notes/a.md',
          editing: false,
          onBeginEdit: () => {},
          chrome,
        }),
      )
    })

  it('draws the bare tile with no rung, banner or not', async () => {
    await mount('none', { banner: 'cover.png' })
    expect(container.querySelector('.page-tile')?.outerHTML).toMatchInlineSnapshot(
      `"<div class="page-tile" style="--page-detail-scale: 0.9; --editor-scale: 1;"><div class="stub-editor">plain</div></div>"`,
    )
  })

  it('draws a header for a windowed page with a banner, and none without', async () => {
    await mount('window', {})
    expect(container.querySelector('.page-tile.is-window-chrome')).not.toBeNull()
    expect(container.querySelector('.mdpm-header')).toBeNull()
  })
})
