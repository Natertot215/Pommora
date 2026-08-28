import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PageDetail } from '@shared/types'
import {
  captureWarm,
  clearWarm,
  dropPageDetail,
  dropWarmTab,
  fetchPageDetail,
  readPageDetail,
  readWarm,
} from './warmCache'

beforeEach(() => clearWarm()) // module state — never leaks across tests

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
    for (let i = 0; i < 21; i++) captureWarm('t1', `page:p${i}`, { scrollTop: i })
    expect(readWarm('t1', 'page:p0')).toBeUndefined()
    expect(readWarm('t1', 'page:p20')?.scrollTop).toBe(20)
    // Re-capturing an old key refreshes its slot, so the NEXT eviction takes the now-stalest instead.
    captureWarm('t1', 'page:p1', { scrollTop: 99 })
    captureWarm('t1', 'page:p21', { scrollTop: 21 })
    expect(readWarm('t1', 'page:p1')?.scrollTop).toBe(99)
    expect(readWarm('t1', 'page:p2')).toBeUndefined()
  })

  it('dropWarmTab clears one tab; clearWarm clears everything', () => {
    captureWarm('t1', 'page:a', { scrollTop: 1 })
    captureWarm('t2', 'page:b', { scrollTop: 2 })
    dropWarmTab('t1')
    expect(readWarm('t1', 'page:a')).toBeUndefined()
    expect(readWarm('t2', 'page:b')?.scrollTop).toBe(2)
    clearWarm()
    expect(readWarm('t2', 'page:b')).toBeUndefined()
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
