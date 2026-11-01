// Store-free, since the slices report through these writers: the notice on screen and the stack of declared bars, the newest showing, live here, beside them.
import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { Result } from '../../Contract/result'
import { pushUndo } from '../../Session/undo'
import { inTurns } from '../../Platform/inTurns'
import { channel } from '@pommora/uix/Utilities/subscribable'

interface Notification {
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

const declared = channel<ReadonlyMap<object, ActionBar>>(new Map())

const withdraw = (declarer: object): void => {
  const next = new Map(declared.get())
  if (next.delete(declarer)) declared.set(next)
}

export const useActionBar = (): ActionBar | null =>
  useSyncExternalStore(declared.subscribe, () => [...declared.get().values()].at(-1) ?? null)

/** Declared over every standing bar only while its view is `shown`, as the count publishes: a parked view's bar would stand over another tab's view. A bar its declarer replaces keeps its place in the stack. */
export function useDeclareActions(bar: ActionBar | null, shown: boolean): void {
  const declarer = useRef({}).current
  useEffect(() => {
    if (shown && bar) declared.set(new Map(declared.get()).set(declarer, bar))
    else withdraw(declarer)
  }, [declarer, shown, bar])
  useEffect(() => () => withdraw(declarer), [declarer])
}

export function dismissNotification(id: number): void {
  if (shown.get()?.id === id) shown.set(null)
}

export const clearNotification = (): void => shown.set(null)

const post = (n: Notification): number => {
  shown.set({ ...n, id: ++seq })
  return seq
}

const undoing = inTurns()

/** A notice offering Undo when given, or Try Again in its place when a retry is given, which leaves any Undo to the chord. Answers a spend: once what the undo would reverse is undone some other way, its label leaves and the chord passes it by. */
export function notify(
  message: string,
  undo?: () => void | Promise<void>,
  {
    tone = 'normal',
    retry,
    segment,
  }: { tone?: Notification['tone']; retry?: () => void; segment?: string } = {},
): () => void {
  const retried = retry && { label: 'Try Again', run: retry }
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

/** A refusal, offering Try Again when it may pass on a second attempt. */
export const notifyError = (message: string, retry?: () => void): (() => void) =>
  notify(message, undefined, { tone: 'error', retry })

/** Every refused Result of something the user did reaches them here, offering Try Again when a retry is given; the answer says whether it went through. */
export function reportRefusal<T>(r: Result<T>, retry?: () => void): r is { ok: true; value: T } {
  if (!r.ok) notifyError(r.error.message, retry)
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
    else notifyError(line)
  })

export const notifyDeleted = (title: string, undo: () => void | Promise<void>): (() => void) =>
  notify(`Deleted “${title}”`, undo)
