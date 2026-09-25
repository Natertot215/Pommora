// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { detail } from '@pommora/core/Testing/fixtures'
import type { SyncStatus } from '@pommora/core/Sync/Contract/wire'
import { ok } from '@pommora/core/Contract/result'
import { EMPTY_ASSET_MAP, type ValueChange } from '@pommora/core/Nexus/tree'
import { makeTree } from '@pommora/core/Testing/testTree'
import {
  attachBody,
  cachePageDetail,
  clearCache,
  dropCacheDetail,
  readPageDetail,
} from './pageDetailCache'
import { flushPageSave, schedulePageSave } from './saveScheduler'
import { useSession } from './store'
import { useBridgeSubscriptions } from './useBridgeSubscriptions'
import { captureCache, readCache } from '../Navigation/warmTabs'
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
let pushValues: (changes: ValueChange[]) => void
let pushStatus: (status: SyncStatus) => void
let replaceBody: ReturnType<typeof vi.fn<(path: string) => Promise<boolean>>>
let captured: ReturnType<typeof vi.fn<(path: string, text: string) => unknown>>

const showInSlot = (): void => {
  const target = { kind: 'page' as const, id: 'p1', path: PATH }
  useSession.setState({
    pages: { p1: { status: 'ready', target, detail: detail({ path: PATH }), body: '' } },
  })
}

const mount = async (): Promise<void> => {
  await act(async () => {
    root.render(createElement(Probe))
  })
}

beforeEach(() => {
  clearCache()
  replaceBody = vi.fn(async (_path: string) => true)
  captured = vi.fn((_path: string, _text: string) => ok(null))
  useSession.setState({ replaceBody, syncStatus: null, pages: {} })
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'host:platform': async () => ok('posix'),
    'assets:map': async () => ok(EMPTY_ASSET_MAP),
    'values:changed': (cb: (changes: ValueChange[]) => void) => {
      pushValues = cb
      return () => undefined
    },
    'pages:changed': (cb: (paths: string[]) => void) => {
      landed = cb
      return () => undefined
    },
    'page:updateBody': async () => ok({ stale: true }),
    'page:open': async (path: string) => ok(detail({ path })),
    'index:headings': async () => ok({}),
    'sync:captureLocal': captured,
    'sync:changed': (cb: (status: SyncStatus) => void) => {
      pushStatus = cb
      return () => undefined
    },
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
  it('merges into a page an editor holds and leaves the slot alone', async () => {
    await mount()
    const off = attachBody(PATH, { seq: 0, basis: '', follow: () => true }, '')
    cachePageDetail(detail({ path: PATH }))
    act(() => landed([PATH]))
    expect(replaceBody).not.toHaveBeenCalled()
    off()
  })

  it('replaces the body of a held page with no editor, and skips one the session never opened', async () => {
    await mount()
    cachePageDetail(detail({ path: PATH }))
    act(() => landed([PATH, 'Notes/unknown.md']))
    expect(replaceBody).toHaveBeenCalledExactlyOnceWith(PATH)
  })

  it('replaces the body of a page a slot shows whose detail was since dropped', async () => {
    await mount()
    showInSlot()
    cachePageDetail(detail({ path: PATH }))
    dropCacheDetail(PATH)
    await act(async () => landed([PATH]))
    expect(replaceBody).toHaveBeenCalledExactlyOnceWith(PATH)
    expect(captured).not.toHaveBeenCalled()
  })

  it('leaves a page the session once opened but no slot shows to its next open', async () => {
    await mount()
    cachePageDetail(detail({ path: PATH }))
    dropCacheDetail(PATH)
    await act(async () => landed([PATH]))
    expect(replaceBody).not.toHaveBeenCalled()
  })

  it('keeps a pending save typed into a page whose detail was dropped', async () => {
    await mount()
    showInSlot()
    cachePageDetail(detail({ path: PATH }))
    dropCacheDetail(PATH)
    schedulePageSave(PATH, 'typed')
    await act(async () => landed([PATH]))
    expect(captured).toHaveBeenCalledExactlyOnceWith(PATH, 'typed')
    expect(replaceBody).toHaveBeenCalled()
  })

  it('captures the held body of a refused save and nothing for a plain landing', async () => {
    await mount()
    cachePageDetail(detail({ path: PATH }))
    act(() => landed([PATH]))
    expect(captured).not.toHaveBeenCalled()

    schedulePageSave(PATH, 'typed')
    await act(async () => flushPageSave(PATH))

    expect(captured).toHaveBeenCalledExactlyOnceWith(PATH, 'typed')
    expect(replaceBody).toHaveBeenCalledTimes(2)
  })

  it('captures a refused save whose page detail is no longer held', async () => {
    await mount()
    schedulePageSave(PATH, 'typed')
    await act(async () => flushPageSave(PATH))

    expect(captured).toHaveBeenCalledExactlyOnceWith(PATH, 'typed')
    expect(replaceBody).toHaveBeenCalledExactlyOnceWith(PATH)
  })

  it('captures typing a landing replaces before its save went out', async () => {
    await mount()
    cachePageDetail(detail({ path: PATH }))
    schedulePageSave(PATH, 'typed')

    act(() => landed([PATH]))

    expect(captured).toHaveBeenCalledExactlyOnceWith(PATH, 'typed')
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

describe('a sync status the client pushes', () => {
  it('reaches the store', async () => {
    await mount()
    await act(async () => pushStatus({ state: 'syncing' }))
    expect(useSession.getState().syncStatus).toEqual({ state: 'syncing' })
  })
})

describe('a values push', () => {
  it('keeps the cached copy of a page whose only write was its own body save', async () => {
    useSession.setState({ tree: makeTree() })
    await mount()
    const alpha = 'Notes/Alpha.md'
    cachePageDetail(detail({ id: 'p1', path: alpha }))
    act(() => pushValues([{ rel: 'Notes', pageIds: ['p1'], bodyOnly: ['p1'] }]))
    expect(readPageDetail(alpha)).toBeDefined()
    act(() => pushValues([{ rel: 'Notes', pageIds: ['p1'] }]))
    expect(readPageDetail(alpha)).toBeUndefined()
  })

  it('drops a parked tab’s warm copy of a changed page that already left the detail cache', async () => {
    useSession.setState({ tree: makeTree() })
    await mount()
    const alpha = 'Notes/Alpha.md'
    captureCache('tab-1', 'p1', { pageDetail: detail({ id: 'p1', path: alpha }) })
    expect(readPageDetail(alpha)).toBeUndefined()
    act(() => pushValues([{ rel: 'Notes', pageIds: ['p1'] }]))
    expect(readCache('tab-1', 'p1')?.pageDetail).toBeUndefined()
  })
})
