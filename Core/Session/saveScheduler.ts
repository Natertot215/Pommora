// One debounced writer PER PATH, shared by every host that edits a page, so the newest edit from ANY host owns the file's single pending write rather than hosts racing private debounces to last-writer-wins.

import type { WindowsFile } from '../Interface/Windows/windowRecord'
import type { StoredTabSet } from '../Navigation/navRef'
import type { BodyWrite } from '../Pages/pageDetail'
import { ok, type Result } from '../Contract/result'
import { persist } from '../Interface/Notifications/notifications'
import {
  dropCacheDetail,
  fetchPageResult,
  followBody,
  readBodyBase,
  setBodyBase,
  writeThroughBody,
} from './pageDetailCache'
import { dialer } from '../Platform/dialer'

const SAVE_DEBOUNCE_MS = 400

type Save = () => Promise<Result<unknown>>

// Set while a Nexus switch is in flight: a save that falls due then can't tell which root would take it, so it waits for the switch and then lands or is cancelled with the old Nexus.
let hold: { depth: number; done: Promise<void>; release: () => void } | null = null

export interface BodyWriter {
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

export const pageWriter = createBodyWriter('the page')

let staleSink: ((path: string, body: string) => void) | null = null

export function setStaleSaveSink(fn: ((path: string, body: string) => void) | null): void {
  staleSink = fn
}

/** Where one body reads, writes, and keeps the text it loses: a page through its own channels, a markdown tile through its host's. */
export interface BodyIO {
  writer: BodyWriter
  read: (key: string) => Promise<Result<{ body: string; hash: string }>>
  write: (key: string, body: string, baseHash: string) => Promise<Result<BodyWrite>>
  capture: (key: string, text: string) => void
  stale: (key: string, body: string) => void
}

export const pageIO: BodyIO = {
  writer: pageWriter,
  read: (path) => {
    dropCacheDetail(path)
    return fetchPageResult(path).then((r) =>
      r.ok ? ok({ body: r.value.body, hash: r.value.bodyHash }) : r,
    )
  },
  write: (path, body, baseHash) => dialer().ask('page:updateBody', path, body, baseHash),
  capture: (path, text) =>
    void persist('the conflicting version', dialer().ask('sync:captureLocal', path, text)),
  stale: (path, body) => staleSink?.(path, body),
}

export function scheduleBodySave(key: string, body: string, io: BodyIO): void {
  writeThroughBody(key, body)
  io.writer.schedule(key, async () => {
    writeThroughBody(key, body)
    followBody(key)
    const sent = readBodyBase(key)?.hash ?? ''
    const r = await io.write(key, body, sent)
    // A landing that moved the base while this save was out keeps it; the save no longer names the file's last state.
    if (r.ok && !r.value.stale) {
      if (readBodyBase(key)?.hash === sent) setBodyBase(key, { text: body, hash: r.value.hash })
    } else if (r.ok) io.stale(key, body)
    return r
  })
}

// Tab and window sets, tile layouts, and the Matrix lens each write whole on every change, and the Matrix positions send every row not yet sent; one debounced write per key coalesces a burst into the last state.
export const sessionWriter = createBodyWriter('the session', true)

export function scheduleTabsSave(set: StoredTabSet): void {
  sessionWriter.schedule('tabs', () => dialer().ask('tabs:save', set))
}

export function scheduleWindowsSave(file: WindowsFile): void {
  sessionWriter.schedule('windows', () => dialer().ask('windows:save', file))
}

// Sent at once unless a switch holds it, and read from the store when it goes, so a change made mid-switch lands in whichever Nexus stays open.
const devicePrefsWriter = createBodyWriter('the setting')

export function saveDevicePrefs(save: Save): void {
  devicePrefsWriter.schedule('devicePrefs', save)
  void devicePrefsWriter.flush('devicePrefs')
}

export function flushAllSessionSaves(): Promise<void> {
  return Promise.all([sessionWriter.flushAll(), devicePrefsWriter.flushAll()]).then(() => undefined)
}

/** Once the root has flipped, anything the old Nexus still owed would land in the new one. */
export function cancelAllSaves(): void {
  pageWriter.cancelAll()
  sessionWriter.cancelAll()
  devicePrefsWriter.cancelAll()
}
