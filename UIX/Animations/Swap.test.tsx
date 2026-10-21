// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { DONE_MS } from './motion'
import { Swap } from './Swap'
import { useTimedLabel } from './useTimedLabel'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.body.appendChild(document.createElement('div'))
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const faces = (): [string | null, string | undefined, string | null, boolean][] =>
  [...host.querySelectorAll<HTMLElement>('[data-face]')].map((f) => [
    f.textContent,
    f.dataset.face,
    f.getAttribute('aria-hidden'),
    f.hasAttribute('inert'),
  ])

describe('Swap', () => {
  it('shows one face and leaves the other inert and unnamed', () => {
    act(() => root.render(<Swap swapped={false} from="Clear" to="Cleared" />))
    expect(faces()).toEqual([
      ['Clear', 'shown', null, false],
      ['Cleared', 'hidden', 'true', true],
    ])
  })

  it('swaps the two when told', () => {
    act(() => root.render(<Swap swapped={false} from="Clear" to="Cleared" />))
    act(() => root.render(<Swap swapped from="Clear" to="Cleared" />))
    expect(faces()).toEqual([
      ['Clear', 'hidden', 'true', true],
      ['Cleared', 'shown', null, false],
    ])
  })
})

describe('useTimedLabel', () => {
  function Probe(): React.JSX.Element {
    const [label, mark] = useTimedLabel('Clear', 'Cleared')
    return (
      <button type="button" onClick={mark}>
        {label}
      </button>
    )
  }
  const shown = (): string | null | undefined =>
    host.querySelector('[data-face="shown"]')?.textContent

  it('holds its active face for DONE_MS after a mark, then returns', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    act(() => root.render(<Probe />))
    act(() => host.querySelector('button')?.click())
    expect(shown()).toBe('Cleared')
    act(() => vi.advanceTimersByTime(DONE_MS - 1))
    expect(shown()).toBe('Cleared')
    act(() => vi.advanceTimersByTime(1))
    expect(shown()).toBe('Clear')
    vi.useRealTimers()
  })
})
