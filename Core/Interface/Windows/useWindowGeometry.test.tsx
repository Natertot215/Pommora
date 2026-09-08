// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { DevicePrefs } from '../../Settings/devicePrefs'
import { useSession } from '../../Session/store'
import { useWindowGeometry } from './useWindowGeometry'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let setDevicePref: ReturnType<typeof vi.fn>
let seen: ReturnType<typeof useWindowGeometry>

function Probe({ id }: { id: string }): null {
  seen = useWindowGeometry(id)
  return null
}

const mount = (windows: DevicePrefs['windows'], id = 'page-window'): void => {
  setDevicePref = vi.fn()
  useSession.setState({ devicePrefs: { windows }, setDevicePref: setDevicePref as never })
  act(() => root.render(<Probe id={id} />))
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('a window reads and writes its size on the device rail', () => {
  it('hands back the stored size for its own id', () => {
    mount({ 'page-window': { w: 700, h: 500 }, settings: { w: 900, h: 640 } })
    expect(seen.initialSize).toEqual({ w: 700, h: 500 })
  })

  it('hands back nothing when no size is stored', () => {
    mount({ settings: { w: 900, h: 640 } })
    expect(seen.initialSize).toBeUndefined()
  })

  it('ignores an entry that is not a pair of finite numbers', () => {
    mount({ 'page-window': { w: Number.NaN, h: 500 } })
    expect(seen.initialSize).toBeUndefined()
    mount({ 'page-window': { w: '700', h: 500 } as unknown as { w: number; h: number } })
    expect(seen.initialSize).toBeUndefined()
  })

  it('a size matching the stored one writes nothing — which is what a window move reports', () => {
    mount({ 'page-window': { w: 700, h: 500 }, settings: { w: 900, h: 640 } })
    act(() => seen.onSizeChange({ w: 700, h: 500 }))
    expect(setDevicePref).not.toHaveBeenCalled()
  })

  it('a resize writes one entry under its own id and leaves its siblings standing', () => {
    mount({ 'page-window': { w: 700, h: 500 }, settings: { w: 900, h: 640 } })
    act(() => seen.onSizeChange({ w: 720, h: 500 }))
    expect(setDevicePref.mock.calls).toEqual([
      ['windows', { 'page-window': { w: 720, h: 500 }, settings: { w: 900, h: 640 } }],
    ])
  })

  it('a first size lands beside nothing when the map is absent', () => {
    mount(undefined)
    act(() => seen.onSizeChange({ w: 720, h: 500 }))
    expect(setDevicePref.mock.calls).toEqual([['windows', { 'page-window': { w: 720, h: 500 } }]])
  })
})
