import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LINK_RESOLVE_TIMEOUT_MS } from '@pommora/core/Connections/links'
import { PickerMenu, type PickerDirection } from '@pommora/uix/Pickers/picker-base'
import { Icon } from '@pommora/uix/Symbols'
import { EditorView } from '@codemirror/view'
import { HEADING_FOLD_LINE, toggleFoldAt } from '../../MarkdownPM/folding'
import { mapWarmSeam, type WarmSeam } from '../../MarkdownPM/warmSeam'
import { useResizeFrame, type ResizeEdge } from '@pommora/uix/Interactions/ResizeFrame'
import { useDismissal } from '@pommora/uix/Interactions/dismissalStack'
import { WEB_PARTITION } from '@pommora/core/Web/partition'
import type { GlanceSize } from '@pommora/core/Interface/Windows/windowRecord'
import type { PinnedGlance } from '../../Session/glanceSlice'
import { connectionsFor } from '../../Nexus/treeIndex'
import { previewLingerMs } from '../../Settings/personalization'
import { fetchPageDetail, readPageDetail } from '../../Session/pageDetailCache'
import { useSession } from '../../Session/store'
import { PageTile } from '../../Tiles/Surfaces/PageTile'
import {
  GLANCE_BODY_ATTR,
  type GlanceRequest,
  setGlancePresenter,
  setGlanceShown,
  watchAnchor,
} from './glanceAction'
import { host } from '../../Platform/dialer'
import './glance-pane.css'

// Contract: no dismiss backdrop and `manageFocus={false}` — a glance must never eat the next click or pull focus out of its host.

// KNOB — the default and floor sizes; the ceiling is the viewport and the anchor's band, live.
export const GLANCE_DEFAULT: GlanceSize = { w: 260, h: 120 }
const GLANCE_MIN: GlanceSize = { w: 180, h: 100 }
const VIEWPORT_MARGIN = 8
const ANCHOR_GAP = 6
const RECT_SLOP = 6
// KNOB — how many glanced pages keep their editor state and scroll between opens.
const GLANCE_WARM_CAP = 10
// A non-path host chain: no real page path can collide with it in the cycle guard.
const GLANCE_ANCESTORS = ['glance'] as const
const EDGES_DOWN: readonly ResizeEdge[] = ['e', 'w', 's', 'se', 'sw']
const EDGES_UP: readonly ResizeEdge[] = ['e', 'w', 'n', 'ne', 'nw']
const NOOP = (): void => {}

const clampSize = (s: GlanceSize): GlanceSize => ({
  w: Math.max(GLANCE_MIN.w, Math.round(s.w)),
  h: Math.max(GLANCE_MIN.h, Math.round(s.h)),
})

// Clamped on read so a stored value from before a bounds change never reopens out of bounds.
let sizeCache: GlanceSize | null = null
let sizeNexus: string | null = null
// Only the newest load may land: a nexus switch mid-flight, or a set during the load, supersedes it.
let sizeLoad = 0

function seedGlanceSize(nexusId: string | undefined): void {
  if (!nexusId || sizeNexus === nexusId) return
  sizeCache = null
  const token = ++sizeLoad
  void host()
    .ask('glance:load')
    .then((r) => {
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
  void host().ask('glance:save', sizeCache)
}

const warm = new Map<string, { editorState: unknown; scrollTop: number }>()

export function glanceWarmSeam(id: string, path: string): WarmSeam {
  return mapWarmSeam(warm, id, () => readPageDetail(path)?.body, GLANCE_WARM_CAP)
}

const inRect = (r: DOMRect, x: number, y: number): boolean =>
  x >= r.left - RECT_SLOP &&
  x <= r.right + RECT_SLOP &&
  y >= r.top - RECT_SLOP &&
  y <= r.bottom + RECT_SLOP

const keyOf = (r: GlanceRequest): string =>
  r.target.kind === 'page' ? `p:${r.target.id}` : `s:${r.target.url}`

type ScrollableGuest = HTMLElement & { getWebContentsId?: () => number }

/** The id read throws before the guest attaches (the method sits on the prototype first), and the wheel's own sign is inverted: a DOM delta counts the content's travel, the input event the wheel's. */
function scrollGuest(
  el: ScrollableGuest | null,
  x: number,
  y: number,
  dx: number,
  dy: number,
): void {
  try {
    const id = el?.getWebContentsId?.()
    if (id !== undefined) host().tell('web:wheel', id, Math.round(x), Math.round(y), -dx, -dy)
  } catch {}
}

export function GlancePane(): React.JSX.Element {
  const [shown, setShownState] = useState<GlanceRequest | null>(null)
  const pendingFetch = useRef(0)
  const retargetRaf = useRef(0)
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
  // State, not a ref: the portal lands a beat after the open render, so the guest-lifecycle effect must re-run when the element actually exists.
  const [siteEl, setSiteEl] = useState<HTMLElement | null>(null)
  const attachSiteEl = useCallback((el: Element | null) => setSiteEl(el as HTMLElement | null), [])
  // A guest mounted in a hidden pane never reliably attaches (Chromium defers demoted subtrees), so the pane cannot wait veiled for the load behind a cover instead.
  const [siteReady, setSiteReady] = useState(false)
  const anchorRef = useRef<Element | null>(null)
  const shownRef = useRef(shown)
  anchorRef.current = shown?.el ?? null
  shownRef.current = shown
  const heldRef = useRef(shown)
  if (shown) heldRef.current = shown
  const held = shown ?? heldRef.current

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
      if (retargetRaf.current) {
        cancelAnimationFrame(retargetRaf.current)
        retargetRaf.current = 0
      }
      const cur = shownRef.current
      if (cur && keyOf(next) === keyOf(cur) && next.el === cur.el) return
      const freshGuest =
        next.target.kind === 'site' &&
        !(cur?.target.kind === 'site' && cur.target.url === next.target.url)
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
    setGlancePresenter((next) => {
      if (next === null) {
        dismiss()
        return
      }
      // Never preview the location already in view — resolved at fire time, so a dwell that lands after a click onto that page voids itself.
      const sel = useSession.getState().selection
      if (sel.kind === 'page' && next.target.kind === 'page' && sel.id === next.target.id) return
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

  const selection = useSession((s) => s.selection)
  const activeTabId = useSession((s) => s.activeTabId)
  const pageWindow = useSession((s) => s.pageWindow)
  const unpinGlance = useSession((s) => s.unpinGlance)

  // A closing pin stays in the store, its `open` false, so its pane blooms out; it leaves the store only once that exit has played through.
  const [exiting, setExiting] = useState<ReadonlySet<string>>(() => new Set())
  const removePin = useCallback(
    (pinId: string): void => {
      unpinGlance(pinId)
      setExiting((prev) => {
        if (!prev.has(pinId)) return prev
        const next = new Set(prev)
        next.delete(pinId)
        return next
      })
    },
    [unpinGlance],
  )
  const beginExit = useCallback((ids: string[]): void => {
    setExiting((prev) => {
      if (ids.every((id) => prev.has(id))) return prev
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      return next
    })
  }, [])

  // Navigation dismisses the live pane and closes unlocked pins; locked pins survive. Active-tab pins bloom out; any an earlier tab switch left behind aren't rendered, so they leave at once.
  useEffect(() => {
    dismiss()
    const onTab: string[] = []
    for (const p of useSession.getState().pinnedGlances) {
      if (p.locked) continue
      if (p.tabId === activeTabId) onTab.push(p.pinId)
      else removePin(p.pinId)
    }
    beginExit(onTab)
  }, [dismiss, removePin, beginExit, selection, activeTabId, pageWindow])

  // A press outside every glance portal blooms out unlocked active-tab pins. Containment is the portal layer, not the glance body, so the live pane's resize edges and rim don't read as click-away.
  useEffect(() => {
    const onDown = (e: PointerEvent): void => {
      const t = e.target
      if (t instanceof Element && t.closest('[data-picker-portal]')) return
      beginExit(
        useSession
          .getState()
          .pinnedGlances.filter((p) => !p.locked && p.tabId === activeTabId)
          .map((p) => p.pinId),
      )
    }
    window.addEventListener('pointerdown', onDown, true)
    return () => window.removeEventListener('pointerdown', onDown, true)
  }, [beginExit, activeTabId])

  // Publish live-pane visibility for ghost suppression; `shown` is the single source, so this flips false on every hide path (dismiss and retarget-through-null both flow through it).
  useEffect(() => {
    setGlanceShown(shown !== null)
    return () => setGlanceShown(false)
  }, [shown])

  useEffect(() => {
    if (shown?.target.kind !== 'site' || !siteEl) return
    const onLoad = (): void => setSiteReady(true)
    const onFail = (e: Event): void => {
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

  useEffect(() => {
    if (shown?.target.kind !== 'site' || siteReady) return
    const deadline = setTimeout(dismiss, LINK_RESOLVE_TIMEOUT_MS)
    return () => clearTimeout(deadline)
  }, [shown, siteReady, dismiss])

  const persistence = useSession((s) => s.personalization.previewPersistence)
  // 'off' never has a live pane (the effect below dismisses it), so its grace is moot — narrow it out for the resolver.
  const graceMs = previewLingerMs(persistence === 'off' ? undefined : persistence)

  // Off mid-open dismisses a live pane; arming is already gated off, so nothing reopens.
  useEffect(() => {
    if (persistence === 'off') dismiss()
  }, [persistence, dismiss])

  const tree = useSession((s) => s.tree)
  const resolveOnly = useMemo(() => connectionsFor(tree, { open: () => {} }), [tree])

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
    // Both boxes hold still between scrolls, keystrokes and resizes, so they are measured on exactly those rather than re-read on every pointer move.
    let linkBox: DOMRect | null = null
    let cardBox: DOMRect | null = null
    const dropBoxes = (): void => {
      linkBox = null
      cardBox = null
    }
    const onMove = (e: MouseEvent): void => {
      // A live resize or selection drag suspends the leave lifecycle, clearing rather than skipping so a countdown that pre-dates the drag can't fire mid-gesture.
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
      // An Infinite grace ('always') never schedules a dismiss — the pane holds until nav/Esc/replace.
      else if (!grace && Number.isFinite(graceMs)) grace = setTimeout(close, graceMs)
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

  const pinnedGlances = useSession((s) => s.pinnedGlances)
  const pinGlance = useSession((s) => s.pinGlance)
  const setPinLocked = useSession((s) => s.setPinLocked)

  // The tile render and the fold toggle are pure, so the live pane and every pin share them; the live path keeps its own warmSeam memo (no fresh seam per render).
  const renderPageTile = (
    t: { id: string; path: string },
    seam: WarmSeam | undefined,
  ): React.JSX.Element => (
    <PageTile
      key={t.path}
      path={t.path}
      editing={false}
      onBeginEdit={NOOP}
      locked
      connections={resolveOnly}
      warm={seam}
      ancestors={GLANCE_ANCESTORS}
    />
  )
  const onFoldClick = (e: React.MouseEvent): void => {
    if (window.getSelection()?.isCollapsed === false) return
    const line = (e.target as HTMLElement).closest?.(`.cm-line.${HEADING_FOLD_LINE}`)
    const editor = line?.closest('.cm-editor')
    const view = editor && EditorView.findFromDOM(editor as HTMLElement)
    if (line && view) toggleFoldAt(view, view.posAtDOM(line))
  }

  // Freeze the ANCHOR POINT (not the pane corner — PickerMenu re-adds gap/origin and re-derives direction) plus the live box size, then dismiss the live pane; the pin renders itself from pinnedGlances.
  const onLock = (): void => {
    if (!page || !shown) return
    const a = shown.el.getBoundingClientRect()
    pinGlance({
      tabId: activeTabId,
      target: page,
      anchorX: a.left + a.width / 2,
      anchorY: a.top,
      anchorHeight: a.height,
      size: box,
    })
    dismiss()
  }
  // The preventDefault holds the pane's never-take-focus contract — a focusable button would else steal focus the close path can't restore.
  const lockBtn = page && (
    <button
      type="button"
      className="glance-lock"
      aria-label="Lock preview"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onLock}
    >
      <Icon name="lock-open" size="control" />
    </button>
  )
  // A locked pin holds its control always visible; unlocking flips it to the reveal-on-hover open lock and leaves the pane standing.
  const pinBtn = (p: PinnedGlance): React.JSX.Element => (
    <button
      type="button"
      className={p.locked ? 'glance-lock glance-lock-persist' : 'glance-lock'}
      aria-label={p.locked ? 'Unlock preview' : 'Lock preview'}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => setPinLocked(p.pinId, !p.locked)}
    >
      <Icon name={p.locked ? 'locked' : 'lock-open'} size="control" />
    </button>
  )

  // Esc blooms out the newest still-open active-tab pin, locked or not (R9 — Esc is the universal escape hatch).
  const newestPin = pinnedGlances
    .filter((p) => p.tabId === activeTabId && !exiting.has(p.pinId))
    .at(-1)
  useDismissal(newestPin !== undefined, false, {
    layer: () => null,
    dismiss: newestPin && (() => beginExit([newestPin.pinId])),
    outsidePress: false,
  })

  return (
    <>
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
          data-reveal-host
          className="glance-body"
          style={{ width: box.w, height: box.h }}
          onMouseDownCapture={(e) => {
            if (e.button !== 0) return
            selectingRef.current = true
            if (!cardRef.current?.contains(document.activeElement))
              focusBefore.current = document.activeElement
          }}
          // A press on an existing highlight would otherwise start a native drag whose drop lands the text in the live host page.
          onDragStartCapture={(e) => e.preventDefault()}
          onClick={onFoldClick}
        >
          {page && renderPageTile(page, warmSeam)}
          {held?.target.kind === 'site' && (
            <>
              <webview
                key={held.target.url}
                ref={attachSiteEl}
                src={held.target.url}
                partition={WEB_PARTITION}
                className="glance-web"
              />
              {/* The shield is the loading face and the pointer owner: always above the guest so the leave lifecycle keeps running over it, and passing only the wheel down. */}
              <div
                className={`glance-web-shield${siteReady ? ' is-lifted' : ''}`}
                onWheel={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  scrollGuest(
                    siteEl,
                    e.clientX - rect.left,
                    e.clientY - rect.top,
                    e.deltaX,
                    e.deltaY,
                  )
                }}
              />
            </>
          )}
          {lockBtn}
        </div>
        {frame.edges(dir === 'up' ? EDGES_UP : EDGES_DOWN)}
      </PickerMenu>
      {pinnedGlances
        .filter((p) => p.tabId === activeTabId)
        .map((p) => (
          <PickerMenu
            key={p.pinId}
            glass="window"
            open={!exiting.has(p.pinId)}
            enter={false}
            onExited={() => removePin(p.pinId)}
            anchorX={p.anchorX}
            anchorY={p.anchorY}
            anchorHeight={p.anchorHeight}
            manageFocus={false}
            modal={false}
            origin="center"
          >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: a pointer-only glance surface — the pane never takes focus by contract */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: same — no keyboard path exists into a glance */}
            <div
              {...{ [GLANCE_BODY_ATTR]: '' }}
              data-reveal-host
              className="glance-body"
              style={{ width: p.size.w, height: p.size.h }}
              onClick={onFoldClick}
            >
              {renderPageTile(p.target, glanceWarmSeam(p.target.id, p.target.path))}
              {pinBtn(p)}
            </div>
          </PickerMenu>
        ))}
    </>
  )
}
