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
import { stack } from '../Theme/stack'
import { moveItem } from '../Utilities/moveItem'
import { DEFAULT_FEEL, type Feel } from '../Animations/feel'
import { findScroller, startAutoScroll } from './autoscroll'
import { announce, ensureInstructions, INSTRUCTIONS_ID } from './a11y'
import { usePointerGesture } from './gesture'
import { ARROW_DIRS, keyboardNext } from './keyboard'
import {
  HYSTERESIS,
  SETTLE_FALLBACK,
  px,
  toBox,
  type Box,
  type DragItem,
  type DropState,
} from './shared'

// Mutable so pointer/rAF/keydown callbacks read it without stale closures. Every lift installs a
// whole fresh scratch over `blankDrag()`, so nothing survives from the gesture before it.
type DragScratch = {
  id: string
  el: HTMLElement | null
  startX: number
  startY: number
  lastX: number
  lastY: number
  active: boolean
  activeIdx: number
  rects: Box[]
  over: number
  scroller: HTMLElement | null
  scroll0X: number
  scroll0Y: number
  kdown: ((e: KeyboardEvent) => void) | null
}
const blankDrag = (): DragScratch => ({
  id: '',
  el: null,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  active: false,
  activeIdx: -1,
  rects: [],
  over: -1,
  scroller: null,
  scroll0X: 0,
  scroll0Y: 0,
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
  itemRole: string | null
  register: (id: string, el: HTMLElement | null) => void
  begin: (id: string, e: ReactPointerEvent) => void
  liftKeyboard: (id: string) => void
}
const ZoneCtx = createContext<ZoneValue | null>(null)

export type ZoneProps = {
  ids: string[]
  onReorder?: (activeId: string, overId: string) => void
  disabled?: boolean
  axis?: 'x' | 'y'
  itemRole?: string | null
  getItemLabel?: (id: string) => string
  children: ReactNode
}

export function Zone({
  ids,
  onReorder,
  disabled = false,
  axis,
  itemRole = 'button',
  getItemLabel,
  children,
}: ZoneProps): React.JSX.Element {
  const feel = DEFAULT_FEEL

  const els = useRef(new Map<string, HTMLElement>())
  const idsRef = useRef(ids)
  idsRef.current = ids
  const reorderRef = useRef(onReorder)
  reorderRef.current = onReorder
  const axisRef = useRef(axis)
  axisRef.current = axis
  const labelRef = useRef(getItemLabel)
  labelRef.current = getItemLabel

  const [activeId, setActiveId] = useState<string | null>(null)
  const [overIndex, setOverIndex] = useState(-1)
  const [rects, setRects] = useState<Box[]>([])
  const [dropState, setDropState] = useState<DropState>('idle')
  const [keyboard, setKeyboard] = useState(false)

  const drag = useRef(blankDrag())
  const beginGesture = usePointerGesture()

  // Instance-scoped, so a sibling Zone's unmount can't halt this Zone's live drag.
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

  const constrain = (dx: number, dy: number): { x: number; y: number } => ({
    x: axisRef.current === 'y' ? 0 : dx,
    y: axisRef.current === 'x' ? 0 : dy,
  })

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
    // Written straight to the element: a delta in context would re-render every item on every
    // pointermove. useZoneItem omits `transform` here so React never clobbers this write.
    if (d.el) d.el.style.transform = `translate3d(${dx + comp.x}px, ${dy + comp.y}px, 0)`
    if (next !== d.over) {
      d.over = next
      setOverIndex(next)
    }
  }

  const onActivate = (): boolean => {
    const d = drag.current
    const measured = measure()
    const activeIdx = idsRef.current.indexOf(d.id)
    if (!measured || activeIdx === -1) return false
    d.active = true
    d.activeIdx = activeIdx
    d.rects = measured
    d.over = activeIdx
    d.scroller = findScroller(d.el, 'xy')
    d.scroll0X = d.scroller?.scrollLeft ?? 0
    d.scroll0Y = d.scroller?.scrollTop ?? 0
    setActiveId(d.id)
    setRects(measured)
    setOverIndex(activeIdx)
    setDropState('dragging')
    announce(`Picked up ${labelOf(d.id)}.`)
    // The activation commit strips React's managed transform; re-assert before the item can
    // paint at origin.
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
    return true
  }

  const onDragMove = (e: PointerEvent): void => {
    const d = drag.current
    d.lastX = e.clientX
    d.lastY = e.clientY
    track(e.clientX, e.clientY)
  }

  const detach = (): void => {
    stopScroll.current?.()
    stopScroll.current = null
    const d = drag.current
    if (d.kdown) {
      document.removeEventListener('keydown', d.kdown)
      d.kdown = null
    }
  }

  // Commits on `transitionend`, not a timer: the transition starts a frame later, so a timer fires
  // while gap items are mid-flight and snaps them short. The fallback covers no-transition hosts.
  const settle = (targetIndex: number, commit?: () => void): void => {
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
      commit?.()
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
        if (ok) reorderRef.current?.(activeId2, overId)
        const label = labelOf(activeId2)
        announce(
          ok
            ? `Dropped ${label} at position ${over + 1}.`
            : `${label} returned to its original position.`,
        )
        if (kbdEl) requestAnimationFrame(() => kbdEl.focus())
      })
    apply(over !== activeIdx)
  }

  const begin = (id: string, e: ReactPointerEvent): void => {
    if (disabled || drag.current.active) return
    const el = els.current.get(id) ?? null
    if (!el) return
    drag.current = {
      ...blankDrag(),
      id,
      el,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
    }
    beginGesture({
      el,
      event: e,
      onActivate,
      onDragMove,
      onDrop: () => {
        const d = drag.current
        resolveDrop(d.over, d.activeIdx, d.id, null)
      },
      onAbort: () => {
        const d = drag.current
        if (d.active) settle(d.activeIdx)
      },
      teardown: detach,
    })
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
      // Tab drops too: it must commit, not tab focus away mid-drag.
      e.preventDefault()
      detach()
      resolveDrop(d.over, d.activeIdx, d.id, d.el)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      detach()
      const el = d.el
      const label = labelOf(d.id)
      settle(d.activeIdx, () => {
        announce(`Movement canceled. ${label} returned to its original position.`)
        requestAnimationFrame(() => el?.focus())
      })
    }
  }

  // The lift keydown won't re-fire into this listener: one added mid-dispatch skips the current event.
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
      itemRole,
      register,
      begin,
      liftKeyboard,
    }),
    [ids, activeId, overIndex, rects, dropState, keyboard, disabled, itemRole],
  )
  return <ZoneCtx.Provider value={value}>{children}</ZoneCtx.Provider>
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
      // On the slot for keyboard and drop; omitted during a live pointer drag so a re-render can't
      // clobber track()'s imperative follow write.
      const onSlot = keyboard || dropState === 'dropping'
      const t = onSlot ? (rects[overIndex] ?? rects[activeIdx]) : null
      transform = t
        ? `translate3d(${px(t.left - rects[activeIdx].left)}, ${px(t.top - rects[activeIdx].top)}, 0)`
        : undefined
    } else {
      const t = reflow(rects, overIndex, activeIdx, index)
      transform = `translate3d(${px(t.left - rects[index].left)}, ${px(t.top - rects[index].top)}, 0)`
    }
  }

  // At rest the inline transition clears entirely: an inline value (even 'none') replaces the
  // element's whole stylesheet transition list and kills its own color/size motion. Safe because an
  // engine item's stylesheet must never transition `transform` — that is the zone contract.
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
