// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { NumberConfig } from '../properties'
import { NumberEditor } from './NumberEditor'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// The DualSwitch's GlassControl measures itself; jsdom has no ResizeObserver.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  onSetConfig.mockClear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const onSetConfig = vi.fn()
const mount = (config: NumberConfig): void => {
  act(() =>
    root.render(
      <NumberEditor config={config} look="number" onSetConfig={onSetConfig} onSetStyle={vi.fn()} />,
    ),
  )
}
const labels = (): string[] =>
  Array.from(host.querySelectorAll('span')).map((s) => s.textContent ?? '')

describe('NumberEditor', () => {
  it('shows the Currency row only when the family is currency', () => {
    mount({ number_family: 'number' })
    expect(labels()).not.toContain('Currency')
    mount({ number_family: 'currency' })
    expect(labels()).toContain('Currency')
  })

  it('hides Separators + Fraction for percent and shows the Style row', () => {
    mount({ number_family: 'percent' })
    const l = labels()
    expect(l).not.toContain('Separators')
    expect(l).not.toContain('Fraction')
    expect(l).toContain('Style')
  })

  it('reveals the Value row only when fraction is on', () => {
    mount({ number_family: 'number', number_fraction: false })
    expect(labels()).not.toContain('Value')
    mount({ number_family: 'number', number_fraction: true, number_denominator: 10 })
    expect(labels()).toContain('Value')
  })

  it('the Value row refuses text that only partly parses, and a blank clears it', () => {
    mount({ number_family: 'number', number_fraction: true, number_denominator: 10 })
    const type = (text: string): void => {
      act(() => (host.querySelector('button[aria-label="Fraction value"]') as HTMLElement).click())
      const input = host.querySelector('input') as HTMLInputElement
      input.value = text
      act(() => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      })
    }
    type('12abc')
    expect(onSetConfig).not.toHaveBeenCalled()
    type('')
    expect(onSetConfig).toHaveBeenCalledWith({ number_denominator: undefined })
  })
})
