import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { stack } from '@renderer/DesignSystem/Tokens/stack'
import { moveItem } from '@renderer/DesignSystem/Util/moveItem'
import { DEFAULT_FEEL, type Feel } from '../Animation/feel'
import { findScroller, startAutoScroll } from './autoscroll'
import { announce, ensureInstructions, INSTRUCTIONS_ID } from './a11y'
import { ARROW_DIRS, keyboardNext } from './keyboard'
import {
  ACTIVATION,
  HYSTERESIS,
  SETTLE_FALLBACK,
  px,
  toBox,
  type Box,
  type DragItem,
  type DragNotify,
  type DropState,
  type Modifier,
} from './shared'

// Mutable drag scratch — read inside pointer/rAF/keydown callbacks without stale closures. Every
// lift installs a WHOLE fresh scratch over `blankDrag()`, so a press and a keyboard lift each state
// only what they actually know; nothing survives from the gesture before it.
type DragScratch = {
  id: string
  pid: number
  el: HTMLElement | null
  startX: number
  startY: number
  lastX: number
  lastY: number
  active: boolean
  activeIdx: number
  rects: Box[]
  over: number
  bounds: Box | null
  scroller: HTMLElement | null
  scroll0X: number
  scroll0Y: number
  handlers: { move: (e: PointerEvent) => void; up: () => void; cancel: () => void } | null
  kdown: ((e: KeyboardEvent) => void) | null
}
const blankDrag = (): DragScratch => ({
  id: '',
  pid: -1,
  el: null,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  active: false,
  activeIdx: -1,
  rects: [],
  over: -1,
  bounds: null,
  scroller: null,
  scroll0X: 0,
  scroll0Y: 0,
  handlers: null,
  kdown: null,
})

type ZoneValue = {
  ids: string[]
  feel: Feel
  activeId: string | null
  overIndex: number
  rects: Box[]
  dropState: DropState
  keyboard: boolean
  disabled: boolean
  swap: boolean
  itemRole: string | null
  register: (id: string, el: HTMLElement | null) => void
  begin: (id: string, e: ReactPointerEvent) => void
  liftKeyboard: (id: string) => void
}
const ZoneCtx = createContext<ZoneValue | null>(null)

export type ZoneProps = DragNotify & {
  ids: string[]
  onReorder?: (activeId: string, overId: string) => void
  /** Return false (or a Promise<false>) to reject; the item animates back to origin. A Promise
   *  holds the item lifted (`pending`) until it resolves. */
  canReorder?: (activeId: string, overId: string) => boolean | Promise<boolean>
  disabled?: boolean
  axis?: 'x' | 'y'
  bounds?: 'parent' | 'window'
  modifiers?: Modifier[]
  swap?: boolean
  itemRole?: string | null
  getItemLabel?: (id: string) => string
  children: ReactNode
}

export function Zone({
  ids,
  onReorder,
  canReorder,
  disabled = false,
  axis,
  bounds,
  modifiers,
  swap = false,
  itemRole = 'button',
  getItemLabel,
  children,
  ...notify
}: ZoneProps): React.JSX.Element {
  const feel = DEFAULT_FEEL

  const els = useRef(new Map<string, HTMLElement>())
  const idsRef = useRef(ids)
  idsRef.current = ids
  const notifyRef = useRef(notify)
  notifyRef.current = notify
  const cbRef = useRef({ onReorder, canReorder })
  cbRef.current = { onReorder, canReorder }
  const optsRef = useRef({ axis, bounds, modifiers })
  optsRef.current = { axis, bounds, modifiers }
  const labelRef = useRef(getItemLabel)
  labelRef.current = getItemLabel

  const [activeId, setActiveId] = useState<string | null>(null)
  const [overIndex, setOverIndex] = useState(-1)
  const [rects, setRects] = useState<Box[]>([])
  const [dropState, setDropState] = useState<DropState>('idle')
  const [keyboard, setKeyboard] = useState(false)

  const drag = useRef(blankDrag())

  // This Zone's auto-scroll stopper (instance-scoped). detach() calls it rather than the global
  // stop, so a sibling Zone's unmount can't halt THIS Zone's live drag.
  const stopScroll = useRef<(() => void) | null>(null)

  const labelOf = (id: string): string => labelRef.current?.(id) ?? id
  const register = (id: string, el: HTMLElement | null): void => {
    if (el) els.current.set(id, el)
    else els.current.delete(id)
  }

  const measure = (): Box[] | null => {
    const out: Box[] = []
    for (const id of idsRef.current) {
      const el = els.current.get(id)
      if (!el) return null
      out.push(toBox(el))
    }
    return out
  }

  const constrain = (dx: number, dy: number): { x: number; y: number } => {
    const o = optsRef.current
    const ar = drag.current.rects[drag.current.activeIdx]
    let x = o.axis === 'y' ? 0 : dx
    let y = o.axis === 'x' ? 0 : dy
    const bnd = drag.current.bounds
    if (bnd && ar) {
      x = Math.max(bnd.left - ar.left, Math.min(x, bnd.left + bnd.width - (ar.left + ar.width)))
      y = Math.max(bnd.top - ar.top, Math.min(y, bnd.top + bnd.height - (ar.top + ar.height)))
    }
    if (o.modifiers && ar)
      for (const m of o.modifiers) ({ x, y } = m({ x, y }, { activeRect: ar, bounds: bnd }))
    return { x, y }
  }

  const track = (cx: number, cy: number): void => {
    const d = drag.current
    if (!d.active) return
    const comp = d.scroller
      ? { x: d.scroller.scrollLeft - d.scroll0X, y: d.scroller.scrollTop - d.scroll0Y }
      : { x: 0, y: 0 }
    const { x: dx, y: dy } = constrain(cx - d.startX, cy - d.startY)
    const px = d.rects[d.activeIdx].cx + dx + comp.x
    const py = d.rects[d.activeIdx].cy + dy + comp.y
    let best = d.over
    let bestDist = Infinity
    d.rects.forEach((b, i) => {
      const dist = Math.hypot(b.cx - px, b.cy - py)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    })
    const curDist = Math.hypot(d.rects[d.over].cx - px, d.rects[d.over].cy - py)
    const next = best !== d.over && curDist - bestDist > HYSTERESIS ? best : d.over
    // Written straight to the element, never through React state: a delta in context would re-render
    // EVERY item on EVERY pointermove (O(N) reflow each → O(N²) per frame). useZoneItem omits
    // `transform` for the pointer-following item so React never clobbers this write.
    if (d.el) d.el.style.transform = `translate3d(${dx + comp.x}px, ${dy + comp.y}px, 0)`
    if (next !== d.over) {
      d.over = next
      setOverIndex(next)
      notifyRef.current.onDragOver?.({ activeId: d.id, overId: idsRef.current[next] ?? null })
    }
  }

  const onMove = (e: PointerEvent): void => {
    const d = drag.current
    if (!d.active) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < ACTIVATION) return
      const measured = measure()
      const activeIdx = idsRef.current.indexOf(d.id)
      if (!measured || activeIdx === -1) {
        detach()
        return // can't drag without a complete layout snapshot
      }
      d.active = true
      d.activeIdx = activeIdx
      d.rects = measured
      d.over = activeIdx
      d.bounds = resolveBounds(optsRef.current.bounds, measured)
      d.scroller = findScroller(d.el, 'xy')
      d.scroll0X = d.scroller?.scrollLeft ?? 0
      d.scroll0Y = d.scroller?.scrollTop ?? 0
      setActiveId(d.id)
      setRects(measured)
      setOverIndex(activeIdx)
      setDropState('dragging')
      notifyRef.current.onDragStart?.({ activeId: d.id })
      announce(`Picked up ${labelOf(d.id)}.`)
      // The activation commit strips React's managed transform — re-assert it on the next frame so
      // the item can't paint at origin before the imperative follow takes over.
      requestAnimationFrame(() => {
        if (drag.current.active) track(drag.current.lastX, drag.current.lastY)
      })
      if (d.scroller) {
        stopScroll.current = startAutoScroll({
          getPoint: () => ({ x: drag.current.lastX, y: drag.current.lastY }),
          scroller: d.scroller,
          dragEl: d.el,
          axis: 'xy',
          onScrolled: () => track(drag.current.lastX, drag.current.lastY),
        })
      }
    }
    d.lastX = e.clientX
    d.lastY = e.clientY
    track(e.clientX, e.clientY)
  }

  const detach = (): void => {
    stopScroll.current?.()
    stopScroll.current = null
    const d = drag.current
    if (d.el && d.handlers) {
      d.el.removeEventListener('pointermove', d.handlers.move)
      d.el.removeEventListener('pointerup', d.handlers.up)
      d.el.removeEventListener('pointercancel', d.handlers.cancel)
      try {
        d.el.releasePointerCapture(d.pid)
      } catch {}
    }
    d.handlers = null
    if (d.kdown) {
      document.removeEventListener('keydown', d.kdown)
      d.kdown = null
    }
  }

  // Commits on the lifted item's `transitionend` — NOT a blind timer — because the CSS transition
  // starts a frame after a timer would, so a timer fires while gap items are still mid-flight and
  // snaps them short (the jerk). The lifted item's transition starts last, so its end means every
  // item has settled. Fallback timer covers the no-transition case.
  const settle = (targetIndex: number, commit: () => void): void => {
    setDropState('dropping')
    setOverIndex(targetIndex)
    const el = drag.current.el
    let done = false
    const finish = (): void => {
      if (done) return
      done = true
      drag.current.active = false
      el?.removeEventListener('transitionend', onEnd)
      setDropState('idle')
      setActiveId(null)
      setOverIndex(-1)
      setKeyboard(false)
      commit()
    }
    const onEnd = (e: TransitionEvent): void => {
      if (e.target === el && e.propertyName === 'transform') finish()
    }
    el?.addEventListener('transitionend', onEnd)
    window.setTimeout(finish, feel.duration + SETTLE_FALLBACK)
  }

  const resolveDrop = (
    over: number,
    activeIdx: number,
    activeId2: string,
    kbdEl: HTMLElement | null,
  ): void => {
    const overId = idsRef.current[over]
    const apply = (ok: boolean): void =>
      settle(ok ? over : activeIdx, () => {
        if (ok) cbRef.current.onReorder?.(activeId2, overId)
        notifyRef.current.onDragEnd?.({ activeId: activeId2, overId: ok ? overId : null })
        const label = labelOf(activeId2)
        announce(
          ok
            ? `Dropped ${label} at position ${over + 1}.`
            : `${label} returned to its original position.`,
        )
        if (kbdEl) requestAnimationFrame(() => kbdEl.focus())
      })
    if (over === activeIdx) {
      apply(false) // dropped on its own slot — animate home, no reorder
      return
    }
    const verdict = cbRef.current.canReorder?.(activeId2, overId) ?? true
    if (verdict instanceof Promise) {
      setDropState('pending')
      verdict.then(apply).catch(() => apply(false))
    } else {
      apply(verdict)
    }
  }

  const onUp = (): void => {
    detach()
    const d = drag.current
    if (!d.active) return // never passed activation — it was a click, not a drag
    resolveDrop(d.over, d.activeIdx, d.id, null)
  }

  const onCancel = (): void => {
    detach()
    const d = drag.current
    if (!d.active) return
    const activeId2 = d.id
    settle(d.activeIdx, () => notifyRef.current.onDragCancel?.({ activeId: activeId2 }))
  }

  const begin = (id: string, e: ReactPointerEvent): void => {
    if (disabled || e.button !== 0 || !e.isPrimary) return
    if (drag.current.active) return // a drag is in progress or still committing
    const el = els.current.get(id) ?? null
    if (!el) return
    const handlers = { move: onMove, up: onUp, cancel: onCancel }
    drag.current = {
      ...blankDrag(),
      id,
      pid: e.pointerId,
      el,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      handlers,
    }
    try {
      el.setPointerCapture(e.pointerId)
    } catch {}
    el.addEventListener('pointermove', handlers.move)
    el.addEventListener('pointerup', handlers.up)
    el.addEventListener('pointercancel', handlers.cancel)
  }

  const onKeyboard = (e: KeyboardEvent): void => {
    const d = drag.current
    if (!d.active) return
    if (e.key in ARROW_DIRS) {
      e.preventDefault()
      const next = keyboardNext(d.rects, d.over, ARROW_DIRS[e.key])
      if (next !== d.over) {
        d.over = next
        setOverIndex(next)
        announce(`Moved to position ${next + 1} of ${d.rects.length}.`)
      }
    } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab') {
      // Space/Enter/Tab all drop (dnd-kit parity) — Tab must commit, not tab focus away mid-drag.
      e.preventDefault()
      detach()
      resolveDrop(d.over, d.activeIdx, d.id, d.el)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      detach()
      const activeId2 = d.id
      const el = d.el
      const label = labelOf(activeId2)
      settle(d.activeIdx, () => {
        notifyRef.current.onDragCancel?.({ activeId: activeId2 })
        announce(`Movement canceled. ${label} returned to its original position.`)
        requestAnimationFrame(() => el?.focus())
      })
    }
  }

  // Listens on the document for arrows/Space/Esc after lifting — the lift keydown itself won't
  // re-fire into this new listener (listeners added mid-dispatch skip the current event).
  const liftKeyboard = (id: string): void => {
    if (disabled || drag.current.active) return
    const el = els.current.get(id) ?? null
    const measured = measure()
    const activeIdx = idsRef.current.indexOf(id)
    if (!el || !measured || activeIdx === -1) return
    drag.current = {
      ...blankDrag(),
      id,
      el,
      active: true,
      activeIdx,
      rects: measured,
      over: activeIdx,
      kdown: onKeyboard,
    }
    setActiveId(id)
    setRects(measured)
    setOverIndex(activeIdx)
    setKeyboard(true)
    setDropState('dragging')
    document.addEventListener('keydown', onKeyboard)
    notifyRef.current.onDragStart?.({ activeId: id })
    announce(`Picked up ${labelOf(id)}. Item ${activeIdx + 1} of ${measured.length}.`)
  }

  useEffect(() => () => detach(), [])
  useEffect(() => ensureInstructions(), [])

  const value = useMemo<ZoneValue>(
    () => ({
      ids,
      feel,
      activeId,
      overIndex,
      rects,
      dropState,
      keyboard,
      disabled,
      swap,
      itemRole,
      register,
      begin,
      liftKeyboard,
    }),
    [ids, activeId, overIndex, rects, dropState, keyboard, disabled, swap, itemRole],
  )
  return <ZoneCtx.Provider value={value}>{children}</ZoneCtx.Provider>
}

function resolveBounds(kind: 'parent' | 'window' | undefined, rects: Box[]): Box | null {
  if (kind === 'window')
    return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, cx: 0, cy: 0 }
  if (kind === 'parent' && rects.length) {
    const left = Math.min(...rects.map((r) => r.left))
    const top = Math.min(...rects.map((r) => r.top))
    const right = Math.max(...rects.map((r) => r.left + r.width))
    const bottom = Math.max(...rects.map((r) => r.top + r.height))
    return { left, top, width: right - left, height: bottom - top, cx: 0, cy: 0 }
  }
  return null
}

export function reflow(rects: Box[], overIndex: number, activeIdx: number, index: number): Box {
  return moveItem(rects, overIndex, activeIdx)[index] ?? rects[index]
}

export function useDropSlot(): Box | null {
  const ctx = useContext(ZoneCtx)
  if (ctx?.dropState !== 'dragging') return null
  return ctx.rects[ctx.overIndex] ?? null
}

export function useZoneItem(id: string): DragItem {
  const ctx = useContext(ZoneCtx)
  if (!ctx) throw new Error('useDragItem must be used inside a <SortableZone>')
  const {
    ids,
    feel,
    activeId,
    overIndex,
    rects,
    dropState,
    keyboard,
    disabled,
    swap,
    itemRole,
    register,
    begin,
    liftKeyboard,
  } = ctx
  const index = ids.indexOf(id)
  const isDragging = activeId === id
  const activeIdx = activeId ? ids.indexOf(activeId) : -1

  let transform: string | undefined = 'translate3d(0,0,0)'
  if (rects.length && activeIdx !== -1 && index !== -1) {
    if (isDragging) {
      // The lifted item sits on the over-slot for keyboard (eases each arrow step) or on drop; during
      // a live pointer drag, transform is omitted here so a re-render can't clobber track()'s
      // imperative follow write. (On the slot, no scroll comp — the slot scrolled with the item too.)
      const onSlot = keyboard || dropState === 'dropping'
      const t = onSlot ? (rects[overIndex] ?? rects[activeIdx]) : null
      transform = t
        ? `translate3d(${px(t.left - rects[activeIdx].left)}, ${px(t.top - rects[activeIdx].top)}, 0)`
        : undefined
    } else if (swap) {
      if (index === overIndex)
        transform = `translate3d(${px(rects[activeIdx].left - rects[index].left)}, ${px(rects[activeIdx].top - rects[index].top)}, 0)`
    } else {
      const t = reflow(rects, overIndex, activeIdx, index)
      transform = `translate3d(${px(t.left - rects[index].left)}, ${px(t.top - rects[index].top)}, 0)`
    }
  }

  // Non-active items ease the gap; the active item eases on drop and on every keyboard arrow step
  // (but follows the pointer with no transition during a pointer drag). At rest (idle) the inline
  // transition clears ENTIRELY — an inline value (even 'none') replaces the element's whole
  // stylesheet transition list, silently killing its own color/size motion (the tab bar's open/close
  // slide died this way). The commit still snaps pixel-identically because an engine item's
  // stylesheet must never transition `transform` — that's the zone contract; hover-pop and friends
  // live on an inner layer.
  const animate = isDragging ? dropState === 'dropping' || keyboard : dropState !== 'idle'
  return {
    setNodeRef: (el) => register(id, el),
    style: {
      transform,
      transition: animate ? `transform ${feel.duration}ms ${feel.easing}` : undefined,
      zIndex: isDragging ? stack.local.lifted : undefined,
      position: 'relative',
      touchAction: 'none',
    },
    handle: {
      onPointerDown: (e: ReactPointerEvent) => begin(id, e),
      onKeyDown: (e: ReactKeyboardEvent) => {
        if ((e.key === ' ' || e.key === 'Enter') && !isDragging && !disabled) {
          e.preventDefault()
          liftKeyboard(id)
        }
      },
      role: itemRole ?? undefined,
      tabIndex: disabled ? -1 : 0,
      'aria-roledescription': 'sortable',
      'aria-describedby': INSTRUCTIONS_ID,
      'aria-pressed': itemRole != null && isDragging ? true : undefined,
      'aria-disabled': disabled || undefined,
    },
    isDragging,
  }
}
