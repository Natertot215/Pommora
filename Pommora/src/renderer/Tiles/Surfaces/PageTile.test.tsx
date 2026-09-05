// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { bumpBodyEpoch, cachePageDetail, clearCache } from '@renderer/Store/tabState'

vi.mock('@renderer/MarkdownPM', () => ({
  MarkdownEditor: (p: { initialBody: string }) => {
    const [body] = useState(p.initialBody)
    return createElement('div', { className: 'stub-editor' }, body)
  },
}))
vi.mock('@renderer/Interface/pageFlush', () => ({
  flushPageSave: vi.fn(async () => undefined),
  schedulePageSave: vi.fn(),
}))

import { PageTile } from './PageTile'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root
const detail = (body: string) => ({
  id: 'a',
  title: 'A',
  path: 'Notes/a.md',
  frontmatter: {},
  body,
})

beforeEach(() => {
  clearCache()
  ;(window as unknown as { nexus: unknown }).nexus = {
    openPage: vi.fn(async () => ({ ok: true, value: detail('fetched') })),
  }
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
    cachePageDetail(detail('before'))
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
      cachePageDetail(detail('RESTORED'))
      bumpBodyEpoch('Notes/a.md')
    })
    expect(container.querySelector('.stub-editor')?.textContent).toBe('RESTORED')
  })
})
