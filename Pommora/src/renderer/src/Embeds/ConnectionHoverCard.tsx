import { useEffect, useRef, useState } from 'react'
import type { ConnPage } from '@renderer/MarkdownPM/connections'
import { PickerMenu } from '@renderer/design-system/components/PickerMenu/PickerMenu'
import { useSession } from '../store'

// Contract: no dismiss backdrop and `manageFocus={false}` — a hover affordance must never eat
// the next click or pull focus out of the editor. Mounted ONCE at app level; every host reaches
// it through `hoverConnection`, so one card app-wide holds by construction.

const CARD = { w: 260, h: 120 }
const LEAVE_GRACE_MS = 200
const RECT_SLOP = 6

const inRect = (r: DOMRect, x: number, y: number): boolean =>
  x >= r.left - RECT_SLOP &&
  x <= r.right + RECT_SLOP &&
  y >= r.top - RECT_SLOP &&
  y <= r.bottom + RECT_SLOP

interface Hovered {
  page: ConnPage
  el: Element
}

let present: ((next: Hovered | null) => void) | null = null

/** The ConnectionsApi.hover entry every host wires. A call before the card mounts is a no-op. */
export function hoverConnection(page: ConnPage, el: Element): void {
  present?.({ page, el })
}

export function closeActiveHoverCard(): void {
  present?.(null)
}

export function ConnectionHoverCard(): React.JSX.Element {
  const [hovered, setHovered] = useState<Hovered | null>(null)
  const anchorRef = useRef<Element | null>(null)
  anchorRef.current = hovered?.el ?? null
  const cardRef = useRef<HTMLDivElement | null>(null)
  const hoveredRef = useRef(hovered)
  hoveredRef.current = hovered

  useEffect(() => {
    present = (next) => {
      const cur = hoveredRef.current
      // Same target while open: refresh the element in place (a re-entry re-fires the intent, and
      // a decoration rebuild hands us a fresh span) — never a close/reopen flicker.
      if (next && cur && next.page.id === cur.page.id) return setHovered(next)
      // Retarget routes through a closed beat: PickerMenu re-decides its flip only on open=false,
      // and the Bloom replays at the new link.
      if (next && cur) {
        setHovered(null)
        requestAnimationFrame(() => setHovered(next))
        return
      }
      setHovered(next)
    }
    return () => {
      present = null
    }
  }, [])

  // Any navigation closes the card — a click that leaves the page must not strand a lingering
  // card over the destination. Conservative on purpose: closing is always safe for a hover.
  const selection = useSession((s) => s.selection)
  const activeTabId = useSession((s) => s.activeTabId)
  const preview = useSession((s) => s.preview)
  useEffect(() => closeActiveHoverCard(), [selection, activeTabId, preview])

  useEffect(() => {
    if (!hovered) return
    let grace: ReturnType<typeof setTimeout> | null = null
    const clearGrace = (): void => {
      if (grace) {
        clearTimeout(grace)
        grace = null
      }
    }
    const close = (): void => setHovered(null)
    // The link element is the anchor; once it leaves the DOM (scrolled out of CM's viewport, or a
    // rebuild the same-target refresh didn't heal) there is nothing to point at.
    const linkRect = (): DOMRect | null =>
      hovered.el.isConnected ? hovered.el.getBoundingClientRect() : null
    const onMove = (e: MouseEvent): void => {
      const link = linkRect()
      if (!link) {
        close()
        return
      }
      const cardRect = cardRef.current?.getBoundingClientRect()
      const overCard = cardRect ? inRect(cardRect, e.clientX, e.clientY) : false
      if (overCard || inRect(link, e.clientX, e.clientY)) clearGrace()
      else if (!grace) grace = setTimeout(close, LEAVE_GRACE_MS)
    }
    // CM6 prunes off-viewport nodes in its own scheduled update AFTER the scroll event burst, so a
    // synchronous check reads the element as still connected and no later scroll re-runs it. The
    // double rAF lands the check behind CM's update (the codebase's async-heights timing).
    let raf = 0
    const onScroll = (): void => {
      if (raf) return
      raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          raf = 0
          if (!hovered.el.isConnected) close()
        }),
      )
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      e.preventDefault() // the house contract — window closers skip a handled Escape
      close()
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('keydown', onKey)
    return () => {
      clearGrace()
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [hovered])

  return (
    <PickerMenu solid open={hovered !== null} triggerRef={anchorRef} manageFocus={false}>
      <div ref={cardRef} style={{ width: CARD.w, height: CARD.h }} />
    </PickerMenu>
  )
}
