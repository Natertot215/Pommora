import { detail } from '../Testing/fixtures'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PageDetail } from '../Pages/pageDetail'
import {
  attachBody,
  cachePageDetail,
  clearCache,
  dropCacheDetail,
  dropPageDetail,
  fetchPageDetail,
  readBodyBase,
  readPageDetail,
  setBodyBase,
  writeThroughBody,
} from './pageDetailCache'
import { machine } from '../Platform/machine'
import { captureWarm, dropWarmOwner, readWarm, warmSeamOf } from './warmCache'
import { fenceWarm } from '../MarkdownPM/warmSeam'
import { stubDialer } from '../vitest.setup'

beforeEach(() => clearCache()) // module state — never leaks across tests

describe('warmCache', () => {
  it('round-trips a capture and merges partial writes under one key', () => {
    captureWarm('t1', 'page:a', { scrollTop: 120 })
    captureWarm('t1', 'page:a', { editorState: { doc: 'x' } })
    expect(readWarm('t1', 'page:a')).toEqual({ scrollTop: 120, editorState: { doc: 'x' } })
  })

  it('isolates tabs — the same entity warms independently per tab', () => {
    captureWarm('t1', 'page:a', { scrollTop: 1 })
    captureWarm('t2', 'page:a', { scrollTop: 2 })
    expect(readWarm('t1', 'page:a')?.scrollTop).toBe(1)
    expect(readWarm('t2', 'page:a')?.scrollTop).toBe(2)
  })

  it('evicts the stalest entry past the per-tab cap (I-7), sparing recently-captured ones', () => {
    for (let i = 0; i < 51; i++) captureWarm('t1', `page:p${i}`, { scrollTop: i })
    expect(readWarm('t1', 'page:p0')).toBeUndefined()
    expect(readWarm('t1', 'page:p50')?.scrollTop).toBe(50)
    // Re-capturing an old key refreshes its slot, so the NEXT eviction takes the now-stalest instead.
    captureWarm('t1', 'page:p1', { scrollTop: 99 })
    captureWarm('t1', 'page:p51', { scrollTop: 51 })
    expect(readWarm('t1', 'page:p1')?.scrollTop).toBe(99)
    expect(readWarm('t1', 'page:p2')).toBeUndefined()
  })

  it('dropWarmOwner clears one tab; clearCache clears everything', () => {
    captureWarm('t1', 'page:a', { scrollTop: 1 })
    captureWarm('t2', 'page:b', { scrollTop: 2 })
    dropWarmOwner('t1')
    expect(readWarm('t1', 'page:a')).toBeUndefined()
    expect(readWarm('t2', 'page:b')?.scrollTop).toBe(2)
    clearCache()
    expect(readWarm('t2', 'page:b')).toBeUndefined()
  })
})

describe('fetchPageDetail', () => {
  afterEach(() => vi.unstubAllGlobals())

  const stubOpenPage = (): ReturnType<typeof vi.fn> => {
    const openPage = vi.fn(
      (path: string): Promise<{ ok: true; value: PageDetail }> =>
        Promise.resolve({ ok: true, value: detail({ path, body: 'hello' }) }),
    )
    vi.stubGlobal('window', { nexus: stubDialer({ 'page:open': openPage }) })
    return openPage
  }

  it('concurrent callers share one round-trip, and the landing seeds the cache', async () => {
    const openPage = stubOpenPage()
    const [a, b] = await Promise.all([fetchPageDetail('x/a.md'), fetchPageDetail('x/a.md')])
    expect(openPage).toHaveBeenCalledTimes(1)
    expect(a).toEqual(b)
    expect(readPageDetail('x/a.md')?.body).toBe('hello')
  })

  it('a settled fetch is not deduped — a later call fetches fresh', async () => {
    const openPage = stubOpenPage()
    await fetchPageDetail('x/a.md')
    await fetchPageDetail('x/a.md')
    expect(openPage).toHaveBeenCalledTimes(2)
  })

  it('a drop mid-flight disowns the fetch: the caller keeps its read, the cache stays unseeded', async () => {
    stubOpenPage()
    const pending = fetchPageDetail('x/a.md')
    dropPageDetail('x/a.md')
    expect(await pending).not.toBeNull()
    expect(readPageDetail('x/a.md')).toBeUndefined()
  })
})

describe('the body base', () => {
  it('holds the body base beside the detail and drops both together', () => {
    cachePageDetail(detail({ path: 'x/a.md', body: 'hello' }))
    expect(readBodyBase('x/a.md')).toEqual({
      text: 'hello',
      hash: machine().sha256Hex('hello'),
    })
    dropPageDetail('x/a.md')
    expect(readBodyBase('x/a.md')).toBeNull()
  })

  it('keeps the body base across a cache refresh and the cap', () => {
    const off = attachBody('x/a.md', { seq: 0, basis: '', follow: () => true }, 'hello')
    cachePageDetail(detail({ path: 'x/a.md', body: 'hello' }))
    const base = readBodyBase('x/a.md')
    writeThroughBody('x/a.md', 'typed')
    cachePageDetail(detail({ path: 'x/a.md', body: 'hello' }))
    off()
    dropCacheDetail('x/a.md')
    for (let i = 0; i < 60; i++) cachePageDetail(detail({ path: `x/p${i}.md`, body: 'other' }))
    expect(readPageDetail('x/a.md')).toBeUndefined()
    expect(readBodyBase('x/a.md')).toEqual(base)
  })

  it('reseats the base on re-open when no editor holds the page', () => {
    cachePageDetail(detail({ path: 'x/a.md', body: 'hello' }))
    setBodyBase('x/a.md', { text: 'typed', hash: machine().sha256Hex('typed') })
    dropCacheDetail('x/a.md')
    cachePageDetail(detail({ path: 'x/a.md', body: 'landed' }))
    expect(readBodyBase('x/a.md')).toEqual({
      text: 'landed',
      hash: machine().sha256Hex('landed'),
    })
  })

  it('a set base is the one the next save asserts', () => {
    cachePageDetail(detail({ path: 'x/a.md', body: 'hello' }))
    setBodyBase('x/a.md', { text: 'typed', hash: machine().sha256Hex('typed') })
    expect(readBodyBase('x/a.md')).toEqual({ text: 'typed', hash: machine().sha256Hex('typed') })
  })
})

describe('fenceWarm', () => {
  const warm = { editorState: { doc: 'one' }, scrollTop: 3 }
  it('keeps an entry whose doc matches the fresh body', () => {
    expect(fenceWarm(warm, 'one')).toBe(warm)
  })
  it('drops an entry whose doc differs', () => {
    expect(fenceWarm(warm, 'two')).toBeUndefined()
  })
  it('drops an entry carrying editor state when no fresh body is known', () => {
    expect(fenceWarm(warm, undefined)).toBeUndefined()
  })
  it('keeps a scroll-only entry, known body or not', () => {
    const scroll: { editorState?: unknown; scrollTop: number } = { scrollTop: 3 }
    expect(fenceWarm(scroll, 'two')).toBe(scroll)
    expect(fenceWarm(scroll, undefined)).toBe(scroll)
  })
})

describe('warmSeamOf', () => {
  const state = { editorState: { doc: 'hi' }, scrollTop: 3 }

  it('one clear reaches every owner, and a capture trailing it stores nothing', () => {
    const seam = warmSeamOf('embed', 'a', () => 'hi')
    seam.capture(state)
    expect(seam.restore()).toEqual(state)
    clearCache()
    seam.capture(state)
    expect(readWarm('embed', 'a')).toBeUndefined()
  })

  it('refuses a capture its owner no longer holds', () => {
    warmSeamOf(
      'window',
      'gone',
      () => 'hi',
      () => false,
    ).capture(state)
    expect(readWarm('window', 'gone')).toBeUndefined()
  })
})
