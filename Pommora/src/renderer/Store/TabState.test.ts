import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PageDetail } from '@shared/types'
import {
  bumpBodyEpoch,
  captureCache,
  clearCache,
  dropPageDetail,
  dropCacheTab,
  fenceWarm,
  fetchPageDetail,
  readBodyEpoch,
  readPageDetail,
  readCache,
  subscribeBodyEpoch,
} from './tabState'

beforeEach(() => clearCache()) // module state — never leaks across tests

describe('warmCache', () => {
  it('round-trips a capture and merges partial writes under one key', () => {
    captureCache('t1', 'page:a', { scrollTop: 120 })
    captureCache('t1', 'page:a', { editorState: { doc: 'x' } })
    expect(readCache('t1', 'page:a')).toEqual({ scrollTop: 120, editorState: { doc: 'x' } })
  })

  it('isolates tabs — the same entity warms independently per tab', () => {
    captureCache('t1', 'page:a', { scrollTop: 1 })
    captureCache('t2', 'page:a', { scrollTop: 2 })
    expect(readCache('t1', 'page:a')?.scrollTop).toBe(1)
    expect(readCache('t2', 'page:a')?.scrollTop).toBe(2)
  })

  it('evicts the stalest entry past the per-tab cap (I-7), sparing recently-captured ones', () => {
    for (let i = 0; i < 51; i++) captureCache('t1', `page:p${i}`, { scrollTop: i })
    expect(readCache('t1', 'page:p0')).toBeUndefined()
    expect(readCache('t1', 'page:p50')?.scrollTop).toBe(50)
    // Re-capturing an old key refreshes its slot, so the NEXT eviction takes the now-stalest instead.
    captureCache('t1', 'page:p1', { scrollTop: 99 })
    captureCache('t1', 'page:p51', { scrollTop: 51 })
    expect(readCache('t1', 'page:p1')?.scrollTop).toBe(99)
    expect(readCache('t1', 'page:p2')).toBeUndefined()
  })

  it('dropCacheTab clears one tab; clearCache clears everything', () => {
    captureCache('t1', 'page:a', { scrollTop: 1 })
    captureCache('t2', 'page:b', { scrollTop: 2 })
    dropCacheTab('t1')
    expect(readCache('t1', 'page:a')).toBeUndefined()
    expect(readCache('t2', 'page:b')?.scrollTop).toBe(2)
    clearCache()
    expect(readCache('t2', 'page:b')).toBeUndefined()
  })
})

describe('fetchPageDetail', () => {
  afterEach(() => vi.unstubAllGlobals())

  const detail = (path: string): PageDetail => ({
    id: 'p1',
    title: 'A',
    path,
    frontmatter: {},
    body: 'hello',
  })

  const stubOpenPage = (): ReturnType<typeof vi.fn> => {
    const openPage = vi.fn(
      (path: string): Promise<{ ok: true; value: PageDetail }> =>
        Promise.resolve({ ok: true, value: detail(path) }),
    )
    vi.stubGlobal('window', { nexus: { openPage } })
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

describe('fenceWarm', () => {
  const warm = { editorState: { doc: 'one' }, scrollTop: 3 }
  it('keeps an entry whose doc matches the fresh body', () => {
    expect(fenceWarm(warm, 'one')).toBe(warm)
  })
  it('drops an entry whose doc differs', () => {
    expect(fenceWarm(warm, 'two')).toBeUndefined()
  })
  it('keeps an entry when no fresh body is known', () => {
    expect(fenceWarm(warm, undefined)).toBe(warm)
  })
  it('keeps a scroll-only entry', () => {
    const scroll: { editorState?: unknown; scrollTop: number } = { scrollTop: 3 }
    expect(fenceWarm(scroll, 'two')).toBe(scroll)
  })
})

describe('the body epoch', () => {
  it('advances per path and notifies', () => {
    const seen: number[] = []
    const off = subscribeBodyEpoch(() => seen.push(readBodyEpoch('Notes/a.md')))
    bumpBodyEpoch('Notes/a.md')
    expect(readBodyEpoch('Notes/a.md')).toBe(1)
    expect(readBodyEpoch('Notes/b.md')).toBe(0)
    expect(seen).toEqual([1])
    off()
  })
})
