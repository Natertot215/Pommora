import { useEffect, useId, useRef } from 'react'
import { currentZoom } from '../Utilities/zoom'
import { beginPointerGesture } from './gesture'
import { type Box, withinReach } from './hoverReveal'
import { pill as pillClass, track as trackClass } from './scrollbar.css'

const SCROLLBAR_MIN_OVERFLOW = 1.25 // KNOB — content over visible height before a bar shows
export const SCROLLBAR_LINGER_MS = 1000 // KNOB

const REACH = { size: 'inline', toward: { x: -1, y: 1 } } as const

// Reveals wait on input taken on screen, since restores, arrivals, and returns from off screen scroll before any.
const ARMING = ['wheel', 'pointerdown', 'touchstart', 'keydown'] as const

/** Declared as its scroller's next sibling, or handed `of` when the scroller sits deeper. */
export function Scrollbar({
  of,
  page = false,
  timeline,
}: {
  of?: HTMLElement | null
  page?: boolean
  timeline?: string
}): React.JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const own = `--scrollbar-${useId().replace(/[^\w-]/g, '')}`

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

    const watched = new WeakSet<Element>()
    let armed = false
    let onScreen = false
    let shown = false
    let scrolled = false
    let seen = scroller.scrollTop
    let box: Box | null = null
    let linger = 0
    const show = (on: boolean): void => {
      if (on === shown) return
      shown = on
      track.dataset.revealHost = on ? 'on' : 'off'
    }
    const wake = (): void => {
      show(true)
      window.clearTimeout(linger)
      linger = window.setTimeout(() => {
        scrolled = false
        show(false)
      }, SCROLLBAR_LINGER_MS)
    }
    const leave = (): void => {
      if (scrolled || !shown) return
      window.clearTimeout(linger)
      show(false)
    }

    // Observed once each: a re-observed target reports again and loops the measure.
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
    const mo = new MutationObserver(measure)

    const arm = (): void => {
      if (!onScreen) return
      armed = true
      for (const t of ARMING) window.removeEventListener(t, arm, true)
    }
    const disarm = (): void => {
      armed = false
      for (const t of ARMING) window.addEventListener(t, arm, { capture: true, passive: true })
    }
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      if (!onScreen && armed) disarm()
    })
    // A scroll back to the last-seen offset is a tile heal's restore, not movement.
    const onScroll = (): void => {
      const top = scroller.scrollTop
      if (top === seen) return
      seen = top
      if (!armed) return
      scrolled = true
      wake()
    }
    const onMove = (e: PointerEvent): void => {
      box ??= track.getBoundingClientRect()
      if (e.buttons === 0 && withinReach(box, REACH, e.clientX, e.clientY)) wake()
      else leave()
    }
    const forget = (): void => {
      box = null
    }
    const onPress = (e: PointerEvent): void => {
      let from = 0
      let ratio = 0
      const release = (): void => {
        pill.removeAttribute('data-reveal-held')
        wake()
      }
      const gesture = beginPointerGesture({
        el: pill,
        event: e,
        activation: 0,
        cursor: 'grabbing',
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

    track.dataset.revealHost = 'off'
    ro.observe(scroller)
    mo.observe(scroller, { childList: true })
    io.observe(scroller)
    disarm()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    frame.addEventListener('pointermove', onMove, { passive: true })
    frame.addEventListener('pointerenter', forget)
    frame.addEventListener('pointerleave', leave)
    // A pane's slide transitions on an ancestor, out of the frame's bubbling reach.
    document.addEventListener('transitionend', forget, true)
    pill.addEventListener('pointerdown', onPress)
    return () => {
      ro.disconnect()
      io.disconnect()
      mo.disconnect()
      window.clearTimeout(linger)
      for (const t of ARMING) window.removeEventListener(t, arm, true)
      scroller.removeEventListener('scroll', onScroll)
      frame.removeEventListener('pointermove', onMove)
      frame.removeEventListener('pointerenter', forget)
      frame.removeEventListener('pointerleave', leave)
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
      <div ref={pillRef} className={pillClass} style={{ animationTimeline: timeline ?? own }} />
    </div>
  )
}
