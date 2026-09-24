// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useSettleFallback } from './useExitPresence'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root
let settle: () => void
function Probe({ pending, done }: { pending: boolean; done: () => void }): null {
  settle = useSettleFallback(pending, 'fast', done)
  return null
}
beforeEach(() => {
  vi.useFakeTimers()
  root = createRoot(document.createElement('div'))
})
afterEach(() => {
  act(() => root.unmount())
  vi.useRealTimers()
})

describe('useSettleFallback', () => {
  it('settles once, on the end event or the timer, whichever comes first', () => {
    const done = vi.fn()
    act(() => root.render(<Probe pending done={done} />))
    act(() => settle())
    act(() => settle())
    act(() => vi.advanceTimersByTime(1000))
    expect(done).toHaveBeenCalledOnce()
  })

  it('settles on the timer when no end event comes', () => {
    const done = vi.fn()
    act(() => root.render(<Probe pending done={done} />))
    act(() => vi.advanceTimersByTime(1000))
    act(() => settle())
    expect(done).toHaveBeenCalledOnce()
  })

  it('ignores an end event while nothing is pending', () => {
    const done = vi.fn()
    act(() => root.render(<Probe pending={false} done={done} />))
    act(() => settle())
    act(() => vi.advanceTimersByTime(1000))
    expect(done).not.toHaveBeenCalled()
  })
})
