// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { useDragSnapshot } from './snapshot'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function harness<T>(take: () => T | null): ReturnType<typeof useDragSnapshot<T>> {
  let api: ReturnType<typeof useDragSnapshot<T>> | undefined
  function Probe(): null {
    api = useDragSnapshot(take)
    return null
  }
  const host = document.createElement('div')
  act(() => createRoot(host).render(<Probe />))
  if (!api) throw new Error('hook never ran')
  return api
}

describe('useDragSnapshot', () => {
  it('takes once, serves the cache, and re-takes only when dirtied', () => {
    const take = vi.fn(() => ({ n: take.mock.calls.length }))
    const snap = harness(take)
    expect(snap.get()).toEqual({ n: 1 })
    expect(snap.get()).toEqual({ n: 1 })
    expect(take).toHaveBeenCalledOnce()
    snap.markDirty()
    expect(snap.isDirty()).toBe(true)
    expect(snap.get()).toEqual({ n: 2 })
    expect(snap.isDirty()).toBe(false)
  })

  it('never caches a null take — the next get retries', () => {
    let ready = false
    const take = vi.fn(() => (ready ? { ok: true } : null))
    const snap = harness(take)
    expect(snap.get()).toBeNull()
    ready = true
    expect(snap.get()).toEqual({ ok: true })
    expect(take).toHaveBeenCalledTimes(2)
  })

  it('reset drops the snapshot and the flag', () => {
    const take = vi.fn(() => ({}))
    const snap = harness(take)
    snap.get()
    snap.markDirty()
    snap.reset()
    expect(snap.isDirty()).toBe(false)
    snap.get()
    expect(take).toHaveBeenCalledTimes(2)
  })
})
