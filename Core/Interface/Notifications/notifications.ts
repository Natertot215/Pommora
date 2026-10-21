// Store-free, since the slices report through these writers: the notice on screen and the bar the shown view declares live here, beside them.
import { useEffect, useSyncExternalStore } from 'react'
import type { Result } from '../../Contract/result'
import { pushUndo } from '../../Session/undo'
import type { CascadeReport } from '../../Nexus/cascade'
import type { Unreadable } from '../../Nexus/tree'
import { titleFromPath } from '../../Paths/posix'
import { inTurns } from '../../Platform/inTurns'
import { channel } from '@pommora/uix/Utilities/subscribable'
import { useContentHost } from '../contentHost'

export interface Notification {
  message: string
  segment?: string
  tone: 'normal' | 'error'
  action?: { label: string; run: () => void | Promise<void> }
}

type Posted = Notification & { id: number }

const shown = channel<Posted | null>(null)
let seq = 0

export const currentNotification = shown.get

export const useNotification = (): Posted | null => useSyncExternalStore(shown.subscribe, shown.get)

/** What a shown view offers for its checked rows: the count the bar reads and the two actions it runs. */
export interface ActionBar {
  count: string
  restore: () => void
  remove: () => void
}

const declared = channel<ActionBar | null>(null)

export const useActionBar = (): ActionBar | null =>
  useSyncExternalStore(declared.subscribe, declared.get)

/** Declared only while its view shows, as the count publishes: a parked view's bar would stand over another tab's view. */
export function useDeclareActions(bar: ActionBar | null): void {
  const host = useContentHost()
  const live = host !== null && !host.parked
  useEffect(() => {
    if (!live) return
    declared.set(bar)
    return () => declared.set(null)
  }, [live, bar])
}

export function dismissNotification(id: number): void {
  if (shown.get()?.id === id) shown.set(null)
}

export const clearNotification = (): void => shown.set(null)

const post = (n: Notification): number => {
  shown.set({ ...n, id: ++seq })
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

export function warnCascade(cascade: { warning?: string }, retry?: () => void): void {
  if (!cascade.warning) return
  if (retry) notifyRetry(cascade.warning, retry)
  else notifyReport(cascade.warning, true)
}

export function notifyUnreadable(file: Unreadable, retry: () => void): void {
  const what =
    file.reason === 'contradicting' || file.reason === 'unparsed' ? 'invalid' : 'unreadable'
  notifyRetry(`'${titleFromPath(file.path)}' contains ${what} metadata`, retry)
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

/** One notice for what an action did: its head, an optional segment, and whatever didn't go as asked, which marks it failed and offers the retry. */
export function notifyOutcome(
  head: string,
  segment: string | undefined,
  unmet: (string | false | undefined)[],
  undo?: () => void | Promise<void>,
  retry?: () => void,
): () => void {
  const lines = unmet.filter(Boolean)
  const parts = segment ? [head, segment] : [head]
  if (lines.length) parts[parts.length - 1] += `. ${lines.join(' ')}`
  const failed = lines.length > 0
  return notifyUndoable(
    parts[0],
    undo,
    failed ? 'error' : 'normal',
    failed ? retry : undefined,
    parts[1],
  )
}

export function notifyDeleted(
  title: string,
  undo?: () => void | Promise<void>,
  { pages = [], warning }: Partial<Pick<CascadeReport, 'pages' | 'warning'>> = {},
  retry?: () => void,
): () => void {
  const links = pages.length
    ? `${pages.length} Internal ${pages.length === 1 ? 'Link' : 'Links'}`
    : undefined
  return notifyOutcome(`Deleted “${title}”`, links, [warning], undo, retry)
}

const undoing = inTurns()

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
    void undoing(undo)
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
