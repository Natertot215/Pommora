// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubEditorBridge } from '../../Testing/editorHarness'
import { makeTree } from '../../Testing/testTree'
import { useSession } from '../../Session/store'
import { ValuePickPresenter } from './ValuePickPresenter'
stubEditorBridge()

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  useSession.setState({ pendingPick: null })
})

describe('a Link value picked from the page menu', () => {
  it('commits a page link through the index, under the page’s own title', () => {
    const commit = vi.fn()
    useSession.setState({ tree: makeTree() })
    act(() =>
      useSession.getState().requestPick({
        def: { id: 'prop_l', name: 'Site', type: 'link' },
        current: { kind: 'null' },
        trigger: host,
        commit,
      }),
    )
    act(() => root.render(<ValuePickPresenter />))
    const input = document.querySelector(
      '[data-picker-portal]:not([data-dismissal-shield]) input',
    ) as HTMLInputElement
    act(() => {
      input.value = '[[alpha]]'
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(input.getAttribute('aria-invalid')).toBe('false')
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(commit).toHaveBeenCalledWith({ kind: 'link', value: '[[Alpha]]' })
  })
})
