import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { LINK_RESOLVE_TIMEOUT_MS } from '../../Web/titleScan'
import { PICKER_PORTAL_ATTR, PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import { type PaneBounds, usePaneResize } from '@pommora/uix/Pickers/usePaneResize'
import { lockLabel } from '../../Actions/toggleLabels'
import { Icon, LockGlyph } from '@pommora/uix/Symbols'
import { cx } from '@pommora/uix/Utilities/cx'
import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
import { EditorView } from '@codemirror/view'
import { HEADING_LINE, toggleFoldAt } from '../../MarkdownPM/folding'
import type { WarmSeam } from '../../MarkdownPM/warmSeam'
import type { Size } from '@pommora/uix/Interactions/useResizable'
import { useEscape } from '@pommora/uix/Interactions/dismissalStack'
import { WebGuest, type WebGuestHandle } from '../../Web/WebGuest'
import type { PinnedGlance } from '../../Session/glanceSlice'
import { useConnections } from '../../Session/pageConnections'
import { PREVIEW_LINGER_MS } from '../../Settings/personalization'
import { fetchPageDetail, knownBody, readPageDetail } from '../../Session/pageDetailCache'
import { warmSeamOf } from '../../Session/warmCache'
import { useSession, useSetting, windowTargetOf } from '../../Session/store'
import { useWindowGeometry } from '../Windows/useWindowGeometry'
import { PageTile } from '../../Tiles/Surfaces/PageTile'
import {
  GLANCE_BODY_ATTR,
  type GlanceRequest,
  setGlancePresenter,
  setGlanceShown,
  watchAnchor,
} from './glanceAction'
import './glance-pane.css'

// Contract: no dismiss backdrop and `focus="leave"` — a glance must never eat the next click or pull focus out of its host.

// KNOB — the default and floor sizes; the ceiling is the viewport and the anchor's band as the glance opens.
export const GLANCE_DEFAULT: Size = { w: 260, h: 120 }
const GLANCE_BOUNDS: PaneBounds = { min: { w: 180, h: 100 }, default: GLANCE_DEFAULT }
const RECT_SLOP = 6
// A non-path host chain: no real page path can collide with it in the cycle guard.
const GLANCE_ANCESTORS = ['glance'] as const
const NOOP = (): void => {}

export function glanceWarmSeam(id: string, path: string): WarmSeam {
  return warmSeamOf('glance', id, () => knownBody(path))
}

const inRect = (r: DOMRect, x: number, y: number): boolean =>
  x >= r.left - RECT_SLOP &&
  x <= r.right + RECT_SLOP &&
  y >= r.top - RECT_SLOP &&
  y <= r.bottom + RECT_SLOP

const keyOf = (r: GlanceRequest): string =>
  r.target.kind === 'page' ? `p:${r.target.id}` : `s:${r.target.url}`

// Esc blooms out the newest still-open active-tab pin, locked or not (R9 — Esc is the universal escape hatch).
function PinEscape({
  pinId,
  active,
  beginExit,
}: {
  pinId: string
  active: boolean
  beginExit: (ids: string[]) => void
}): null {
  useEscape(active, () => beginExit([pinId]))
  return null
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
  const resize = usePaneResize(shown !== null, GLANCE_BOUNDS, useWindowGeometry('glance'))
  const cardRef = useRef<HTMLDivElement | null>(null)
  const siteRef = useRef<WebGuestHandle | null>(null)
  // A guest mounted in a hidden pane never reliably attaches (Chromium defers demoted subtrees), so the pane cannot wait veiled for the load behind a cover instead.
  const [siteReady, setSiteReady] = useState(false)
  const anchorRef = useLatest(shown?.el ?? null)
  const shownRef = useLatest(shown)
  const held = useHeld(shown, !!shown)

  const selectingRef = useRef(false)
  const { resizing } = resize

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
      setShownState(next)
    }
    setGlancePresenter((next) => {
      if (next === null) {
        dismiss()
        return
      }
      // Never preview the location already in view — resolved at fire time, so a dwell that lands after a click onto that page voids itself.
      const s = useSession.getState()
      const inView = [s.selection, windowTargetOf(s)]
      const { target } = next
      if (target.kind === 'page' && inView.some((t) => t?.kind === 'page' && t.id === target.id))
        return
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
  const windowTab = useSession((s) => s.windowSlot?.activeTabId)
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
  }, [dismiss, removePin, beginExit, selection, activeTabId, windowTab])

  // A press outside every glance portal blooms out unlocked active-tab pins. Containment is the portal layer, not the glance body, so the live pane's resize edges and rim don't read as click-away.
  useEffect(() => {
    const onDown = (e: PointerEvent): void => {
      const t = e.target
      if (t instanceof Element && t.closest(`[${PICKER_PORTAL_ATTR}]`)) return
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
    if (shown?.target.kind !== 'site' || siteReady) return
    const deadline = setTimeout(dismiss, LINK_RESOLVE_TIMEOUT_MS)
    return () => clearTimeout(deadline)
  }, [shown, siteReady, dismiss])

  const persistence = useSetting('previewPersistence')
  const dismissOnPointer = useSetting('dismissPreviewOnPointer')
  const graceMs = PREVIEW_LINGER_MS[persistence]

  // Off mid-open dismisses a live pane; arming is already gated off, so nothing reopens.
  useEffect(() => {
    if (persistence === 'off') dismiss()
  }, [persistence, dismiss])

  const tree = useSession((s) => s.tree)
  const resolveOnly = useConnections(tree, 'inert')

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
    const onMove = (e: PointerEvent): void => {
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
    window.addEventListener('pointermove', onMove)
    const unwatch = watchAnchor(shown.el, {
      onGone: close,
      onEscape: close,
      onMoved: dropBoxes,
      // The pane's rim and its resize edges sit outside the body, so containment reads against the portal layer and a press on an edge is not a press away.
      body: () => cardRef.current?.closest(`[${PICKER_PORTAL_ATTR}]`) ?? null,
      dismissOnPress: dismissOnPointer,
    })
    return () => {
      clearGrace()
      unwatch()
      window.removeEventListener('pointermove', onMove)
    }
  }, [shown, graceMs, dismiss, resizing, dismissOnPointer])

  const page = held?.target.kind === 'page' ? held.target : null
  const siteShown = shown?.target.kind === 'site'

  const pinnedGlances = useSession((s) => s.pinnedGlances)
  const pinGlance = useSession((s) => s.pinGlance)
  const setPinLocked = useSession((s) => s.setPinLocked)

  // The tile render and the fold toggle are pure, so the live pane and every pin share them.
  const renderPageTile = (
    t: { id: string; path: string; heading?: string },
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
      arrive={t.heading}
      preview
    />
  )
  const onFoldClick = (e: React.MouseEvent): void => {
    if (window.getSelection()?.isCollapsed === false) return
    const line = (e.target as HTMLElement).closest?.(HEADING_LINE)
    const editor = line?.closest('.cm-editor')
    const view = editor && EditorView.findFromDOM(editor as HTMLElement)
    if (line && view) toggleFoldAt(view, view.posAtDOM(line))
  }

  // Freeze the ANCHOR POINT (not the pane corner — PickerMenu re-adds gap/origin and re-derives direction) plus the live box size, then dismiss the live pane; the pin renders itself from pinnedGlances.
  const onLock = (): void => {
    const card = cardRef.current
    if (!page || !shown || !card) return
    const a = shown.el.getBoundingClientRect()
    pinGlance({
      tabId: activeTabId,
      target: page,
      anchorX: a.left + a.width / 2,
      anchorY: a.top,
      anchorHeight: a.height,
      size: { w: card.offsetWidth, h: card.offsetHeight },
    })
    dismiss()
  }
  // The preventDefault holds the pane's never-take-focus contract — a focusable button would else steal focus the close path can't restore.
  const lockBtn = page && (
    <button
      type="button"
      className={cx('glance-lock', revealTarget)}
      aria-label={lockLabel(false, 'Preview')}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onLock}
    >
      <Icon name="lock-outline" size="control" />
    </button>
  )
  // A locked pin holds its control always visible; unlocking flips it to the reveal-on-hover open lock and leaves the pane standing.
  const pinBtn = (p: PinnedGlance): React.JSX.Element => (
    <button
      type="button"
      className={cx('glance-lock', revealTarget)}
      data-reveal-held={p.locked || undefined}
      aria-label={lockLabel(p.locked, 'Preview')}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => setPinLocked(p.pinId, !p.locked)}
    >
      <LockGlyph locked={p.locked} />
    </button>
  )

  return (
    <>
      <PickerMenu
        glass="window"
        open={shown !== null}
        triggerRef={anchorRef}
        focus="leave"
        modal={false}
        origin="center"
        resize={resize}
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a pointer-only glance surface — the pane never takes focus by contract */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: same — no keyboard path exists into a glance */}
        <div
          ref={cardRef}
          {...{ [GLANCE_BODY_ATTR]: '' }}
          data-reveal-host=""
          className="glance-body"
          style={{ width: resize.size.w, height: resize.size.h }}
          onPointerDownCapture={(e) => {
            if (e.button !== 0) return
            selectingRef.current = true
            if (!cardRef.current?.contains(document.activeElement))
              focusBefore.current = document.activeElement
          }}
          // A press on an existing highlight would otherwise start a native drag whose drop lands the text in the live host page.
          onDragStartCapture={(e) => e.preventDefault()}
          onClick={onFoldClick}
        >
          {page && renderPageTile(page, glanceWarmSeam(page.id, page.path))}
          {held?.target.kind === 'site' && (
            <>
              {/* Heard only while shown: a failure during the exit would otherwise dismiss again and void a page glance's fetch in flight. */}
              <WebGuest
                key={held.target.url}
                ref={siteRef}
                src={held.target.url}
                className="glance-web"
                onLoad={siteShown ? () => setSiteReady(true) : undefined}
                onFail={siteShown ? dismiss : undefined}
              />
              {/* The shield is the loading face and the pointer owner: always above the guest so the leave lifecycle keeps running over it, and passing only the wheel down. */}
              <div
                className={cx('glance-web-shield', siteReady && 'is-lifted')}
                onWheel={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  siteRef.current?.wheel(
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
      </PickerMenu>
      {pinnedGlances
        .filter((p) => p.tabId === activeTabId)
        .map((p) => (
          <Fragment key={p.pinId}>
            <PinEscape pinId={p.pinId} active={!exiting.has(p.pinId)} beginExit={beginExit} />
            <PickerMenu
              glass="window"
              open={!exiting.has(p.pinId)}
              enter={false}
              onExited={() => removePin(p.pinId)}
              anchorX={p.anchorX}
              anchorY={p.anchorY}
              anchorHeight={p.anchorHeight}
              focus="leave"
              modal={false}
              origin="center"
            >
              {/* biome-ignore lint/a11y/noStaticElementInteractions: a pointer-only glance surface — the pane never takes focus by contract */}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: same — no keyboard path exists into a glance */}
              <div
                {...{ [GLANCE_BODY_ATTR]: '' }}
                data-reveal-host=""
                className="glance-body"
                style={{ width: p.size.w, height: p.size.h }}
                onClick={onFoldClick}
              >
                {renderPageTile(p.target, glanceWarmSeam(p.target.id, p.target.path))}
                {pinBtn(p)}
              </div>
            </PickerMenu>
          </Fragment>
        ))}
    </>
  )
}
