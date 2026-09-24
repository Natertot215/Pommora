// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detail } from '@pommora/core/Testing/fixtures'
import { machine } from '../Platform/machine'
import { cachePageDetail, clearCache, readPageDetail } from './pageDetailCache'
import { flushPageSave, schedulePageSave, setStaleSaveSink } from './saveScheduler'
import { stubDialer } from '../vitest.setup'

const PATH = 'Notes/a.md'
const disk = detail({ path: PATH, body: 'disk' })

let openPage: ReturnType<typeof vi.fn>
let updateBody: ReturnType<typeof vi.fn>

const stub = (reply: unknown): void => {
  openPage = vi.fn(async () => ({ ok: true, value: disk }))
  updateBody = vi.fn(async () => reply)
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'page:open': openPage,
    'page:updateBody': updateBody,
  })
}

beforeEach(() => clearCache())

afterEach(() => {
  setStaleSaveSink(null)
  vi.useRealTimers()
  clearCache()
})

describe('schedulePageSave', () => {
  it('does not requeue a stale ack and calls the sink once', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    stub({ ok: true, value: { stale: true } })
    cachePageDetail(disk)
    const stale = vi.fn()
    setStaleSaveSink(stale)
    schedulePageSave(PATH, 'typed')
    await flushPageSave(PATH)
    await vi.advanceTimersByTimeAsync(2000)
    expect(updateBody).toHaveBeenCalledTimes(1)
    expect(stale).toHaveBeenCalledExactlyOnceWith(PATH, 'typed')
  })

  it('sends the write before any await so an unload flush escapes', async () => {
    stub({ ok: true, value: { hash: machine().sha256Hex('typed'), stale: false } })
    cachePageDetail(disk)
    schedulePageSave(PATH, 'typed')
    const landed = flushPageSave(PATH)
    expect(updateBody).toHaveBeenCalledWith(PATH, 'typed', disk.bodyHash)
    expect(readPageDetail(PATH)?.body).toBe('typed')
    await landed
    schedulePageSave(PATH, 'typed again')
    await flushPageSave(PATH)
    expect(updateBody).toHaveBeenLastCalledWith(PATH, 'typed again', machine().sha256Hex('typed'))
    expect(openPage).not.toHaveBeenCalled()
  })

  it('answers stale when no base is held', async () => {
    stub({ ok: true, value: { stale: true } })
    const stale = vi.fn()
    setStaleSaveSink(stale)
    schedulePageSave(PATH, 'typed')
    await flushPageSave(PATH)
    expect(updateBody).toHaveBeenCalledWith(PATH, 'typed', '')
    expect(stale).toHaveBeenCalledExactlyOnceWith(PATH, 'typed')
  })

  it('drops a refused save instead of retrying it', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    stub({ ok: false, error: { code: 'not-found', message: 'gone' } })
    schedulePageSave(PATH, 'typed')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(updateBody).toHaveBeenCalledTimes(1)
  })
})
