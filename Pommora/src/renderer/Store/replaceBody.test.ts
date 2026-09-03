// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '../store'
import { captureCache, clearCache, readBodyEpoch, readCache, readPageDetail } from './tabState'

const detail = { id: 'a', title: 'A', path: 'Notes/a.md', frontmatter: {}, body: 'restored' }

beforeEach(() => {
  clearCache()
  ;(window as unknown as { nexus: unknown }).nexus = {
    openPage: vi.fn(async () => ({ ok: true, value: detail })),
  }
})
afterEach(() => clearCache())

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
    expect(readCache('t2', 'page:a')).toEqual({})
    expect(readPageDetail('Notes/a.md')?.body).toBe('restored')
    const slot = useSession.getState().pages.a
    expect(slot?.status === 'ready' && slot.body).toBe('restored')
    expect(readBodyEpoch('Notes/a.md')).toBe(before + 1)
  })
})
