import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  type Changed,
  dropOwnEchoes,
  emitWatch,
  isRecentWrite,
  recordLanding,
  recordWrite,
  setWatchTap,
  setWriteTap,
} from './writeEcho'
import { machine } from '../Platform/machine'
import { windows } from '../Testing/hostFs'

// WINDOW_MS is 2000; PREFIX_WINDOW_MS is 800. The module-level map has no reset, so each test uses a distinct root to keep records from bleeding across tests.
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
})
afterEach(() => {
  vi.restoreAllMocks()
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

describe('a landing’s echo', () => {
  const land = async (p: string, data: string, at?: Date): Promise<void> => {
    recordWrite(p, true)
    writeFileSync(p, data)
    if (at) utimesSync(p, at, at)
    recordLanding(p, (await machine().stat(p))!)
  }
  const watched = (absPath: string): Changed => ({ event: 'change', absPath, origin: 'watched' })

  it('is dropped while the file still holds the stat its landing answered, and kept once it doesn’t', async () => {
    vi.useRealTimers()
    const dir = mkdtempSync(join(tmpdir(), 'pom-echo-'))
    const [own, theirs, gone] = ['own.md', 'theirs.md', 'gone.md'].map((f) => join(dir, f))
    for (const p of [own, theirs, gone]) await land(p, 'mine')
    writeFileSync(theirs, 'an outside edit')
    unlinkSync(gone)
    expect(isRecentWrite(own)).toBe(false)
    const events = [own, theirs, gone].map(watched)
    // A settle long past the window still judges by the stat its landing answered.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 10_000)
    expect(await dropOwnEchoes(events)).toEqual([events[1], events[2]])
  })

  it('is still told apart however late its events arrive', async () => {
    vi.useRealTimers()
    const p = join(mkdtempSync(join(tmpdir(), 'pom-echo-')), 'late.md')
    await land(p, 'mine')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 10_000)
    expect(await dropOwnEchoes([watched(p), watched(p)])).toEqual([])
  })

  it('stops being an echo once an event finds the file changed, so an outside write restoring the app’s bytes still reaches the watcher', async () => {
    vi.useRealTimers()
    const p = join(mkdtempSync(join(tmpdir(), 'pom-echo-')), 'restored.md')
    await land(p, 'mine')
    writeFileSync(p, 'an outside edit')
    const edit = watched(p)
    expect(await dropOwnEchoes([edit])).toEqual([edit])
    writeFileSync(p, 'mine')
    const restore = watched(p)
    expect(await dropOwnEchoes([restore])).toEqual([restore])
  })

  it('keeps a newer landing’s record when an older event finds the file it left', async () => {
    vi.useRealTimers()
    const p = join(mkdtempSync(join(tmpdir(), 'pom-echo-')), 'newer.md')
    await land(p, 'one')
    const m = machine()
    const real = m.stat.bind(m)
    vi.spyOn(m, 'stat').mockImplementationOnce(async (path) => {
      await land(p, 'two!')
      return real(path)
    })
    await dropOwnEchoes([watched(p)])
    expect(await dropOwnEchoes([watched(p)])).toEqual([])
  })

  it.skipIf(windows)(
    'is heard when an outside write keeps the landing’s time and size',
    async () => {
      vi.useRealTimers()
      const p = join(mkdtempSync(join(tmpdir(), 'pom-echo-')), 'kept.md')
      const second = new Date(Math.floor(Date.now() / 1000) * 1000 - 1000)
      await land(p, 'mine', second)
      writeFileSync(p, 'mint')
      utimesSync(p, second, second)
      const heard = watched(p)
      expect(await dropOwnEchoes([heard])).toEqual([heard])
    },
  )

  it('drops a landing’s echo without reading the file', async () => {
    vi.useRealTimers()
    const p = join(mkdtempSync(join(tmpdir(), 'pom-echo-')), 'unread.md')
    await land(p, 'mine')
    const reads = [vi.spyOn(machine(), 'readBytes'), vi.spyOn(machine(), 'readText')]
    expect(await dropOwnEchoes([watched(p)])).toEqual([])
    for (const read of reads) expect(read).not.toHaveBeenCalled()
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
    expect(seen).toEqual([{ event: 'change', absPath: '/nexus/Notes/Page.md', origin: 'watched' }])
  })
})
