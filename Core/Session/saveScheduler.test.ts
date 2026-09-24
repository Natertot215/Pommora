// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detail } from '@pommora/core/Testing/fixtures'
import { machine } from '../Platform/machine'
import { cachePageDetail, clearCache, readPageDetail } from './pageDetailCache'
import {
  flushPageSave,
  holdSaves,
  releaseSaves,
  schedulePageSave,
  setStaleSaveSink,
} from './saveScheduler'
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

describe('one save in flight per page', () => {
  it('holds the next save until the previous lands, then sends it on the base that save set', async () => {
    let land: (v: unknown) => void = () => {}
    const sent: [string, string][] = []
    updateBody = vi.fn((_p: string, body: string, base: string) => {
      sent.push([body, base])
      return body === 'v1'
        ? new Promise((r) => {
            land = r
          })
        : Promise.resolve({ ok: true, value: { hash: machine().sha256Hex(body), stale: false } })
    })
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ 'page:updateBody': updateBody })
    cachePageDetail(disk)
    schedulePageSave(PATH, 'v1')
    const first = flushPageSave(PATH)
    schedulePageSave(PATH, 'v2')
    const second = flushPageSave(PATH)
    await Promise.resolve()
    expect(sent).toEqual([['v1', disk.bodyHash]])
    land({ ok: true, value: { hash: machine().sha256Hex('v1'), stale: false } })
    await first
    await second
    expect(sent).toEqual([
      ['v1', disk.bodyHash],
      ['v2', machine().sha256Hex('v1')],
    ])
  })
})

describe('holdSaves', () => {
  it('lets a flush with nothing held through at once', async () => {
    holdSaves()
    let landed = false
    await flushPageSave(PATH).then(() => {
      landed = true
    })
    releaseSaves()
    expect(landed).toBe(true)
  })

  it('keeps a flush waiting until every hold lifts, and then lands it', async () => {
    stub({ ok: true, value: { hash: machine().sha256Hex('typed'), stale: false } })
    cachePageDetail(disk)
    holdSaves()
    holdSaves()
    schedulePageSave(PATH, 'typed')
    let landed = false
    const flushed = flushPageSave(PATH).then(() => {
      landed = true
    })
    releaseSaves()
    await Promise.resolve()
    expect(updateBody).not.toHaveBeenCalled()
    releaseSaves()
    await flushed
    expect(landed).toBe(true)
    expect(updateBody).toHaveBeenCalledExactlyOnceWith(PATH, 'typed', disk.bodyHash)
  })
})
