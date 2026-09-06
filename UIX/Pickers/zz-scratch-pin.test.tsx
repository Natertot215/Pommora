// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { PickerMenu } from './picker-base'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
class RO {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = RO

describe('uncontrolled pin (no open prop)', () => {
  it('does NOT portal to document.body and ignores anchorX/anchorY', () => {
    const mount = document.createElement('div')
    document.body.appendChild(mount)
    const root = createRoot(mount)
    act(() => {
      root.render(
        // exactly the plan's pin: anchorX/anchorY set, NO open prop
        <PickerMenu
          glass="window"
          anchorX={500}
          anchorY={400}
          anchorHeight={20}
          manageFocus={false}
          modal={false}
          origin="center"
        >
          <div data-id="pinbody" style={{ width: 260, height: 120 }}>
            PIN
          </div>
        </PickerMenu>,
      )
    })
    // A selfManaged/portal PickerMenu appends [data-picker-portal] to document.body.
    const portals = document.body.querySelectorAll('[data-picker-portal]')
    const bodyInMount = mount.querySelector('[data-id="pinbody"]')
    const bodyInPortal = Array.from(portals).some((p) => p.querySelector('[data-id="pinbody"]'))
    // Report positioning: does any rendered layer carry left:500px / top near 400?
    const layer = mount.firstElementChild as HTMLElement | null
    console.log('PORTAL_COUNT=', portals.length)
    console.log('BODY_RENDERS_INLINE_IN_MOUNT=', !!bodyInMount)
    console.log('BODY_RENDERS_IN_PORTAL=', bodyInPortal)
    console.log('INLINE_WRAPPER_CLASS=', layer?.className ?? '(none)')
    console.log('INLINE_WRAPPER_INLINE_STYLE=', layer?.getAttribute('style') ?? '(none)')
    act(() => root.unmount())
    mount.remove()
    // Assertions capturing the claim: uncontrolled => inline, no portal.
    expect(portals.length).toBe(0)
    expect(!!bodyInMount).toBe(true)
  })
})
