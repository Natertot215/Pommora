import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ConnectionsApi, ConnPage } from '@renderer/MarkdownPM/connections'
import { LINK_RESOLVE_TIMEOUT_MS } from '@shared/links'
import {
  PickerMenu,
  type PickerDirection,
} from '@renderer/DesignSystem/Components/Pickers/PickerMenu/PickerMenu'
import { EditorView } from '@codemirror/view'
import { HEADING_FOLD_LINE, toggleFoldAt } from '@renderer/MarkdownPM/editor/folding'
import { usePointerGesture } from '@renderer/DesignSystem/Interactions/gesture'
import { WEB_PARTITION, type HoverCardSize } from '@shared/types'
import { pageIndexOf } from '../treeIndex'
import { fetchPageDetail, readPageDetail } from '../Tabs/warmCache'
import { useSession } from '../store'
import { PageEmbed } from './PageEmbed'
import { CARD_MIN, hoverCardSize, seedHoverCardSize, setHoverCardSize } from './hoverCardSize'
import { closeActiveHoverCard, presentHoverCard, setHoverCardPresenter } from './HoverCardPresenter'

export { closeActiveHoverCard }

// Contract: no dismiss backdrop and `manageFocus={false}` — a hover affordance must never eat
// the next click or pull focus out of the editor. Mounted ONCE at app level; every host reaches
// it through `hoverConnection`, so one card app-wide holds by construction.

// The size knobs and their persistence live in hoverCardSize.ts — the ceiling is never a knob:
// width caps at the viewport and height at the band actually available on the card's side.
const VIEWPORT_MARGIN = 8
const ANCHOR_GAP = 6
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

export type Hovered =
  | { kind: 'page'; page: ConnPage; el: Element }
  | { kind: 'site'; url: string; el: Element }

const keyOf = (h: Hovered): string => (h.kind === 'page' ? `p:${h.page.id}` : `s:${h.url}`)

/** What the guest element answers with once attached — the handle the replayed wheel is aimed at. */
type ScrollableGuest = HTMLElement & { getWebContentsId?: () => number }

/** Hands a wheel to the guest under the shield. The id read throws before the guest attaches (the
 *  method sits on the prototype first), and the wheel's own sign is inverted: a DOM delta counts
 *  the content's travel, the input event the wheel's. */
function scrollGuest(
  el: ScrollableGuest | null,
  x: number,
  y: number,
  dx: number,
  dy: number,
): void {
  try {
    const id = el?.getWebContentsId?.()
    if (id !== undefined) window.nexus.wheelGuest(id, Math.round(x), Math.round(y), -dx, -dy)
  } catch {
    // A guest that hasn't attached has nothing to scroll yet.
  }
}

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
    presentHoverCard({ kind: 'page', page, el })
    return
  }
  const token = ++pendingFetch
  void fetchPageDetail(page.path).then((detail) => {
    if (token !== pendingFetch || !detail) return
    if (el.matches(':hover')) presentHoverCard({ kind: 'page', page, el })
  })
}

/** The website flavor's entry — the same dwell, a live site instead of a page. */
export function hoverWebsite(url: string, el: Element): void {
  if (!el.isConnected) return
  // Superseding any in-flight cold-page fetch — its late resolve must not steal this card.
  ++pendingFetch
  presentHoverCard({ kind: 'site', url, el })
}

export function ConnectionHoverCard(): React.JSX.Element {
  const [hovered, setHovered] = useState<Hovered | null>(null)
  const [size, setSize] = useState(hoverCardSize)
  useEffect(seedHoverCardSize, [])
  const [dir, setDir] = useState<PickerDirection>('down')
  const cardRef = useRef<HTMLDivElement | null>(null)
  // State, not a ref: the pane's portal lands a beat after the open render (exit-presence mounts
  // it), so the guest-lifecycle effect must re-run when the element actually exists.
  const [siteEl, setSiteEl] = useState<HTMLElement | null>(null)
  const attachSiteEl = useCallback((el: Element | null) => setSiteEl(el as HTMLElement | null), [])
  // The website flavor loads in the open card behind a quiet cover that lifts on load-complete —
  // the tile's blank-face precedent. A guest mounted in a hidden pane never reliably attaches
  // (Chromium defers demoted subtrees), so the card cannot wait veiled for the load instead.
  const [siteReady, setSiteReady] = useState(false)
  const anchorRef = useRef<Element | null>(null)
  const hoveredRef = useRef(hovered)
  anchorRef.current = hovered?.el ?? null
  hoveredRef.current = hovered
  // The Bloom-out rides the last real target (PageWindow's `held` pattern): the body keeps its
  // content and the size stays frozen through the exit, and the next open supersedes the hold.
  const heldRef = useRef(hovered)
  if (hovered) heldRef.current = hovered
  const held = hovered ?? heldRef.current

  // The ceiling, live: viewport width, and the vertical band on the card's side of the link.
  const maxSize = (): HoverCardSize => {
    const w = window.innerWidth - 2 * VIEWPORT_MARGIN
    const link = hoveredRef.current?.el.isConnected
      ? hoveredRef.current.el.getBoundingClientRect()
      : null
    if (!link) return { w, h: window.innerHeight - 2 * VIEWPORT_MARGIN }
    const band =
      dir === 'up'
        ? link.top - ANCHOR_GAP - VIEWPORT_MARGIN
        : window.innerHeight - link.bottom - ANCHOR_GAP - VIEWPORT_MARGIN
    return { w, h: Math.max(CARD_MIN.h, band) }
  }
  const max = maxSize()
  const live = { w: Math.min(size.w, max.w), h: Math.min(size.h, max.h) }
  const shownRef = useRef(live)
  if (hovered) shownRef.current = live
  const shown = shownRef.current

  // Free-edge resize: right + bottom + corner, on the tile gesture skeleton. The card never grows
  // upward — a flipped-up card's bottom edge is the anchored one, so it offers width alone.
  // The ref gates the leave lifecycle per-event; the state drives the accent-stroke class.
  const resizingRef = useRef(false)
  const [resizing, setResizing] = useState(false)
  const begin = usePointerGesture()
  const startResize =
    (axes: { x?: boolean; y?: boolean }) =>
    (e: React.PointerEvent): void => {
      if (e.button !== 0) return
      const start = { ...shownRef.current }
      const sx = e.clientX
      const sy = e.clientY
      begin({
        el: e.currentTarget as HTMLElement,
        event: e,
        activation: 0,
        capture: true,
        swallowActiveEscape: true,
        onActivate: () => {
          resizingRef.current = true
          setResizing(true)
          return true
        },
        onDragMove: (ev) => {
          const cap = maxSize()
          setSize({
            w: axes.x
              ? Math.min(cap.w, Math.max(CARD_MIN.w, start.w + (ev.clientX - sx)))
              : start.w,
            h: axes.y
              ? Math.min(cap.h, Math.max(CARD_MIN.h, start.h + (ev.clientY - sy)))
              : start.h,
          })
        },
        onDrop: () => {
          resizingRef.current = false
          setResizing(false)
          // Only the dragged axes persist — the other rides the stored value, or a width-only
          // drag near a cramped link would silently ratchet the universal height down to that
          // link's band-clamped render.
          const stored = hoverCardSize()
          setHoverCardSize({
            w: axes.x ? shownRef.current.w : stored.w,
            h: axes.y ? shownRef.current.h : stored.h,
          })
        },
        onAbort: () => {
          resizingRef.current = false
          setResizing(false)
          setSize(start)
        },
      })
    }

  const retargetRaf = useRef(0)
  useEffect(() => {
    setHoverCardPresenter((next) => {
      // A close or a newer target always beats a queued retarget — an uncanceled beat would
      // re-open the card right after the navigation that closed it.
      if (retargetRaf.current) {
        cancelAnimationFrame(retargetRaf.current)
        retargetRaf.current = 0
      }
      const cur = hoveredRef.current
      // A re-present of the SAME target is free — re-dwelling a link must not reset the site
      // cover or re-arm the resolve deadline over an already-painted guest.
      if (next && cur && keyOf(next) === keyOf(cur) && next.el === cur.el) return
      // Readiness follows the GUEST, not the presenter: it resets only when the rendered site
      // actually changes, so a same-url retarget (the guest survives on its key) stays lifted.
      const freshGuest = next?.kind === 'site' && !(cur?.kind === 'site' && cur.url === next.url)
      // Retarget routes through a closed beat: PickerMenu re-decides its flip only on open=false,
      // and the Bloom replays at the new link. A different ELEMENT for the same page retargets
      // too — placement captured the old node, so an in-place swap would leave the card frozen
      // over the first link.
      if (next && cur) {
        setHovered(null)
        retargetRaf.current = requestAnimationFrame(() => {
          retargetRaf.current = 0
          if (freshGuest) setSiteReady(false)
          setHovered(next)
        })
        return
      }
      if (next) {
        if (freshGuest) setSiteReady(false)
        setSize(hoverCardSize()) // every open adopts the current universal size
      }
      setHovered(next)
    })
    return () => {
      setHoverCardPresenter(null)
      if (retargetRaf.current) cancelAnimationFrame(retargetRaf.current)
    }
  }, [])

  // Any navigation closes the card — a click that leaves the page must not strand a lingering
  // card over the destination. Conservative on purpose: closing is always safe for a hover.
  const selection = useSession((s) => s.selection)
  const activeTabId = useSession((s) => s.activeTabId)
  const preview = useSession((s) => s.preview)
  useEffect(() => closeActiveHoverCard(), [selection, activeTabId, preview])

  // The guest's own lifecycle, for the card's whole life — a crash after load closes too. Closing
  // goes through `present` so a queued retarget beat can never re-open over the closure.
  useEffect(() => {
    if (hovered?.kind !== 'site' || !siteEl) return
    const onLoad = (): void => setSiteReady(true)
    const onFail = (e: Event): void => {
      // Subframe failures are the site's own business; -3 is the abort every redirect fires.
      const d = e as Event & { isMainFrame?: boolean; errorCode?: number }
      if (d.isMainFrame !== false && d.errorCode !== -3) closeActiveHoverCard()
    }
    siteEl.addEventListener('did-finish-load', onLoad)
    siteEl.addEventListener('did-fail-load', onFail)
    siteEl.addEventListener('render-process-gone', closeActiveHoverCard)
    return () => {
      siteEl.removeEventListener('did-finish-load', onLoad)
      siteEl.removeEventListener('did-fail-load', onFail)
      siteEl.removeEventListener('render-process-gone', closeActiveHoverCard)
    }
  }, [hovered, siteEl])

  // The resolve deadline, measured from the open — a site that hasn't painted by then closes.
  useEffect(() => {
    if (hovered?.kind !== 'site' || siteReady) return
    const deadline = setTimeout(() => presentHoverCard(null), LINK_RESOLVE_TIMEOUT_MS)
    return () => clearTimeout(deadline)
  }, [hovered, siteReady])

  // The linger: None (absent) keeps the short pointer-travel grace; a set duration holds the
  // card open that long after the pointer leaves link and card, re-entry cancelling the countdown
  // — the same timer, only its length changes.
  const linger = useSession((s) => s.personalization.hoverPreviewLinger)
  const graceMs = linger !== undefined ? linger * 1000 : LEAVE_GRACE_MS

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
    // Both boxes hold still between scrolls, keystrokes, window resizes, and card resizes — so they
    // are measured once and dropped on exactly those, rather than re-read on every pointer move.
    let linkBox: DOMRect | null = null
    let cardBox: DOMRect | null = null
    const dropBoxes = (): void => {
      linkBox = null
      cardBox = null
    }
    // The link element is the anchor; once it leaves the DOM (scrolled out of CM's viewport, or a
    // rebuild the same-target refresh didn't heal) there is nothing to point at.
    const onMove = (e: MouseEvent): void => {
      // A live resize suspends the whole leave lifecycle — the drag routinely exits the card, and
      // the grace re-arms naturally on the first movement after the drop. Clearing (not just
      // skipping) also disarms a countdown that pre-dates the drag, or it fires mid-resize.
      if (resizingRef.current) {
        clearGrace()
        dropBoxes() // the drag moves the card's own edges
        return
      }
      if (!hovered.el.isConnected) {
        close()
        return
      }
      linkBox ??= hovered.el.getBoundingClientRect()
      cardBox ??= cardRef.current?.getBoundingClientRect() ?? null
      const overCard = cardBox ? inRect(cardBox, e.clientX, e.clientY) : false
      if (overCard || inRect(linkBox, e.clientX, e.clientY)) clearGrace()
      else if (!grace) grace = setTimeout(close, graceMs)
    }
    // CM6 replaces or prunes decoration nodes in its own scheduled update AFTER the triggering
    // event (a scroll burst, a keystroke's rebuild), so a synchronous check reads the element as
    // still connected and nothing re-runs it. The double rAF lands the check behind CM's update
    // (the codebase's async-heights timing).
    let raf = 0
    const checkDetached = (): void => {
      dropBoxes()
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
    window.addEventListener('resize', dropBoxes)
    return () => {
      clearGrace()
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('scroll', checkDetached, true)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', dropBoxes)
    }
  }, [hovered, graceMs])

  return (
    <PickerMenu
      solid
      open={hovered !== null}
      triggerRef={anchorRef}
      manageFocus={false}
      origin="center"
      onDirection={setDir}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a pointer-only glance surface — the card never takes focus by contract */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: same — no keyboard path exists into a hover affordance */}
      <div
        ref={cardRef}
        className={`conn-hover-body${resizing ? ' is-resizing' : ''}`}
        style={{ width: shown.w, height: shown.h }}
        // The caret never enters the preview — swallowing the press keeps CM from seating a
        // selection or taking focus, while wheel scrolling and the strips' pointer gestures
        // (dispatched before mousedown) stay live.
        onMouseDownCapture={(e) => e.preventDefault()}
        // With no caret to conflict, a heading click IS the fold toggle — the chevron stays
        // hidden here and the whole line becomes the affordance, through the same fold logic.
        onClick={(e) => {
          const line = (e.target as HTMLElement).closest?.(`.cm-line.${HEADING_FOLD_LINE}`)
          const editor = line?.closest('.cm-editor')
          const view = editor && EditorView.findFromDOM(editor as HTMLElement)
          if (line && view) toggleFoldAt(view, view.posAtDOM(line))
        }}
      >
        {held?.kind === 'page' && (
          <PageEmbed
            key={held.page.path}
            path={held.page.path}
            editing={false}
            onBeginEdit={() => {}}
            locked
            connections={resolveOnly}
            ancestors={HOVER_ANCESTORS}
          />
        )}
        {held?.kind === 'site' && (
          <>
            <webview
              key={held.url}
              ref={attachSiteEl}
              src={held.url}
              partition={WEB_PARTITION}
              // No allowpopups, unlike the tile and browser guests: a glance surface takes no
              // interaction, so a popup has nowhere honest to come from.
              className="conn-hover-web"
            />
            {/* The shield is both the loading face and the pointer owner: opaque until the site
                paints, transparent after — and always above the guest, so the card's mousemove
                leave lifecycle keeps running while the pointer rests on it. The wheel is the one
                gesture it passes down, so a glance surface reads past its own first screen without
                becoming interactive. */}
            <div
              className={`conn-hover-web-shield${siteReady ? ' is-lifted' : ''}`}
              onWheel={(e) => {
                const box = e.currentTarget.getBoundingClientRect()
                scrollGuest(siteEl, e.clientX - box.left, e.clientY - box.top, e.deltaX, e.deltaY)
              }}
            />
          </>
        )}
        <div className="conn-hover-resize-e" onPointerDown={startResize({ x: true })} />
        {dir !== 'up' && (
          <>
            <div className="conn-hover-resize-s" onPointerDown={startResize({ y: true })} />
            <div
              className="conn-hover-resize-se"
              onPointerDown={startResize({ x: true, y: true })}
            />
          </>
        )}
      </div>
    </PickerMenu>
  )
}
