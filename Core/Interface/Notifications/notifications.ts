// Store-free, since the slices report through these writers: the notice on screen lives here, beside them.
import { useSyncExternalStore } from 'react'
import type { Result } from '@pommora/core/Contract/result'
import { pushUndo } from '@pommora/core/Session/undo'

export interface Notification {
  message: string
  tone: 'normal' | 'error'
  action?: { label: string; run: () => void | Promise<void> }
}

type Posted = Notification & { id: number }

let shown: Posted | null = null
let seq = 0
const listeners = new Set<() => void>()

const show = (next: Posted | null): void => {
  shown = next
  for (const fn of listeners) fn()
}

function subscribeNotification(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const currentNotification = (): Posted | null => shown

export const useNotification = (): Posted | null =>
  useSyncExternalStore(subscribeNotification, currentNotification)

export function dismissNotification(id: number): void {
  if (shown?.id === id) show(null)
}

export const clearNotification = (): void => show(null)

const post = (n: Notification): number => {
  show({ ...n, id: ++seq })
  return seq
}

/** An outcome in one line, drawn as a refusal when any of it failed. */
export function notifyReport(message: string, failed: boolean): void {
  post({ message, tone: failed ? 'error' : 'normal' })
}

/** Every refusal of something the user did reaches them here; the answer says whether it went through. */
export function reportRefusal<T>(r: Result<T>): r is { ok: true; value: T } {
  if (!r.ok) notifyReport(r.error.message, true)
  return r.ok
}

/** A write nothing waits on still answers: a refusal posts a notice naming `what`, or, for `quiet` chrome, logs it. */
export const persist = (
  what: string,
  reply: Promise<Result<unknown>>,
  quiet = false,
): Promise<void> =>
  reply.then((r) => {
    if (r.ok) return
    const line = `Couldn’t save ${what}: ${r.error.message}`
    if (quiet) console.error(line)
    else notifyReport(line, true)
  })

export const unrestoredLine = (titles: string[]): string =>
  `${titles.join(', ')} didn’t get ${titles.length === 1 ? 'its' : 'their'} value back.`

export const notifyDeleted = (title: string, undo?: () => void | Promise<void>): void =>
  notifyUndoable(`Deleted “${title}”`, undo)

export function notifyUndoable(message: string, undo?: () => void | Promise<void>): void {
  if (!undo) {
    post({ message, tone: 'normal' })
    return
  }
  // The label's Undo and the undo chord are one shot between them, so a restore cannot run twice and mint a second copy.
  let fired = false
  const once = (): boolean => {
    if (fired) return false
    fired = true
    void undo()
    return true
  }
  const id = post({ message, tone: 'normal', action: { label: 'Undo', run: () => void once() } })
  pushUndo(() => {
    if (!once()) return false
    dismissNotification(id)
    return true
  })
}
