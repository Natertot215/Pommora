// One debounced writer PER PATH, shared by every host that edits a page, so the newest edit from ANY host owns the file's single pending write rather than hosts racing private debounces to last-writer-wins.

import type { WindowsFile } from '@pommora/core/Interface/Windows/windowRecord'
import type { StoredTabSet } from '@pommora/core/Navigation/navRef'
import type { Result } from '@pommora/core/Contract/result'
import { notifyError } from '../Interface/Notifications/notifications'
import { readBodyBase, setBodyBase, writeThroughBody } from './pageDetailCache'
import { host } from '../Platform/dialer'

const SAVE_DEBOUNCE_MS = 400

type Save = () => Promise<Result<unknown>>

interface BodyWriter {
  schedule: (key: string, save: Save) => void
  flush: (key: string) => Promise<void>
  flushAll: () => Promise<void>
  cancel: (key: string) => void
  cancelAll: () => void
}

/** A refused save is dropped, never retried: the next edit schedules the whole body again. `what` names the lost write in the one notice a refusal posts; a writer without it drops quietly. */
export function createBodyWriter(what?: string): BodyWriter {
  const pending = new Map<string, { save: Save; timer: ReturnType<typeof setTimeout> }>()

  const flush = (key: string): Promise<void> => {
    const p = pending.get(key)
    if (!p) return Promise.resolve()
    clearTimeout(p.timer)
    pending.delete(key)
    return p.save().then((r) => {
      if (!r.ok && what) notifyError(`Couldn’t save ${what}: ${r.error.message}`)
    })
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
    Promise.all([...pending.keys()].map(flush)).then(() => undefined)

  // beforeunload can't await, but the IPC send gets out before teardown.
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      for (const key of pending.keys()) void flush(key)
    })
  }

  return { schedule, flush, flushAll, cancel, cancelAll }
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
    const r = await host().ask('page:updateBody', path, body, readBodyBase(path)?.hash ?? '')
    if (r.ok && !r.value.stale) setBodyBase(path, { text: body, hash: r.value.hash })
    else if (r.ok) staleSink?.(path, body)
    return r
  })
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

// Tab and window sets serialize the whole set on every activation; one debounced write per key coalesces a burst into the last state.
const sessionWriter = createBodyWriter()

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
