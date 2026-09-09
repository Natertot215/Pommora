import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isRecentWrite, recordWrite } from './writeEcho'

// WINDOW_MS is 2000; PREFIX_WINDOW_MS is 800. The module-level map has no reset, so each test uses a distinct root to keep records from bleeding across tests.
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('isRecentWrite', () => {
  it('suppresses a self-write echoed back within the window', () => {
    const p = '/t1/note.md'
    recordWrite(p)
    vi.setSystemTime(1999)
    expect(isRecentWrite(p)).toBe(true)
  })

  it('passes the same path once the window expires', () => {
    const p = '/t2/note.md'
    recordWrite(p)
    vi.setSystemTime(2001)
    expect(isRecentWrite(p)).toBe(false)
  })

  it('passes a foreign edit whose path was never recorded', () => {
    expect(isRecentWrite('/t3/foreign.md')).toBe(false)
  })

  it('suppresses a descendant of a recorded folder within the prefix window, then passes it once that tighter window expires', () => {
    const folder = '/t4/Notes'
    recordWrite(folder)
    vi.setSystemTime(799)
    expect(isRecentWrite(`${folder}/child.md`)).toBe(true)
    vi.setSystemTime(801)
    expect(isRecentWrite(`${folder}/child.md`)).toBe(false)
  })

  it('passes a sibling whose name merely shares the recorded prefix but is not a descendant', () => {
    recordWrite('/t5/Notes')
    vi.setSystemTime(100)
    expect(isRecentWrite('/t5/NotesX/child.md')).toBe(false)
  })
})
