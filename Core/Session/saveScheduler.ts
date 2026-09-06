// THE page-body autosave: one debounced writer PER PATH, shared by every host that edits a page, so
// the newest edit from ANY host owns the file's single pending write rather than hosts racing private
// debounces to last-writer-wins. Built on the shared body-writer machinery.

import { writeThroughBody } from './pageDetailCache'
import { host } from '../Platform/dialer'

const SAVE_DEBOUNCE_MS = 400

type Ack = { ok: boolean }
type Save = () => Promise<Ack>

interface BodyWriter {
  schedule: (key: string, body: string, save: Save) => void
  flush: (key: string) => Promise<void>
  flushAll: () => Promise<void>
  cancel: (key: string) => void
}

export function createBodyWriter(): BodyWriter {
  const pending = new Map<
    string,
    { body: string; save: Save; timer: ReturnType<typeof setTimeout> }
  >()

  const flush = (key: string): Promise<void> => {
    const p = pending.get(key)
    if (!p) return Promise.resolve()
    clearTimeout(p.timer)
    pending.delete(key)
    return p.save().then((ack) => {
      if (!ack.ok && !pending.has(key)) schedule(key, p.body, p.save)
    })
  }

  const schedule = (key: string, body: string, save: Save): void => {
    const prev = pending.get(key)
    if (prev) clearTimeout(prev.timer)
    pending.set(key, { body, save, timer: setTimeout(() => void flush(key), SAVE_DEBOUNCE_MS) })
  }

  const cancel = (key: string): void => {
    const p = pending.get(key)
    if (p) clearTimeout(p.timer)
    pending.delete(key)
  }

  const flushAll = (): Promise<void> =>
    Promise.all([...pending.keys()].map(flush)).then(() => undefined)

  // beforeunload can't await, but the IPC send gets out before teardown.
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      for (const key of pending.keys()) void flush(key)
    })
  }

  return { schedule, flush, flushAll, cancel }
}

const pageWriter = createBodyWriter()

export function schedulePageSave(path: string, body: string): void {
  // Write through to the warm detail slot immediately, so a remounting embed inside the debounce
  // window can never seed on pre-edit prose; re-asserted inside the write so cache and disk still
  // converge across a failed write's requeue.
  writeThroughBody(path, body)
  pageWriter.schedule(path, body, () => {
    writeThroughBody(path, body)
    return host().ask('page:updateBody', path, body)
  })
}

/** Land the path's pending body now — awaitable, so a host's close path lands the write before the
 *  world changes. */
export function flushPageSave(path: string): Promise<void> {
  return pageWriter.flush(path)
}

/** Drop the path's pending save unwritten — a body replaced from outside the editor must not be
 *  overwritten by the text it replaced. */
export function cancelPageSave(path: string): void {
  pageWriter.cancel(path)
}

/** Land every pending page write. The nexus-adopt path awaits this while the OLD root is still bound —
 *  a write after the flip would bind the new nexus and overwrite a same-relative-path file (data loss). */
export function flushAllPageSaves(): Promise<void> {
  return pageWriter.flushAll()
}
