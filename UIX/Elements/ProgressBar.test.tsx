// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ProgressBar, paintProgress } from './ProgressBar'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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
})

const mount = (fill: number): void => {
  act(() => root.render(<ProgressBar fill={fill} />))
}
const track = (): HTMLElement => host.querySelector('[role="progressbar"]') as HTMLElement
const shown = (): number => Number(track().style.getPropertyValue('--fill'))

describe('ProgressBar', () => {
  it('maps a mid fill to a percent shown', () => {
    mount(0.3)
    expect(shown()).toBeCloseTo(30)
    expect(track().getAttribute('aria-valuenow')).toBe('30')
  })
  it('clamps an over-1 fill to 100%', () => {
    mount(1.5)
    expect(shown()).toBe(100)
  })
  it('clamps a negative fill to 0%', () => {
    mount(-1)
    expect(shown()).toBe(0)
  })
  it('treats a non-finite fill as 0%', () => {
    mount(Number.NaN)
    expect(shown()).toBe(0)
  })
  it('paints a fill without a render, and an unchanged render keeps it', () => {
    mount(1)
    paintProgress(track(), 0.25)
    expect(shown()).toBeCloseTo(25)
    expect(track().getAttribute('aria-valuenow')).toBe('25')
    mount(1)
    expect(shown()).toBeCloseTo(25)
  })
})
