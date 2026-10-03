import { type RefObject, useEffect, useRef, useSyncExternalStore } from 'react'
import { suppressReleaseClick } from './shared'
import { useLatest } from '../Utilities/stableApi'
import { emitter } from '../Utilities/subscribable'

type DismissalEntry = {
  layer: () => Element | null
  /** The element whose window decides whether Escape reaches this entry; the layer when absent. */
  scope?: () => Element | null
  trigger?: () => Element | null
  dismiss?: () => void
  shield?: boolean
  outsidePress?: boolean
}

type Live = { entry: DismissalEntry; closing: boolean }

let entries: Live[] = []
const changed = emitter()

let windows: HTMLElement[] = []

const raiseWindow = (el: HTMLElement): void => {
  if (windows.at(-1) === el) return
  windows = [...windows.filter((w) => w !== el), el]
  for (const [i, w] of windows.entries()) w.style.setProperty('--window-rank', `${i}`)
}

/** The window `node` sits in, or, for a layer portalled out of one, the window its trigger sits in. */
export const ownerWindow = (node: Element | null): HTMLElement | null => {
  if (!node) return null
  const owner = windows.find((w) => w.contains(node))
  if (owner) return owner
  const opener = entries.find((e) => e.entry.layer()?.contains(node))?.entry.trigger?.()
  return opener ? ownerWindow(opener) : null
}

const dismissable = (e: Live): boolean => !e.closing && e.entry.dismiss !== undefined
const holds = (e: Live, target: Node): 'layer' | 'trigger' | null =>
  e.entry.layer()?.contains(target) === true
    ? 'layer'
    : e.entry.trigger?.()?.contains(target) === true
      ? 'trigger'
      : null
const closes = (e: Live): boolean => dismissable(e) && e.entry.outsidePress !== false
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
  let onTrigger = false
  for (let i = entries.length - 1; i >= 0; i--) {
    const held = holds(entries[i], target)
    if (held === null) continue
    onTrigger = held === 'trigger' && closes(entries[i])
    keep = onTrigger ? i - 1 : i
    break
  }
  for (let i = entries.length - 1; i > keep; i--)
    if (closes(entries[i])) entries[i].entry.dismiss?.()
  if (onTrigger) suppressReleaseClick()
}

const onKeyDown = (e: KeyboardEvent): void => {
  if (e.key !== 'Escape' || e.defaultPrevented) return
  for (let i = entries.length - 1; i >= 0; i--) {
    const live = entries[i]
    const owner = ownerWindow(live.entry.scope?.() ?? live.entry.layer())
    if (!dismissable(live) || (owner !== null && owner !== windows.at(-1))) continue
    e.preventDefault()
    live.entry.dismiss?.()
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
  changed.emit()
  return {
    setClosing: (closing) => {
      live.closing = closing
    },
    shields: () => entries.find((e) => e.entry.shield) === live,
    release: () => {
      if (!entries.includes(live)) return
      entries = entries.filter((e) => e !== live)
      if (entries.length === 0) listen(false)
      changed.emit()
    },
  }
}

export function useDismissal(active: boolean, closing: boolean, entry: DismissalEntry): boolean {
  const handle = useRef<DismissalHandle | null>(null)
  const entryRef = useLatest(entry)
  useEffect(() => {
    if (!active) return
    handle.current = pushDismissal({
      layer: () => entryRef.current.layer(),
      scope: () => entryRef.current.scope?.() ?? null,
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
  return useSyncExternalStore(changed.subscribe, () => handle.current?.shields() === true)
}

export function useEscape(
  active: boolean,
  dismiss: (() => void) | undefined,
  scope?: () => Element | null,
): void {
  useDismissal(active, false, { layer: () => null, scope, dismiss, outsidePress: false })
}

export function useWindowOrder(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  raiseOn?: unknown,
): () => void {
  useEffect(() => {
    const el = ref.current
    if (!active || !el) return
    const elsewhere = windows.some((w) => w !== el && w.contains(document.activeElement))
    raiseWindow(el)
    if (elsewhere) el.focus({ preventScroll: true })
    // Focus entering a frame (a Web window's page) fires no focusin in this document, only the window's blur.
    const onFrameFocus = (): void => {
      const frame = document.activeElement
      if (frame?.matches('iframe, webview') && el.contains(frame)) raiseWindow(el)
    }
    window.addEventListener('blur', onFrameFocus)
    return () => {
      window.removeEventListener('blur', onFrameFocus)
      windows = windows.filter((w) => w !== el)
    }
  }, [active, raiseOn])
  return () => {
    if (active && ref.current) raiseWindow(ref.current)
  }
}
