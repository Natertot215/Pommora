import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LINK_RESOLVE_TIMEOUT_MS } from '@shared/links'
import { PickerMenu, type PickerDirection } from '@renderer/DesignSystem/Pickers/picker-base'
import { EditorView } from '@codemirror/view'
import { HEADING_FOLD_LINE, toggleFoldAt } from '@renderer/MarkdownPM/Editor/folding'
import type { WarmSeam } from '@renderer/MarkdownPM/warmSeam'
import { useResizeFrame, type ResizeEdge } from '@renderer/Interactions/ResizeFrame'
import { WEB_PARTITION, type GlanceSize } from '@shared/types'
import { resolveOnlyConnections } from '../../treeIndex'
import { fenceWarm, fetchPageDetail, readPageDetail } from '../../Store/tabState'
import { useSession } from '../../store'
import { PageTile } from '../../SurfacePM/PageTile'
import {
  GLANCE_BODY_ATTR,
  type GlanceRequest,
  setGlancePresenter,
  watchAnchor,
} from './glanceAction'
import './glance-pane.css'

// Contract: no dismiss backdrop and `manageFocus={false}` — a glance must never eat the next click
// or pull focus out of its host; a deliberate press inside it is the one exception, and the close
// hands focus back. Mounted once at app level; every host reaches it through the seam.

// KNOB — the default and floor sizes; the ceiling is the viewport and the anchor's band, live.
export const GLANCE_DEFAULT: GlanceSize = { w: 260, h: 120 }
const GLANCE_MIN: GlanceSize = { w: 180, h: 100 }
const VIEWPORT_MARGIN = 8
const ANCHOR_GAP = 6
const LEAVE_GRACE_MS = 200
const RECT_SLOP = 6
// KNOB — how many glanced pages keep their editor state and scroll between opens.
const GLANCE_WARM_CAP = 8
// A non-path host chain: nested `![[Embed]]` tiles inside the body count their depth past 1 and
// render inert, while no real page path can ever collide with it in the cycle guard.
const GLANCE_ANCESTORS = ['glance'] as const
// Both sides, plus the horizontal edge away from the anchor and its corners — a flipped-up pane
// grows upward from its anchored bottom edge.
const EDGES_DOWN: readonly ResizeEdge[] = ['e', 'w', 's', 'se', 'sw']
const EDGES_UP: readonly ResizeEdge[] = ['e', 'w', 'n', 'ne', 'nw']

const clampSize = (s: GlanceSize): GlanceSize => ({
  w: Math.max(GLANCE_MIN.w, Math.round(s.w)),
  h: Math.max(GLANCE_MIN.h, Math.round(s.h)),
})

// One universal size, persisted per nexus; clamped on read so a stored value from before a bounds
// change never reopens out of bounds.
let sizeCache: GlanceSize | null = null
let sizeNexus: string | null = null
// Only the newest load may land: a nexus switch mid-flight, or a set during the load, supersedes it.
let sizeLoad = 0

// A load that fails (no nexus yet) leaves the seed unclaimed so the next mount tries again.
function seedGlanceSize(nexusId: string | undefined): void {
  if (!nexusId || sizeNexus === nexusId) return
  sizeCache = null
  const token = ++sizeLoad
  void window.nexus.glance.load().then((r) => {
    if (token !== sizeLoad || !r.ok) return
    sizeNexus = nexusId
    if (r.value) sizeCache = clampSize(r.value)
  })
}

export function glanceSize(): GlanceSize {
  return sizeCache ?? GLANCE_DEFAULT
}

export function setGlanceSize(next: GlanceSize): void {
  sizeLoad++
  sizeCache = clampSize(next)
  void window.nexus.glance.save(sizeCache)
}

// The glance's own warmth, apart from the tab and window caches; the fence drops an entry whose
// doc no longer matches the fresh body.
const warm = new Map<string, { editorState: unknown; scrollTop: number }>()

export function glanceWarmSeam(id: string, path: string): WarmSeam {
  return {
    restore: () => {
      const kept = fenceWarm(warm.get(id), readPageDetail(path)?.body)
      if (!kept) warm.delete(id)
      return kept
    },
    capture: (state) => {
      warm.delete(id)
      warm.set(id, state)
      for (const key of warm.keys()) {
        if (warm.size <= GLANCE_WARM_CAP) break
        warm.delete(key)
      }
    },
  }
}

const inRect = (r: DOMRect, x: number, y: number): boolean =>
  x >= r.left - RECT_SLOP &&
  x <= r.right + RECT_SLOP &&
  y >= r.top - RECT_SLOP &&
  y <= r.bottom + RECT_SLOP

const keyOf = (r: GlanceRequest): string =>
  r.target.kind === 'page' ? `p:${r.target.id}` : `s:${r.target.url}`

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

export function GlancePane(): React.JSX.Element {
  const [shown, setShownState] = useState<GlanceRequest | null>(null)
  // Supersession token for the cold-page fetch: only the newest request's resolve may open.
  const pendingFetch = useRef(0)
  const retargetRaf = useRef(0)
  /** The pane goes away, and nothing queued may bring it back: a retarget beat still pending and a
   *  cold fetch still in flight are both superseded. */
  const dismiss = useCallback(() => {
    if (retargetRaf.current) {
      cancelAnimationFrame(retargetRaf.current)
      retargetRaf.current = 0
    }
    pendingFetch.current++
    setShownState(null)
  }, [])
  const [size, setSize] = useState(glanceSize)
  const nexusId = useSession((s) => s.tree?.nexus.id)
  useEffect(() => seedGlanceSize(nexusId), [nexusId])
  const [dir, setDir] = useState<PickerDirection>('down')
  const cardRef = useRef<HTMLDivElement | null>(null)
  // State, not a ref: the pane's portal lands a beat after the open render (exit-presence mounts
  // it), so the guest-lifecycle effect must re-run when the element actually exists.
  const [siteEl, setSiteEl] = useState<HTMLElement | null>(null)
  const attachSiteEl = useCallback((el: Element | null) => setSiteEl(el as HTMLElement | null), [])
  // The website flavor loads in the open pane behind a quiet cover that lifts on load-complete —
  // the tile's blank-face precedent. A guest mounted in a hidden pane never reliably attaches
  // (Chromium defers demoted subtrees), so the pane cannot wait veiled for the load instead.
  const [siteReady, setSiteReady] = useState(false)
  const anchorRef = useRef<Element | null>(null)
  const shownRef = useRef(shown)
  anchorRef.current = shown?.el ?? null
  shownRef.current = shown
  // The Bloom-out rides the last real target; the next open supersedes the hold.
  const heldRef = useRef(shown)
  if (shown) heldRef.current = shown
  const held = shown ?? heldRef.current

  // The ceiling, live: viewport width, and the vertical band on the pane's side of the anchor.
  const maxSize = (): GlanceSize => {
    const w = window.innerWidth - 2 * VIEWPORT_MARGIN
    const link = shownRef.current?.el.isConnected
      ? shownRef.current.el.getBoundingClientRect()
      : null
    if (!link) return { w, h: window.innerHeight - 2 * VIEWPORT_MARGIN }
    const band =
      dir === 'up'
        ? link.top - ANCHOR_GAP - VIEWPORT_MARGIN
        : window.innerHeight - link.bottom - ANCHOR_GAP - VIEWPORT_MARGIN
    return { w, h: Math.max(GLANCE_MIN.h, band) }
  }
  const max = maxSize()
  const live = { w: Math.min(size.w, max.w), h: Math.min(size.h, max.h) }
  const liveRef = useRef(live)
  if (shown) liveRef.current = live
  const box = liveRef.current

  const selectingRef = useRef(false)
  const frame = useResizeFrame({
    rect: box,
    min: GLANCE_MIN,
    max: maxSize,
    equilateral: true,
    outlined: true,
    onChange: (next, phase) => {
      setSize(next)
      if (phase !== 'drop') return
      // An axis that ended pinned at a cramped anchor's cap keeps the stored value, or the drag
      // would silently ratchet the universal size down to that anchor's band-clamped render.
      const stored = glanceSize()
      const cap = maxSize()
      const keep = (axis: 'w' | 'h'): number =>
        next[axis] >= cap[axis] && stored[axis] > cap[axis] ? stored[axis] : next[axis]
      setGlanceSize({ w: keep('w'), h: keep('h') })
    },
  })
  const resizing = frame.active !== null

  useEffect(() => {
    const show = (next: GlanceRequest): void => {
      // A newer target always beats a queued retarget.
      if (retargetRaf.current) {
        cancelAnimationFrame(retargetRaf.current)
        retargetRaf.current = 0
      }
      const cur = shownRef.current
      // A re-present of the SAME target is free — re-dwelling an anchor must not reset the site
      // cover or re-arm the resolve deadline over an already-painted guest.
      if (cur && keyOf(next) === keyOf(cur) && next.el === cur.el) return
      // Readiness follows the GUEST, not the presenter: it resets only when the rendered site
      // actually changes, so a same-url retarget (the guest survives on its key) stays lifted.
      const freshGuest =
        next.target.kind === 'site' &&
        !(cur?.target.kind === 'site' && cur.target.url === next.target.url)
      // Retarget routes through a closed beat: PickerMenu re-decides its flip only on open=false,
      // and the Bloom replays at the new anchor. A different ELEMENT for the same page retargets
      // too — placement captured the old node, so an in-place swap would leave the pane frozen
      // over the first anchor.
      if (cur) {
        setShownState(null)
        retargetRaf.current = requestAnimationFrame(() => {
          retargetRaf.current = 0
          if (freshGuest) setSiteReady(false)
          setShownState(next)
        })
        return
      }
      if (freshGuest) setSiteReady(false)
      setSize(glanceSize())
      setShownState(next)
    }
    // The body is resolved BEFORE the pane opens: a cold page blooms only once its fetch lands,
    // still under the pointer, and a failed open blooms nothing. An anchor already out of the DOM
    // opens nothing: the dwell outlives its editor when navigation tears the node out.
    setGlancePresenter((next) => {
      if (next === null) {
        dismiss()
        return
      }
      if (!next.el.isConnected) return
      const token = ++pendingFetch.current
      if (next.target.kind === 'site' || readPageDetail(next.target.path)) {
        show(next)
        return
      }
      void fetchPageDetail(next.target.path).then((detail) => {
        if (token !== pendingFetch.current || !detail) return
        if (next.el.isConnected && next.el.matches(':hover')) show(next)
      })
    })
    return () => {
      setGlancePresenter(null)
      if (retargetRaf.current) cancelAnimationFrame(retargetRaf.current)
    }
  }, [])

  // Any navigation closes the pane — a click that leaves the page must not strand it over the
  // destination.
  const selection = useSession((s) => s.selection)
  const activeTabId = useSession((s) => s.activeTabId)
  const pageWindow = useSession((s) => s.pageWindow)
  useEffect(dismiss, [dismiss, selection, activeTabId, pageWindow])

  // The guest's own lifecycle, for the pane's whole life — a crash after load closes too.
  useEffect(() => {
    if (shown?.target.kind !== 'site' || !siteEl) return
    const onLoad = (): void => setSiteReady(true)
    const onFail = (e: Event): void => {
      // Subframe failures are the site's own business; -3 is the abort every redirect fires.
      const d = e as Event & { isMainFrame?: boolean; errorCode?: number }
      if (d.isMainFrame !== false && d.errorCode !== -3) dismiss()
    }
    siteEl.addEventListener('did-finish-load', onLoad)
    siteEl.addEventListener('did-fail-load', onFail)
    siteEl.addEventListener('render-process-gone', dismiss)
    return () => {
      siteEl.removeEventListener('did-finish-load', onLoad)
      siteEl.removeEventListener('did-fail-load', onFail)
      siteEl.removeEventListener('render-process-gone', dismiss)
    }
  }, [shown, siteEl, dismiss])

  // The resolve deadline, measured from the open — a site that hasn't painted by then closes.
  useEffect(() => {
    if (shown?.target.kind !== 'site' || siteReady) return
    const deadline = setTimeout(dismiss, LINK_RESOLVE_TIMEOUT_MS)
    return () => clearTimeout(deadline)
  }, [shown, siteReady, dismiss])

  // The linger: None (absent) keeps the short pointer-travel grace; a set duration holds the
  // pane open that long after the pointer leaves anchor and pane, re-entry cancelling the
  // countdown — the same timer, only its length changes.
  const linger = useSession((s) => s.personalization.hoverPreviewLinger)
  const graceMs = linger !== undefined ? linger * 1000 : LEAVE_GRACE_MS

  // Resolve-only: the body's links style correctly but arm nothing — no glance (the seam refuses
  // the pane's own body regardless), no menu, no bypass, and `open` deliberately inert.
  const tree = useSession((s) => s.tree)
  const resolveOnly = useMemo(() => resolveOnlyConnections(tree), [tree])

  // Recorded on the press that takes focus, so the close can hand it back to whoever held it — an
  // editor through its own view (which keeps the caret and scroll), anything else through the DOM.
  const focusBefore = useRef<Element | null>(null)

  useEffect(() => {
    if (!shown) return
    let grace: ReturnType<typeof setTimeout> | null = null
    const clearGrace = (): void => {
      if (grace) {
        clearTimeout(grace)
        grace = null
      }
    }
    const close = (): void => {
      if (cardRef.current?.contains(document.activeElement)) {
        const before = focusBefore.current
        const host = before?.closest('.cm-editor')
        const view = host ? EditorView.findFromDOM(host as HTMLElement) : null
        if (view) view.focus()
        else (before as HTMLElement | null)?.focus?.()
      }
      dismiss()
    }
    // Both boxes hold still between scrolls, keystrokes, window resizes, and pane resizes — so they
    // are measured once and dropped on exactly those, rather than re-read on every pointer move.
    let linkBox: DOMRect | null = null
    let cardBox: DOMRect | null = null
    const dropBoxes = (): void => {
      linkBox = null
      cardBox = null
    }
    const onMove = (e: MouseEvent): void => {
      // A live resize or selection drag suspends the leave lifecycle (either routinely exits the
      // pane), clearing rather than skipping so a countdown that pre-dates the drag can't fire
      // mid-gesture. The selection flag lives only while the button is down, so a swallowed release
      // heals on the next move.
      if (selectingRef.current && (e.buttons & 1) === 0) selectingRef.current = false
      if (resizing || selectingRef.current) {
        clearGrace()
        dropBoxes()
        return
      }
      if (!shown.el.isConnected) {
        close()
        return
      }
      linkBox ??= shown.el.getBoundingClientRect()
      cardBox ??= cardRef.current?.getBoundingClientRect() ?? null
      const overCard = cardBox ? inRect(cardBox, e.clientX, e.clientY) : false
      if (overCard || inRect(linkBox, e.clientX, e.clientY)) clearGrace()
      else if (!grace) grace = setTimeout(close, graceMs)
    }
    window.addEventListener('mousemove', onMove)
    const unwatch = watchAnchor(shown.el, { onGone: close, onEscape: close, onMoved: dropBoxes })
    return () => {
      clearGrace()
      unwatch()
      window.removeEventListener('mousemove', onMove)
    }
  }, [shown, graceMs, dismiss, resizing])

  const page = held?.target.kind === 'page' ? held.target : null
  const warmSeam = useMemo(
    () => (page ? glanceWarmSeam(page.id, page.path) : undefined),
    [page?.id, page?.path],
  )

  return (
    <PickerMenu
      glass="window"
      open={shown !== null}
      triggerRef={anchorRef}
      manageFocus={false}
      modal={false}
      origin="center"
      onDirection={setDir}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a pointer-only glance surface — the pane never takes focus by contract */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: same — no keyboard path exists into a glance */}
      <div
        ref={cardRef}
        {...{ [GLANCE_BODY_ATTR]: '' }}
        className="glance-body"
        style={{ width: box.w, height: box.h }}
        // A press starts a read-only text selection whose drag routinely overshoots the pane, so
        // the leave lifecycle stands down until the release. Focus is recorded on the capture phase
        // and only on the press that takes it: the pane's own editor focuses itself inside the
        // native mousedown, before a bubbling handler would run.
        onMouseDownCapture={(e) => {
          if (e.button !== 0) return
          selectingRef.current = true
          if (!cardRef.current?.contains(document.activeElement))
            focusBefore.current = document.activeElement
        }}
        // The glance is not a drag source — a press on an existing highlight would otherwise
        // start a native drag whose drop lands the text in the live host page.
        onDragStartCapture={(e) => e.preventDefault()}
        // A heading click IS the fold toggle — the chevron stays hidden here and the whole line
        // becomes the affordance, through the same fold logic. A press that dragged out a
        // selection keeps it: the highlight is what it asked for, not a fold.
        onClick={(e) => {
          if (window.getSelection()?.isCollapsed === false) return
          const line = (e.target as HTMLElement).closest?.(`.cm-line.${HEADING_FOLD_LINE}`)
          const editor = line?.closest('.cm-editor')
          const view = editor && EditorView.findFromDOM(editor as HTMLElement)
          if (line && view) toggleFoldAt(view, view.posAtDOM(line))
        }}
      >
        {page && (
          <PageTile
            key={page.path}
            path={page.path}
            editing={false}
            onBeginEdit={() => {}}
            locked
            connections={resolveOnly}
            warm={warmSeam}
            ancestors={GLANCE_ANCESTORS}
          />
        )}
        {held?.target.kind === 'site' && (
          <>
            <webview
              key={held.target.url}
              ref={attachSiteEl}
              src={held.target.url}
              partition={WEB_PARTITION}
              // No allowpopups, unlike the tile and browser guests: a glance takes no
              // interaction, so a popup has nowhere honest to come from.
              className="glance-web"
            />
            {/* The shield is the loading face and the pointer owner: opaque until the site paints,
                always above the guest so the leave lifecycle keeps running over it, and passing
                only the wheel down. */}
            <div
              className={`glance-web-shield${siteReady ? ' is-lifted' : ''}`}
              onWheel={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                scrollGuest(siteEl, e.clientX - rect.left, e.clientY - rect.top, e.deltaX, e.deltaY)
              }}
            />
          </>
        )}
      </div>
      {frame.edges(dir === 'up' ? EDGES_UP : EDGES_DOWN)}
    </PickerMenu>
  )
}
