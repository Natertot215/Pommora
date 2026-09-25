// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useSession } from '../Session/store'
import { useThumb } from './useThumb'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let thumb: ReturnType<typeof useThumb>

function Probe(): null {
  thumb = useThumb('nexus', 'page:1')
  return null
}

beforeEach(() => {
  useSession.setState({ thumbVersions: {} })
  host = document.createElement('div')
  root = createRoot(host)
  act(() => root.render(<Probe />))
})
afterEach(() => act(() => root.unmount()))

describe('a thumbnail that failed to load', () => {
  it('falls back until a new capture changes its source, then shows again', () => {
    const first = thumb.src
    expect(first).toBeDefined()
    act(() => thumb.onError())
    expect(thumb.src).toBeUndefined()
    act(() => useSession.setState({ thumbVersions: { 'page:1': 1 } }))
    expect(thumb.src).toBeDefined()
    expect(thumb.src).not.toBe(first)
  })
})
