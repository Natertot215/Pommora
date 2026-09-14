// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { detail } from '@pommora/core/Testing/fixtures'
import { ok } from '@pommora/core/Contract/result'
import { EMPTY_ASSET_MAP } from '@pommora/core/Nexus/tree'
import { cachePageDetail, clearCache, subscribeLanding } from './pageDetailCache'
import { flushPageSave, schedulePageSave } from './saveScheduler'
import { useSession } from './store'
import { useBridgeSubscriptions } from './useBridgeSubscriptions'
import { stubDialer } from '../vitest.setup'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const PATH = 'Notes/a.md'
const Probe = (): null => {
  useBridgeSubscriptions()
  return null
}

let container: HTMLDivElement
let root: Root
let landed: (paths: string[]) => void
let replaceBody: ReturnType<typeof vi.fn<(path: string) => Promise<boolean>>>

const mount = async (): Promise<void> => {
  await act(async () => {
    root.render(createElement(Probe))
  })
}

beforeEach(() => {
  clearCache()
  replaceBody = vi.fn(async (_path: string) => true)
  useSession.setState({ replaceBody })
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'host:platform': async () => ok('posix'),
    'assets:map': async () => ok(EMPTY_ASSET_MAP),
    'pages:changed': (cb: (paths: string[]) => void) => {
      landed = cb
      return () => undefined
    },
    'page:updateBody': async () => ok({ hash: 'h', stale: true }),
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  clearCache()
})

describe('a page that changed outside the app', () => {
  it('reaches a subscribed editor and leaves the slot alone', async () => {
    await mount()
    const onLanding = vi.fn()
    const off = subscribeLanding(PATH, onLanding)
    cachePageDetail(detail({ path: PATH }))
    act(() => landed([PATH]))
    expect(onLanding).toHaveBeenCalledTimes(1)
    expect(replaceBody).not.toHaveBeenCalled()
    off()
  })

  it('replaces the body of a held page with no editor, and skips one the session never opened', async () => {
    await mount()
    cachePageDetail(detail({ path: PATH }))
    act(() => landed([PATH, 'Notes/unknown.md']))
    expect(replaceBody).toHaveBeenCalledExactlyOnceWith(PATH)
  })

  it('routes a stale save the same way while mounted, and nothing once unmounted', async () => {
    await mount()
    cachePageDetail(detail({ path: PATH }))
    schedulePageSave(PATH, 'typed')
    await act(async () => flushPageSave(PATH))
    expect(replaceBody).toHaveBeenCalledExactlyOnceWith(PATH)
    await act(async () => root.unmount())
    schedulePageSave(PATH, 'typed again')
    await flushPageSave(PATH)
    expect(replaceBody).toHaveBeenCalledTimes(1)
  })
})
