// @vitest-environment jsdom
import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InputField } from '@renderer/DesignSystem/Fields'
import { markPickerOpen, useDismiss } from './useDismiss'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function Host({ onClose }: { onClose: () => void }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, onClose, true)
  return (
    <div ref={ref}>
      <InputField edit={{ value: 'Status', onCommit: () => {}, renames: 'row' }}>Status</InputField>
    </div>
  )
}

const pressEscape = (target: EventTarget): void => {
  act(() => {
    // Cancelable, as a real keydown is — preventDefault is a no-op otherwise, and the whole
    // contract under test is who marks the press handled.
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    )
  })
}
const openCaret = (): HTMLInputElement => {
  act(() => host.querySelector<HTMLElement>('[role="button"]')?.click())
  const input = host.querySelector('input')
  if (!input) throw new Error('no caret opened')
  return input
}

describe('useDismiss', () => {
  it('closes the host on Escape', () => {
    const onClose = vi.fn()
    act(() => root.render(<Host onClose={onClose} />))
    pressEscape(document)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('leaves the host open when a field inside it takes the Escape', () => {
    const onClose = vi.fn()
    act(() => root.render(<Host onClose={onClose} />))
    pressEscape(openCaret())
    expect(onClose).not.toHaveBeenCalled()
  })

  it('leaves the host open while a picker owns the Escape', () => {
    const onClose = vi.fn()
    act(() => root.render(<Host onClose={onClose} />))
    const release = markPickerOpen()
    pressEscape(document)
    release()
    expect(onClose).not.toHaveBeenCalled()
  })
})
