import type { Result } from '@pommora/core/Contract/result'
import { pushValueUndo } from '@pommora/core/Properties/valueUndo'
import { useSession } from '../../Session/store'

export interface Notification {
  message: string
  tone: 'normal' | 'error'
  action?: { label: string; run: () => void | Promise<void> }
}

const post = (n: Notification): void => useSession.getState().notify(n)

/** An outcome in one line, drawn as a refusal when any of it failed. */
export const notifyReport = (message: string, failed: boolean): void =>
  post({ message, tone: failed ? 'error' : 'normal' })

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

/** A system-trash delete mints no bundle, so it offers no Undo — the artifact left the nexus and there is nothing to name. */
export const notifyTrashed = (title: string, bundlePath?: string): void =>
  notifyDeleted(
    title,
    bundlePath ? () => void useSession.getState().mutate({ op: 'restore', bundlePath }) : undefined,
  )

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
  post({ message, tone: 'normal', action: { label: 'Undo', run: () => void once() } })
  const id = useSession.getState().notification?.id
  pushValueUndo(() => {
    if (!once()) return false
    if (id !== undefined) useSession.getState().dismissNotification(id)
    return true
  })
}
