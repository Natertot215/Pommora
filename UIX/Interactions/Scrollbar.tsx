import { useEffect, useId, useRef } from 'react'
import { currentZoom } from '../Utilities/zoom'
import { beginPointerGesture } from './gesture'
import { type Box, withinReach } from './hoverReveal'
import { pill as pillClass, track as trackClass } from './scrollbar.css'

export const SCROLLBAR_MIN_OVERFLOW = 1.25 // KNOB — content over visible height before a bar shows
export const SCROLLBAR_LINGER_MS = 1200 // KNOB

// Level with the track anywhere along its height, so the pointer never hunts for a hidden pill.
const REACH = { size: 'inline', toward: { x: -1, y: 1 } } as const

// A scroll only reveals once the user has acted: a restore or an arrival on open lands before any input.
const ARMING = ['wheel', 'pointerdown', 'touchstart', 'keydown'] as const

/** Declared as its scroller's next sibling, or handed `of` when the scroller sits deeper; `page` keeps it under Pages Only. */
export function Scrollbar({
  of,
  page = false,
  timeline,
}: {
  of?: HTMLElement | null
  page?: boolean
  /** A scroll timeline the scroller already names; otherwise the bar names one. */
  timeline?: string
}): React.JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const own = `--scrollbar-${useId().replace(/[^\w-]/g, '')}`
  const name = timeline ?? own

  useEffect(() => {
    const track = trackRef.current
    const pill = pillRef.current
    const scroller = of === undefined ? track?.previousElementSibling : of
    const frame = track?.parentElement
    if (!track || !pill || !frame || !(scroller instanceof HTMLElement)) return

    scroller.style.setProperty('anchor-name', own)
    track.style.setProperty('position-anchor', own)
    if (!timeline) {
      scroller.style.setProperty('scroll-timeline', `${own} block`)
      frame.style.setProperty('timeline-scope', own)
    }

    const state = { near: false, scrolling: false, armed: false }
    const watched = new Set<Element>()
    let box: Box | null = null
    let linger = 0
    const sync = (): void => {
      track.dataset.revealHost = state.near || state.scrolling ? 'on' : 'off'
    }
    const settle = (): void => {
      state.scrolling = true
      sync()
      window.clearTimeout(linger)
      linger = window.setTimeout(() => {
        state.scrolling = false
        sync()
      }, SCROLLBAR_LINGER_MS)
    }

    // A re-observed target reports afresh, so each child is observed once.
    const measure = (): void => {
      box = null
      for (const child of scroller.children)
        if (!watched.has(child)) {
          watched.add(child)
          ro.observe(child)
        }
      const visible = scroller.scrollHeight ? scroller.clientHeight / scroller.scrollHeight : 0
      track.toggleAttribute('data-overflow', visible > 0 && visible <= 1 / SCROLLBAR_MIN_OVERFLOW)
      track.style.setProperty('--scrollbar-visible', String(visible))
    }
    const ro = new ResizeObserver(measure)

    const arm = (): void => {
      state.armed = true
      for (const t of ARMING) window.removeEventListener(t, arm, true)
    }
    const onScroll = (): void => {
      if (!state.armed) return
      window.clearTimeout(linger)
      state.scrolling = true
      sync()
    }
    const onScrollEnd = (): void => {
      if (state.scrolling) settle()
    }
    const onMove = (e: PointerEvent): void => {
      box ??= track.getBoundingClientRect()
      const near = e.buttons === 0 && withinReach(box, REACH, e.clientX, e.clientY)
      if (near === state.near) return
      state.near = near
      sync()
    }
    const onLeave = (): void => {
      state.near = false
      sync()
    }
    const forget = (): void => {
      box = null
    }
    const onPress = (e: PointerEvent): void => {
      let from = 0
      let ratio = 0
      const release = (): void => {
        pill.removeAttribute('data-reveal-held')
        settle()
      }
      const gesture = beginPointerGesture({
        el: pill,
        event: e,
        activation: 0,
        onActivate: () => {
          from = scroller.scrollTop
          ratio =
            (scroller.scrollHeight - scroller.clientHeight) /
            ((track.clientHeight - pill.offsetHeight) * currentZoom(track))
        },
        onDragMove: (ev) => {
          scroller.scrollTop = from + (ev.clientY - e.clientY) * ratio
        },
        onDrop: release,
        onTap: release,
        onAbort: release,
      })
      if (gesture) pill.setAttribute('data-reveal-held', '')
    }

    sync()
    ro.observe(scroller)
    for (const t of ARMING) window.addEventListener(t, arm, { capture: true, passive: true })
    scroller.addEventListener('scroll', onScroll, { passive: true })
    scroller.addEventListener('scrollend', onScrollEnd)
    frame.addEventListener('pointermove', onMove, { passive: true })
    frame.addEventListener('pointerleave', onLeave)
    frame.addEventListener('pointerenter', forget)
    // A pane's slide transitions on an ancestor, whose events never bubble down to the frame.
    document.addEventListener('transitionend', forget, true)
    pill.addEventListener('pointerdown', onPress)
    return () => {
      ro.disconnect()
      window.clearTimeout(linger)
      for (const t of ARMING) window.removeEventListener(t, arm, true)
      scroller.removeEventListener('scroll', onScroll)
      scroller.removeEventListener('scrollend', onScrollEnd)
      frame.removeEventListener('pointermove', onMove)
      frame.removeEventListener('pointerleave', onLeave)
      frame.removeEventListener('pointerenter', forget)
      document.removeEventListener('transitionend', forget, true)
      pill.removeEventListener('pointerdown', onPress)
      scroller.style.removeProperty('anchor-name')
      if (!timeline) {
        scroller.style.removeProperty('scroll-timeline')
        frame.style.removeProperty('timeline-scope')
      }
    }
  }, [of, own, timeline])

  return (
    <div ref={trackRef} className={trackClass} data-page={page || undefined}>
      <div ref={pillRef} className={pillClass} style={{ animationTimeline: name }} />
    </div>
  )
}
