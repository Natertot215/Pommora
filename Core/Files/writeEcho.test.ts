import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  type Changed,
  dropOwnEchoes,
  emitWatch,
  isRecentWrite,
  recordWrite,
  setWatchTap,
  setWriteTap,
  writtenHash,
} from './writeEcho'

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

describe('setWriteTap', () => {
  it('hands every recorded path to the tap until it is cleared', () => {
    const seen: string[] = []
    setWriteTap({ wrote: (p) => seen.push(p), renamed: () => {} })
    recordWrite('/t6/a.md')
    recordWrite('/t6/b.md')
    setWriteTap(null)
    recordWrite('/t6/c.md')
    expect(seen).toEqual(['/t6/a.md', '/t6/b.md'])
  })
})

describe('an echo recorded with its bytes', () => {
  it('is left to the content check, which drops it only while the file still holds the bytes its arrival named', async () => {
    vi.useRealTimers()
    const dir = mkdtempSync(join(tmpdir(), 'pom-echo-'))
    const own = join(dir, 'own.md')
    const theirs = join(dir, 'theirs.md')
    recordWrite(own, 'mine')
    recordWrite(theirs, 'mine')
    writeFileSync(own, 'mine')
    writeFileSync(theirs, 'an outside edit')
    expect(isRecentWrite(own)).toBe(false)
    const events = [own, theirs, join(dir, 'gone.md')].map((absPath) => ({
      absPath,
      written: writtenHash(absPath),
    }))
    // A settle long past the window still judges by what arrival named.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 10_000)
    expect(await dropOwnEchoes(events)).toEqual([events[1], events[2]])
  })
})

describe('emitWatch', () => {
  it('reaches an installed sink and builds nothing without one', () => {
    const seen: Changed[] = []
    emitWatch('change', '/nexus/Notes/Page.md')
    setWatchTap((ev) => seen.push(ev))
    emitWatch('change', '/nexus/Notes/Page.md')
    setWatchTap(null)
    emitWatch('unlink', '/nexus/Notes/Page.md')
    expect(seen).toEqual([{ event: 'change', absPath: '/nexus/Notes/Page.md' }])
  })
})
