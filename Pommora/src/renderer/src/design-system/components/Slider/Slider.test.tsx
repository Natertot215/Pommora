// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { firePointer, stubPointerCapture, stubRect } from '@renderer/testing/pointerHarness'
import { Slider } from './Slider'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

stubPointerCapture()
// jsdom lacks ResizeObserver, which the knob's glass segment observes; a no-op stub is enough.
if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

let host: HTMLDivElement
let root: Root
let onCommit: ReturnType<typeof vi.fn<(v: number) => void>>
let onInput: ReturnType<typeof vi.fn<(v: number) => void>>

beforeEach(async () => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  onCommit = vi.fn()
  onInput = vi.fn()
  await act(async () => {
    root.render(
      <Slider
        value={1}
        min={0}
        max={2}
        step={0.5}
        ariaLabel="S"
        onCommit={onCommit}
        onInput={onInput}
      />,
    )
  })
  const strip = host.querySelector('[role="slider"]')
  if (strip) stubRect(strip, { top: 0, bottom: 20, left: 0, right: 200 })
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const strip = (): HTMLElement => host.querySelector('[role="slider"]') as HTMLElement

describe('slider scrub', () => {
  it('a release commits the draft', async () => {
    await act(async () => {
      firePointer(strip(), 'pointerdown', { x: 150, y: 10 })
    })
    await act(async () => {
      firePointer(strip(), 'pointerup', { x: 150, y: 10 })
    })
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(1.5)
  })

  it('a cancel reverts: the committed value is reasserted through onInput and nothing commits', async () => {
    await act(async () => {
      firePointer(strip(), 'pointerdown', { x: 150, y: 10 })
    })
    expect(onInput).toHaveBeenLastCalledWith(1.5)
    await act(async () => {
      firePointer(strip(), 'pointercancel', { x: 150, y: 10 })
    })
    expect(onInput).toHaveBeenLastCalledWith(1)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('an unmount mid-scrub reasserts the committed value', async () => {
    await act(async () => {
      firePointer(strip(), 'pointerdown', { x: 150, y: 10 })
    })
    await act(async () => root.unmount())
    expect(onInput).toHaveBeenLastCalledWith(1)
    expect(onCommit).not.toHaveBeenCalled()
  })
})
