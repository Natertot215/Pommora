// Store-free, since the slices report through these writers: the notice on screen lives here, beside them.
import { useSyncExternalStore } from 'react'
import type { Result } from '@pommora/core/Contract/result'
import { pushUndo } from '@pommora/core/Session/undo'
import type { CascadeReport } from '@pommora/core/Nexus/cascade'

export interface Notification {
  message: string
  segment?: string
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

const tryAgain = (run: () => void): Notification['action'] => ({ label: 'Try Again', run })

/** A refusal that may pass on a second attempt, which its label offers. */
export function notifyRetry(message: string, retry: () => void): void {
  post({ message, tone: 'error', action: tryAgain(retry) })
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

export function notifyDeleted(
  title: string,
  undo?: () => void | Promise<void>,
  { pages = [], warning }: Partial<Pick<CascadeReport, 'pages' | 'warning'>> = {},
  retry?: () => void,
): () => void {
  const parts = [`Deleted “${title}”`]
  if (pages.length) parts.push(`${pages.length} Internal ${pages.length === 1 ? 'Link' : 'Links'}`)
  if (warning) parts[parts.length - 1] += `. ${warning}`
  const [message, segment] = parts
  return notifyUndoable(
    message,
    undo,
    warning ? 'error' : 'normal',
    warning ? retry : undefined,
    segment,
  )
}

let undoing: Promise<unknown> = Promise.resolve()

/** Answers a spend: once what the undo would reverse is undone some other way, its label leaves and the chord passes it by. */
export function notifyUndoable(
  message: string,
  undo?: () => void | Promise<void>,
  tone: Notification['tone'] = 'normal',
  retry?: () => void,
  segment?: string,
): () => void {
  const retried = retry && tryAgain(retry)
  const note = { message, segment, tone }
  if (!undo) {
    const id = post({ ...note, action: retried })
    return () => dismissNotification(id)
  }
  // The label's Undo and the undo chord are one shot between them, so a restore cannot run twice and mint a second copy, and undos run in turn, so each restore reads the tree the one before it left.
  let fired = false
  const once = (): boolean => {
    if (fired) return false
    fired = true
    undoing = undoing.then(undo, undo)
    return true
  }
  const id = post({ ...note, action: retried ?? { label: 'Undo', run: () => void once() } })
  pushUndo(() => {
    if (!once()) return false
    dismissNotification(id)
    return true
  })
  return () => {
    fired = true
    dismissNotification(id)
  }
}
