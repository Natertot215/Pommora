// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from './store'
import { clearCache, readBodyEpoch, readPageDetail } from './pageDetailCache'
import { captureCache, readCache } from '../Navigation/warmTabs'
import { schedulePageSave } from './saveScheduler'
import { stubDialer } from '../vitest.setup'

const detail = { id: 'a', title: 'A', path: 'Notes/a.md', frontmatter: {}, body: 'restored' }

let channels: Record<string, unknown>

beforeEach(() => {
  clearCache()
  channels = { 'page:open': vi.fn(async () => ({ ok: true, value: detail })) }
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer(channels)
})
afterEach(() => {
  vi.useRealTimers()
  clearCache()
})

const armSave = (openPage: () => Promise<unknown>) => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const updatePageBody = vi.fn(async () => ({ ok: true, value: null }))
  channels['page:updateBody'] = updatePageBody
  channels['page:open'] = openPage
  schedulePageSave('Notes/a.md', 'stale plus a keystroke')
  return updatePageBody
}

describe('replaceBody', () => {
  it('drops every warm detail, refetches, patches the slot, and bumps the epoch', async () => {
    const stale = { ...detail, body: 'stale' }
    captureCache('t1', 'page:a', { editorState: { doc: 'stale' }, scrollTop: 4, pageDetail: stale })
    captureCache('t2', 'page:a', { pageDetail: stale })
    useSession.setState({
      pages: {
        a: {
          status: 'ready',
          target: { kind: 'page', id: 'a', path: 'Notes/a.md' },
          detail: stale,
          body: 'stale',
        },
      },
    })
    const before = readBodyEpoch('Notes/a.md')
    await useSession.getState().replaceBody('Notes/a.md')
    expect(readCache('t1', 'page:a')).toEqual({ editorState: { doc: 'stale' }, scrollTop: 4 })
    expect(readCache('t2', 'page:a')?.pageDetail).toBeUndefined()
    expect(readPageDetail('Notes/a.md')?.body).toBe('restored')
    const slot = useSession.getState().pages.a
    expect(slot?.status === 'ready' && slot.body).toBe('restored')
    expect(readBodyEpoch('Notes/a.md')).toBe(before + 1)
  })

  it('drops the pending save before a slow refetch could let it land', async () => {
    const updatePageBody = armSave(
      () => new Promise((r) => setTimeout(() => r({ ok: true, value: detail }), 5000)),
    )
    const replaced = useSession.getState().replaceBody('Notes/a.md')
    await vi.advanceTimersByTimeAsync(5000)
    expect(await replaced).toBe(true)
    expect(updatePageBody).not.toHaveBeenCalled()
    expect(readPageDetail('Notes/a.md')?.body).toBe('restored')
  })

  it('a failed refetch still drops the save, and answers false', async () => {
    const updatePageBody = armSave(async () => ({
      ok: false,
      error: { code: 'not-found', message: 'gone' },
    }))
    const before = readBodyEpoch('Notes/a.md')
    expect(await useSession.getState().replaceBody('Notes/a.md')).toBe(false)
    await vi.advanceTimersByTimeAsync(1000)
    expect(updatePageBody).not.toHaveBeenCalled()
    expect(readBodyEpoch('Notes/a.md')).toBe(before)
  })
})
