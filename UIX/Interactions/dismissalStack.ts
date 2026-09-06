import { useEffect, useRef, useSyncExternalStore } from 'react'

export type DismissalEntry = {
  layer: () => Element | null
  trigger?: () => Element | null
  dismiss?: () => void
  shield?: boolean
  outsidePress?: boolean
}

type Live = { entry: DismissalEntry; closing: boolean }

let entries: Live[] = []
const subscribers = new Set<() => void>()
const notify = (): void => {
  for (const fn of subscribers) fn()
}

const dismissable = (e: Live): boolean => !e.closing && e.entry.dismiss !== undefined
const holds = (e: Live, target: Node): boolean =>
  e.entry.layer()?.contains(target) === true || e.entry.trigger?.()?.contains(target) === true
const exiting = (): boolean => entries.some((e) => e.closing)

export const SHIELD_ATTR = 'data-dismissal-shield'

const beneathShield = (e: PointerEvent): Node => {
  const target = e.target as Element
  if (!target.hasAttribute?.(SHIELD_ATTR)) return target
  return (
    document
      .elementsFromPoint?.(e.clientX, e.clientY)
      .find((el) => !el.hasAttribute(SHIELD_ATTR)) ?? target
  )
}

const onPointerDown = (e: PointerEvent): void => {
  if (e.button !== 0 || exiting()) return
  const target = beneathShield(e)
  let keep = -1
  for (let i = entries.length - 1; i >= 0; i--) {
    if (holds(entries[i], target)) {
      keep = i
      break
    }
  }
  for (let i = entries.length - 1; i > keep; i--) {
    if (dismissable(entries[i]) && entries[i].entry.outsidePress !== false)
      entries[i].entry.dismiss?.()
  }
}

const onKeyDown = (e: KeyboardEvent): void => {
  if (e.key !== 'Escape' || e.defaultPrevented) return
  for (let i = entries.length - 1; i >= 0; i--) {
    if (!dismissable(entries[i])) continue
    e.preventDefault()
    entries[i].entry.dismiss?.()
    return
  }
}

const listen = (on: boolean): void => {
  if (on) {
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
  } else {
    document.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('keydown', onKeyDown)
  }
}

export type DismissalHandle = {
  setClosing: (closing: boolean) => void
  shields: () => boolean
  release: () => void
}

export function pushDismissal(entry: DismissalEntry): DismissalHandle {
  const live: Live = { entry, closing: false }
  if (entries.length === 0) listen(true)
  entries = [...entries, live]
  notify()
  return {
    setClosing: (closing) => {
      live.closing = closing
    },
    shields: () => entries.find((e) => e.entry.shield) === live,
    release: () => {
      if (!entries.includes(live)) return
      entries = entries.filter((e) => e !== live)
      if (entries.length === 0) listen(false)
      notify()
    },
  }
}

const subscribe = (fn: () => void): (() => void) => {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

export function useDismissal(active: boolean, closing: boolean, entry: DismissalEntry): boolean {
  const handle = useRef<DismissalHandle | null>(null)
  const entryRef = useRef(entry)
  entryRef.current = entry
  useEffect(() => {
    if (!active) return
    handle.current = pushDismissal({
      layer: () => entryRef.current.layer(),
      trigger: () => entryRef.current.trigger?.() ?? null,
      get dismiss() {
        return entryRef.current.dismiss
      },
      get shield() {
        return entryRef.current.shield
      },
      get outsidePress() {
        return entryRef.current.outsidePress
      },
    })
    return () => {
      handle.current?.release()
      handle.current = null
    }
  }, [active])
  useEffect(() => {
    handle.current?.setClosing(closing)
  }, [closing])
  return useSyncExternalStore(subscribe, () => handle.current?.shields() === true)
}
