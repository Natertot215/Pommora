// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { pushUndo, resetUndo } from '../Session/undo'
import { ok } from '@pommora/core/Contract/result'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

const cmdZ = (target: EventTarget): boolean => {
  const e = new KeyboardEvent('keydown', {
    key: 'z',
    metaKey: true,
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(e)
  return e.defaultPrevented
}

beforeEach(async () => {
  resetUndo()
  ;(window as unknown as { nexus: unknown }).nexus = {
    ask: async () => ok(null),
    tell: () => {},
    on: () => () => {},
  }
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root.render(createElement(App)))
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('the value-undo chord', () => {
  it('reverts the newest value change and takes the keypress', () => {
    const revert = vi.fn(() => true)
    pushUndo(revert)
    expect(cmdZ(document.body)).toBe(true)
    expect(revert).toHaveBeenCalledOnce()
  })

  it('leaves a keypress inside the editor to the editor', () => {
    const revert = vi.fn(() => true)
    pushUndo(revert)
    const editor = document.createElement('div')
    editor.className = 'cm-editor'
    document.body.append(editor)
    expect(cmdZ(editor)).toBe(false)
    expect(revert).not.toHaveBeenCalled()
    editor.remove()
  })
})
