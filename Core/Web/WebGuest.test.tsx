// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { stubDialer } from '../vitest.setup'
import { WEB_PARTITION } from './guest'
import { WebGuest, type WebGuestHandle } from './WebGuest'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
const zoomSet = vi.fn()
const wheel = vi.fn()

beforeEach(() => {
  zoomSet.mockClear()
  wheel.mockClear()
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'webGuestZoom:set': zoomSet,
    'web:wheel': wheel,
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const guestEl = (): HTMLElement => host.querySelector('webview') as HTMLElement
const fire = (type: string, detail: Record<string, unknown> = {}): void => {
  act(() => {
    guestEl().dispatchEvent(Object.assign(new Event(type), detail))
  })
}
const attach = (): void => {
  Object.assign(guestEl(), {
    getWebContentsId: () => 7,
    getURL: () => 'https://example.com/',
    canGoBack: () => true,
    canGoForward: () => false,
  })
  fire('did-attach')
}

describe('WebGuest', () => {
  it('carries the shared partition, and popups only as the attribute string', () => {
    act(() => root.render(<WebGuest src="https://example.com" popups className="extra" />))
    expect(guestEl().getAttribute('partition')).toBe(WEB_PARTITION)
    expect(guestEl().getAttribute('allowpopups')).toBe('')
    expect(guestEl().className).toBe('web-guest extra')
    act(() => root.render(<WebGuest src="https://example.com" />))
    expect(guestEl().hasAttribute('allowpopups')).toBe(false)
  })

  it('reports main-frame failures and a lost process, never a subframe or a redirect abort', () => {
    const onFail = vi.fn()
    act(() => root.render(<WebGuest src="https://example.com" onFail={onFail} />))
    fire('did-fail-load', { isMainFrame: false, errorCode: -105 })
    fire('did-fail-load', { isMainFrame: true, errorCode: -3 })
    expect(onFail).not.toHaveBeenCalled()
    fire('did-fail-load', { isMainFrame: true, errorCode: -105 })
    fire('render-process-gone')
    expect(onFail).toHaveBeenCalledTimes(2)
  })

  it('answers every handle call with its fallback before the guest attaches', async () => {
    const ref = createRef<WebGuestHandle>()
    act(() => root.render(<WebGuest ref={ref} src="https://example.com" zoom={1.5} />))
    const g = ref.current as WebGuestHandle
    expect(g.url()).toBe('')
    expect(g.blur()).toBe(false)
    expect(() => g.load('https://example.org')).not.toThrow()
    g.wheel(1, 2, 3, 4)
    await expect(g.capture()).resolves.toBeNull()
    expect(wheel).not.toHaveBeenCalled()
    expect(zoomSet).not.toHaveBeenCalled()
  })

  it('stamps its zoom at attach and on change, and wheels with the input sign', () => {
    const ref = createRef<WebGuestHandle>()
    const onNavigate = vi.fn()
    const view = (zoom: number) => (
      <WebGuest ref={ref} src="https://example.com" zoom={zoom} onNavigate={onNavigate} />
    )
    act(() => root.render(view(1.5)))
    attach()
    expect(zoomSet).toHaveBeenLastCalledWith(7, 1.5)
    act(() => root.render(view(1)))
    expect(zoomSet).toHaveBeenLastCalledWith(7, 1)
    ref.current?.wheel(10.4, 20.6, 3, -5)
    expect(wheel).toHaveBeenCalledWith(7, 10, 21, -3, 5)
    fire('did-navigate')
    expect(onNavigate).toHaveBeenCalledWith({
      url: 'https://example.com/',
      back: true,
      forward: false,
    })
  })
})
