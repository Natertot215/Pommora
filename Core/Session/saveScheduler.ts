// One debounced writer PER PATH, shared by every host that edits a page, so the newest edit from ANY host owns the file's single pending write rather than hosts racing private debounces to last-writer-wins.

import type { WindowsFile } from '@pommora/core/Interface/Windows/windowRecord'
import type { StoredTabSet } from '@pommora/core/Navigation/navRef'
import type { Result } from '@pommora/core/Contract/result'
import { persist } from '../Interface/Notifications/notifications'
import { followBody, readBodyBase, setBodyBase, writeThroughBody } from './pageDetailCache'
import { host } from '../Platform/dialer'

const SAVE_DEBOUNCE_MS = 400

type Save = () => Promise<Result<unknown>>

// Set while a Nexus switch is in flight: a save that falls due then can't tell which root would take it, so it waits for the switch and then lands or is cancelled with the old Nexus.
let hold: { depth: number; done: Promise<void>; release: () => void } | null = null

interface BodyWriter {
  schedule: (key: string, save: Save) => void
  flush: (key: string) => Promise<void>
  settled: (key: string) => Promise<void>
  flushAll: () => Promise<void>
  cancel: (key: string) => void
  cancelAll: () => void
}

/** A refused save is dropped, never retried: the next edit schedules the whole body again. */
export function createBodyWriter(what: string, quiet = false): BodyWriter {
  const pending = new Map<string, { save: Save; timer: ReturnType<typeof setTimeout> }>()
  // A key's next save waits for the one in flight, so it carries the base that save set rather than the one before it.
  const inFlight = new Map<string, Promise<void>>()

  const flush = (key: string): Promise<void> => {
    if (hold && pending.has(key)) return hold.done.then(() => flush(key))
    const prior = inFlight.get(key)
    if (prior) return prior.then(() => flush(key))
    const p = pending.get(key)
    if (!p) return Promise.resolve()
    clearTimeout(p.timer)
    pending.delete(key)
    const run = persist(what, p.save(), quiet).finally(() => {
      if (inFlight.get(key) === run) inFlight.delete(key)
    })
    inFlight.set(key, run)
    return run
  }

  const schedule = (key: string, save: Save): void => {
    const prev = pending.get(key)
    if (prev) clearTimeout(prev.timer)
    pending.set(key, { save, timer: setTimeout(() => void flush(key), SAVE_DEBOUNCE_MS) })
  }

  const cancel = (key: string): void => {
    const p = pending.get(key)
    if (p) clearTimeout(p.timer)
    pending.delete(key)
  }

  const cancelAll = (): void => {
    for (const key of [...pending.keys()]) cancel(key)
  }

  const flushAll = (): Promise<void> =>
    Promise.all([...new Set([...pending.keys(), ...inFlight.keys()])].map(flush)).then(
      () => undefined,
    )

  // beforeunload can't await, but the IPC send gets out before teardown.
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      for (const key of pending.keys()) void flush(key)
    })
  }

  const settled = (key: string): Promise<void> => inFlight.get(key) ?? Promise.resolve()

  return { schedule, flush, settled, flushAll, cancel, cancelAll }
}

/** Everything owed is already landed when a switch holds. Holds nest, so a second switch started mid-switch keeps the first's owed saves waiting until both are done. */
export function holdSaves(): void {
  if (hold) {
    hold.depth += 1
    return
  }
  let release = (): void => {}
  const done = new Promise<void>((resolve) => {
    release = resolve
  })
  hold = { depth: 1, done, release }
}

export function releaseSaves(): void {
  if (!hold || --hold.depth > 0) return
  const { release } = hold
  hold = null
  release()
}

const pageWriter = createBodyWriter('the page')

let staleSink: ((path: string, body: string) => void) | null = null

export function setStaleSaveSink(fn: ((path: string, body: string) => void) | null): void {
  staleSink = fn
}

export function schedulePageSave(path: string, body: string): void {
  writeThroughBody(path, body)
  pageWriter.schedule(path, async () => {
    writeThroughBody(path, body)
    followBody(path)
    const sent = readBodyBase(path)?.hash ?? ''
    const r = await host().ask('page:updateBody', path, body, sent)
    // A landing that moved the base while this save was out keeps it; the save no longer names the file's last state.
    if (r.ok && !r.value.stale) {
      if (readBodyBase(path)?.hash === sent) setBodyBase(path, { text: body, hash: r.value.hash })
    } else if (r.ok) staleSink?.(path, body)
    return r
  })
}

/** Resolves once the page's save in flight, if any, has landed and set its base. */
export function settlePageSave(path: string): Promise<void> {
  return pageWriter.settled(path)
}

/** Awaitable, so a host's close path lands the write before the world changes. */
export function flushPageSave(path: string): Promise<void> {
  return pageWriter.flush(path)
}

export function cancelPageSave(path: string): void {
  pageWriter.cancel(path)
}

/** The nexus-adopt path awaits this while the OLD root is still bound — a write after the flip would bind the new nexus and overwrite a same-relative-path file (data loss). */
export function flushAllPageSaves(): Promise<void> {
  return pageWriter.flushAll()
}

// Tab and window sets, tile layouts, and the Matrix frame each write whole on every change, and the Matrix positions send every row not yet sent; one debounced write per key coalesces a burst into the last state.
export const sessionWriter = createBodyWriter('the session', true)

export function scheduleTabsSave(set: StoredTabSet): void {
  sessionWriter.schedule('tabs', () => host().ask('tabs:save', set))
}

export function scheduleWindowsSave(file: WindowsFile): void {
  sessionWriter.schedule('windows', () => host().ask('windows:save', file))
}

export function flushAllSessionSaves(): Promise<void> {
  return sessionWriter.flushAll()
}

/** Once the root has flipped, anything the old Nexus still owed would land in the new one. */
export function cancelAllSaves(): void {
  pageWriter.cancelAll()
  sessionWriter.cancelAll()
}
