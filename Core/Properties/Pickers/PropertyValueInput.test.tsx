// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubEditorBridge } from '../../Testing/editorHarness'
import { makeTree } from '../../Testing/testTree'
import { useSession } from '../../Session/store'
import type { PropertyType } from '../properties'
import { buildPageIndex } from '../../Connections/pageIndex'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { PropertyValueInput } from './PropertyValueInput'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
const onCommit = vi.fn()
const onClose = vi.fn()

beforeEach(() => {
  onCommit.mockClear()
  onClose.mockClear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() =>
    root.render(
      <PropertyValueInput
        def={{ id: 'prop_n', name: 'Count', type: 'number' }}
        current={{ kind: 'number', value: 42 }}
        onCommit={onCommit}
        onClose={onClose}
      />,
    ),
  )
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const input = (): HTMLInputElement => host.querySelector('input') as HTMLInputElement
const typeInto = (text: string): void =>
  act(() => {
    input().value = text
    input().dispatchEvent(new Event('input', { bubbles: true }))
  })
const enter = (): void =>
  act(() => {
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })

describe('PropertyValueInput', () => {
  it('commits the parsed value of changed text and closes', () => {
    expect(input().value).toBe('42')
    typeInto('43.5')
    enter()
    expect(onClose).toHaveBeenCalledOnce()
    expect(onCommit).toHaveBeenCalledWith({ kind: 'number', value: 43.5 })
  })

  it('closes without a commit when the text is unchanged', () => {
    act(() => input().blur())
    expect(onClose).toHaveBeenCalledOnce()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('shows a non-number dimmed and refuses it', () => {
    typeInto('42a')
    expect(input().getAttribute('aria-invalid')).toBe('true')
    enter()
    expect(onClose).toHaveBeenCalledOnce()
    expect(onCommit).not.toHaveBeenCalled()
  })
})

describe('the popover routes', () => {
  if (!('ResizeObserver' in globalThis))
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
  stubEditorBridge()

  const popoverFor = (type: PropertyType): Element => {
    useSession.setState({ tree: makeTree() })
    act(() =>
      root.render(
        <PropertyValueInput
          def={{ id: 'prop_t', name: 'Notes', type }}
          current={null}
          popover={{ open: true, triggerRef: { current: host } }}
          onCommit={onCommit}
          onClose={onClose}
        />,
      ),
    )
    return document.querySelector('[data-picker-portal]:not([data-dismissal-shield])')!
  }
  it('opens TextPane for a Text value and the single-line popover for the rest', () => {
    const text = popoverFor('text')
    expect(text.querySelector('.text-pane .cm-editor')).not.toBeNull()
    expect(text.querySelector('input')).toBeNull()
    act(() => root.render(null))
    expect(popoverFor('link').querySelector('input')).not.toBeNull()
  })
})

describe('Edit Link reads the index at the gesture', () => {
  const holder = { id: 'h', title: 'Holder', path: 'Holder.md' }
  const conn: ConnectionsApi = {
    ...buildPageIndex([
      holder,
      { id: 'd1', title: 'Dup', path: 'A/Dup.md' },
      { id: 'd2', title: 'Dup', path: 'B/Dup.md' },
    ]),
    headingsOf: () => undefined,
    location: () => [],
    open: () => {},
  }
  const mountLink = (onPage: boolean): void =>
    act(() =>
      root.render(
        <PropertyValueInput
          def={{ id: 'prop_l', name: 'Site', type: 'link' }}
          current={null}
          connections={() => conn}
          {...(onPage ? { holder } : {})}
          onCommit={onCommit}
          onClose={onClose}
        />,
      ),
    )

  it('commits a bare heading on a page, and marks it invalid on a Space', () => {
    mountLink(true)
    typeInto('[[#Setup]]')
    enter()
    expect(onCommit).toHaveBeenCalledWith({ kind: 'link', value: '[[#Setup]]' })
    mountLink(false)
    typeInto('[[#Setup]]')
    expect(input().getAttribute('aria-invalid')).toBe('true')
  })

  it('marks a title two pages share invalid', () => {
    mountLink(true)
    typeInto('[[Dup]]')
    expect(input().getAttribute('aria-invalid')).toBe('true')
  })
})
