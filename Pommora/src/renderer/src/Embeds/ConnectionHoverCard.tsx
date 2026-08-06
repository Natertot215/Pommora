import { useEffect, useMemo, useRef, useState } from 'react'
import type { ConnectionsApi, ConnPage } from '@renderer/MarkdownPM/connections'
import { PickerMenu } from '@renderer/design-system/components/PickerMenu/PickerMenu'
import { pageIndexOf } from '../treeIndex'
import { cachePageDetail, readPageDetail } from '../Tabs/warmCache'
import { useSession } from '../store'
import { PageEmbed } from './PageEmbed'

// Contract: no dismiss backdrop and `manageFocus={false}` — a hover affordance must never eat
// the next click or pull focus out of the editor. Mounted ONCE at app level; every host reaches
// it through `hoverConnection`, so one card app-wide holds by construction.

const CARD = { w: 260, h: 120 }
const LEAVE_GRACE_MS = 200
const RECT_SLOP = 6
// A non-path host chain: nested `![[Embed]]` tiles inside the body count their depth past 1 and
// render inert (a hover card must never put a third page's editor behind a click), while no real
// page path can ever collide with it in the cycle guard.
const HOVER_ANCESTORS = ['hover-card'] as const

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

// Supersession token for the cold-page fetch: only the newest hover's resolve may open.
let pendingFetch = 0

/** The ConnectionsApi.hover entry every host wires. A call before the card mounts is a no-op —
 *  and so is one whose element already left the DOM: the intent timer outlives its editor (no
 *  mouseout fires when navigation tears the node out under a resting pointer), and a card must
 *  never open anchored to nothing.
 *
 *  The body is resolved BEFORE the card opens: a warm page blooms with content in hand, a cold
 *  one blooms only once its fetch lands — still under the pointer (`:hover` — a flick-away or a
 *  mid-fetch teardown can't match) — and a failed open blooms nothing at all. */
export function hoverConnection(page: ConnPage, el: Element): void {
  if (!el.isConnected) return
  if (readPageDetail(page.path)) {
    present?.({ page, el })
    return
  }
  const token = ++pendingFetch
  void window.nexus.openPage(page.path).then((r) => {
    if (token !== pendingFetch || !r.ok) return
    cachePageDetail(r.value)
    if (el.matches(':hover')) present?.({ page, el })
  })
}

export function closeActiveHoverCard(): void {
  present?.(null)
}

export function ConnectionHoverCard(): React.JSX.Element {
  const [hovered, setHovered] = useState<Hovered | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const anchorRef = useRef<Element | null>(null)
  const hoveredRef = useRef(hovered)
  anchorRef.current = hovered?.el ?? null
  hoveredRef.current = hovered

  useEffect(() => {
    present = (next) => {
      const cur = hoveredRef.current
      // Retarget routes through a closed beat: PickerMenu re-decides its flip only on open=false,
      // and the Bloom replays at the new link.
      if (next && cur && next.page.id !== cur.page.id) {
        setHovered(null)
        requestAnimationFrame(() => setHovered(next))
        return
      }
      // Same target while open refreshes the element in place (a re-entry re-fires the intent, and
      // a decoration rebuild hands us a fresh span) — never a close/reopen flicker.
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

  // Resolve-only: the body's links style correctly but arm nothing — no hover (a card must not
  // hover its own contents), no menu, no bypass, and `open` deliberately inert (clicks inside
  // the card do nothing).
  const tree = useSession((s) => s.tree)
  const resolveOnly = useMemo<ConnectionsApi | undefined>(
    () => (tree ? { ...pageIndexOf(tree), open: () => {} } : undefined),
    [tree],
  )

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
    const onMove = (e: MouseEvent): void => {
      if (!hovered.el.isConnected) {
        close()
        return
      }
      const link = hovered.el.getBoundingClientRect()
      const cardRect = cardRef.current?.getBoundingClientRect()
      const overCard = cardRect ? inRect(cardRect, e.clientX, e.clientY) : false
      if (overCard || inRect(link, e.clientX, e.clientY)) clearGrace()
      else if (!grace) grace = setTimeout(close, LEAVE_GRACE_MS)
    }
    // CM6 replaces or prunes decoration nodes in its own scheduled update AFTER the triggering
    // event (a scroll burst, a keystroke's rebuild), so a synchronous check reads the element as
    // still connected and nothing re-runs it. The double rAF lands the check behind CM's update
    // (the codebase's async-heights timing).
    let raf = 0
    const checkDetached = (): void => {
      if (raf) return
      raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          raf = 0
          if (!hovered.el.isConnected) close()
        }),
      )
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault() // the house contract — window closers skip a handled Escape
        close()
        return
      }
      // Any other key can rebuild decorations under a resting pointer (typing, arrows) — the
      // swap strands the anchor with no mouse or scroll event to notice.
      checkDetached()
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('scroll', checkDetached, true)
    window.addEventListener('keydown', onKey)
    return () => {
      clearGrace()
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('scroll', checkDetached, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [hovered])

  return (
    <PickerMenu
      solid
      open={hovered !== null}
      triggerRef={anchorRef}
      manageFocus={false}
      origin="center"
    >
      <div ref={cardRef} className="conn-hover-body" style={{ width: CARD.w, height: CARD.h }}>
        {hovered && (
          <PageEmbed
            key={hovered.page.path}
            path={hovered.page.path}
            editing={false}
            onBeginEdit={() => {}}
            locked
            connections={resolveOnly}
            ancestors={HOVER_ANCESTORS}
          />
        )}
      </div>
    </PickerMenu>
  )
}
