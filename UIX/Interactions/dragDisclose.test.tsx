// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beginDragDisclose, endDragDisclose, useDiscloseTarget } from './dragDisclose'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let under: Element | null = null
document.elementFromPoint = () => under

function Row({
  collapsed,
  expand,
  children,
}: {
  collapsed: boolean
  expand: () => void
  children?: ReactNode
}): React.JSX.Element {
  const ref = useDiscloseTarget(collapsed, expand)
  return (
    <div
      ref={(node) => {
        ref.current = node
      }}
    >
      {children}
    </div>
  )
}

let host: HTMLDivElement
let root: Root
// The hover throttle's last-check time outlives each test, so every test starts well past it.
let clock = 0
beforeEach(() => {
  vi.useFakeTimers()
  clock += 10_000
  vi.advanceTimersByTime(clock)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  beginDragDisclose(() => {})
})
afterEach(() => {
  endDragDisclose()
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
})

const render = (node: ReactNode): Promise<void> => act(async () => root.render(node))
// The hover check is throttled, so each move lands past the last one's window.
const hoverChild = (): void => {
  vi.advanceTimersByTime(200)
  under = host.querySelector('span')
  window.dispatchEvent(new PointerEvent('pointermove'))
}
const dwell = (): Promise<void> => act(async () => void vi.advanceTimersByTime(600))

describe('useDiscloseTarget', () => {
  it('springs a collapsed row open from a pointer resting on its content, calling the latest expand', async () => {
    const first = vi.fn()
    const latest = vi.fn()
    await render(
      <Row collapsed expand={first}>
        <span />
      </Row>,
    )
    hoverChild()
    await render(
      <Row collapsed expand={latest}>
        <span />
      </Row>,
    )
    await dwell()
    expect(first).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalledOnce()
  })

  it('opens the innermost of two nested collapsed rows', async () => {
    const outer = vi.fn()
    const inner = vi.fn()
    await render(
      <Row collapsed expand={outer}>
        <Row collapsed expand={inner}>
          <span />
        </Row>
      </Row>,
    )
    hoverChild()
    await dwell()
    expect(outer).not.toHaveBeenCalled()
    expect(inner).toHaveBeenCalledOnce()
  })

  it('drops a pending dwell when its row opens or unmounts first', async () => {
    const expand = vi.fn()
    await render(
      <Row collapsed expand={expand}>
        <span />
      </Row>,
    )
    hoverChild()
    await render(
      <Row collapsed={false} expand={expand}>
        <span />
      </Row>,
    )
    await dwell()
    await render(
      <Row collapsed expand={expand}>
        <span />
      </Row>,
    )
    hoverChild()
    await render(<span />)
    await dwell()
    expect(expand).not.toHaveBeenCalled()
  })
})
