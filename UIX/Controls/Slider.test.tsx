// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { firePointer, stubPointerCapture, stubRect } from '../Utilities/pointerHarness'
import { Slider } from './Slider'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

stubPointerCapture()
// jsdom lacks ResizeObserver, which the glass knob observes; a no-op stub is enough.
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

  it('measures the track once per scrub, and again only when a scroll moves it', async () => {
    const measure = vi.spyOn(strip(), 'getBoundingClientRect')
    await act(async () => {
      firePointer(strip(), 'pointerdown', { x: 150, y: 10 })
      firePointer(strip(), 'pointermove', { x: 100, y: 10 })
    })
    stubRect(strip(), { top: 0, bottom: 20, left: 100, right: 300 })
    await act(async () => {
      firePointer(strip(), 'pointermove', { x: 50, y: 10 })
    })
    expect(measure).toHaveBeenCalledTimes(1)
    expect(onInput).toHaveBeenLastCalledWith(0.5)
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
      firePointer(strip(), 'pointermove', { x: 150, y: 10 })
    })
    expect(onInput).toHaveBeenLastCalledWith(0.5)
    await act(async () => {
      firePointer(strip(), 'pointerup', { x: 150, y: 10 })
    })
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

describe('slider grid', () => {
  const renderRange = async (value: number, min: number, max: number, step: number) => {
    await act(async () => {
      root.render(
        <Slider
          value={value}
          min={min}
          max={max}
          step={step}
          ariaLabel="S"
          onCommit={onCommit}
          onInput={onInput}
        />,
      )
    })
    stubRect(strip(), { top: 0, bottom: 20, left: 0, right: 200 })
  }
  const scrubTo = async (x: number) => {
    await act(async () => {
      firePointer(strip(), 'pointerdown', { x, y: 10 })
    })
    await act(async () => {
      firePointer(strip(), 'pointerup', { x, y: 10 })
    })
  }

  it('counts its steps from the minimum, so an odd minimum is reachable', async () => {
    await renderRange(5, 1, 9, 2)
    await scrubTo(0)
    expect(onCommit).toHaveBeenLastCalledWith(1)
  })

  it('holds a drag within a maximum off the grid', async () => {
    await renderRange(4, 0, 10, 4)
    await scrubTo(200)
    expect(onCommit).toHaveBeenLastCalledWith(10)
  })

  it('lands an arrow step on the grid counted from the minimum', async () => {
    await renderRange(2, 1, 9, 2)
    await act(async () => {
      strip().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(5)
  })
})
