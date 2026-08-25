// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useBannerMenu } from './useBannerMenu'
import { GhostSuppress } from '../Views/useGhostAnchor'
import { useSession } from '../../store'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
const mutate = vi.fn(() => Promise.resolve(true))
const onDone = vi.fn()

beforeEach(() => {
  mutate.mockClear()
  onDone.mockClear()
  useSession.setState({ mutate: mutate as never })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

let api: ReturnType<typeof useBannerMenu>
function Inner(): React.JSX.Element {
  const frame = useRef<HTMLDivElement>(null)
  api = useBannerMenu('Notes/A.md', 'page', { value: '[[Cover.png]]', frame, onDone })
  return <div ref={frame} />
}
function Probe({
  ghost,
}: {
  ghost?: (fn: () => Promise<unknown>) => Promise<unknown>
}): React.JSX.Element {
  return ghost ? (
    <GhostSuppress.Provider value={ghost as never}>
      <Inner />
    </GhostSuppress.Provider>
  ) : (
    <Inner />
  )
}

const mount = (el: React.ReactNode): Promise<void> => act(async () => root.render(el))

describe('useBannerMenu', () => {
  it("opens the editor on 'edit' and pops through the ghost wrap", async () => {
    const ghost = vi.fn((fn: () => Promise<unknown>) => fn())
    ;(window as { nexus?: unknown }).nexus = { bannerMenu: () => Promise.resolve('edit') }
    await mount(<Probe ghost={ghost} />)
    expect(api.editing).toBe(false)
    await act(async () => {
      await api.openMenu()
    })
    expect(ghost).toHaveBeenCalled()
    expect(api.editing).toBe(true)
  })

  it('onSave writes setCrop keyed by the seat’s stored value and closes the editor', async () => {
    ;(window as { nexus?: unknown }).nexus = { bannerMenu: () => Promise.resolve('edit') }
    await mount(<Probe />)
    await act(async () => {
      await api.openMenu()
    })
    expect(api.editing).toBe(true)
    await act(async () => {
      await api.onSave({ x: 0.2, y: 0.3, zoom: 1.5 })
    })
    expect(mutate).toHaveBeenCalledWith({
      op: 'setCrop',
      image: '[[Cover.png]]',
      crop: { x: 0.2, y: 0.3, zoom: 1.5 },
    })
    expect(api.editing).toBe(false)
  })

  it('onRepick adopts the source through setBanner', async () => {
    ;(window as { nexus?: unknown }).nexus = {}
    await mount(<Probe />)
    await act(async () => {
      await api.onRepick('/abs/New.png')
    })
    expect(mutate).toHaveBeenCalledWith({
      op: 'setBanner',
      path: 'Notes/A.md',
      kind: 'page',
      source: '/abs/New.png',
    })
    // onDone advances a page cover's value so the picker's Save-hold can't dead-end
    expect(onDone).toHaveBeenCalled()
  })
})
