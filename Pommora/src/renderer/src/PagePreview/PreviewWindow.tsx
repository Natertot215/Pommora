import { useEffect, useMemo, useRef, useState } from 'react'
import { cx } from '@renderer/design-system/cx'
import { duration, easing } from '@renderer/design-system/tokens'
import {
  PREVIEW_PANE_INSPECTOR,
  PreviewPane,
} from '@renderer/design-system/components/PreviewPane/PreviewPane'
import { useExitPresence } from '../design-system/useExitPresence'
import { PageEmbed } from '../Embeds/PageEmbed'
import { EMBED_SCALE } from '../Embeds/embedScale'
import { Subfield } from '../Detail/Subfield/Subfield'
import type { SubfieldScope } from '../Detail/Subfield/subfieldItems'
import { buildPageIndex, flattenPages, type ConnectionsApi } from '../MarkdownPM/connections'
import { showConnectionMenu } from '../Embeds/connectionMenu'
import { useConnectionHover } from '../Embeds/ConnectionHoverCard'
import { getDetailPaneRect } from '../Detail/DetailPane'
import { NavCrumbs } from '../Navigation/NavList'
import { buildResolveIndex, resolveWith } from '../Navigation/navResolve'
import { useSession, type PreviewTarget } from '../store'
import { PreviewActions } from './PreviewActions'
import { PreviewInspector } from './PreviewInspector'
import { PreviewTabStrip } from './PreviewTabStrip'
import { usePreviewWarm } from './usePreviewWarm'
import './previewWindow.css'

// The bare surfaces a window-move may start from, beyond the pane's own. The tab wrap's bare space
// moves too (a press on a .tab is not the wrap and never arms).
const DRAG_SURFACES =
  '.pgpreview-body, .pgpreview-tabwrap, .pgpreview-tabscroll, .pgpreview-tabstrip'

// The tab-switch content slide: the DetailPane's view-slide values on the preview's own stamp.
const SLIDE_PX = 14

// The live-stats debounce (mirrors PageView) — edits coalesce before the count recomputes.
const STATS_DEBOUNCE_MS = 120

// The promote and nav-swap exits are WAAPI/CSS-driven; the class tells the stylesheet to suppress
// the shell's default scale-out so one motion owns the window. A plain dismiss keeps it.
const EXIT_CLASS = { dismiss: '', engulf: 'engulfing', morph: 'morphing' } as const

export function PreviewWindow(): React.JSX.Element | null {
  // The window's existence keys on the PAGE flavor, not the derived target — the nav flavor renders
  // in NavWindow's chrome, and its map tab nulls the target without closing anything.
  // A page-flavor window always has an active page tab, so the target is non-null while open.
  const open = useSession((s) => s.preview?.flavor === 'page')
  const target = useSession((s) => s.previewTarget)
  const { mounted, closing } = useExitPresence(open)
  // Hold the last real target through the exit animation (the store nulls it at close). The body is
  // NOT keyed by target: an overtake swaps contents in place — the window never jumps.
  const held = useRef(target)
  if (target) held.current = target
  if (!mounted || !held.current) return null
  return <PreviewWindowBody target={held.current} closing={closing} />
}

function PreviewWindowBody({
  target,
  closing,
}: {
  target: PreviewTarget
  closing: boolean
}): React.JSX.Element {
  const closePreview = useSession((s) => s.closePreview)
  const select = useSession((s) => s.select)
  const tree = useSession((s) => s.tree)
  // The window root — the engulf FLIP and the tab-slide's pane push both measure from here.
  const rootRef = useRef<HTMLDivElement>(null)

  // Fully editable via the seam's edit flip; a new target starts back at the read-only portal.
  const [editing, setEditing] = useState(false)
  useEffect(() => setEditing(false), [target.path])

  // The preview's Subfield counts a LOCAL body — never the shared `liveBody` slot (single-owner; a
  // second writer would evict the main pane's live count to its saved snapshot). PageEmbed reports
  // the body via onBody (load-seed + edits): the first body for a path seeds immediately, edits
  // debounce like PageView's stats buffer. Collapse is session-only (a transient floating surface).
  const [previewBody, setPreviewBody] = useState('')
  const statsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const seededPath = useRef<string | null>(null)
  useEffect(() => {
    setPreviewBody('')
    // Kill any pending debounced write from the outgoing page so it can't land as a stale count.
    clearTimeout(statsTimer.current)
  }, [target.path])
  useEffect(
    () => () => {
      clearTimeout(statsTimer.current)
    },
    [],
  )
  const onPreviewBody = (b: string): void => {
    clearTimeout(statsTimer.current)
    if (seededPath.current !== target.path) {
      seededPath.current = target.path
      setPreviewBody(b)
      return
    }
    statsTimer.current = setTimeout(() => setPreviewBody(b), STATS_DEBOUNCE_MS)
  }
  const scope = useMemo<SubfieldScope>(
    () => ({ target: { id: target.id, path: target.path }, body: previewBody }),
    [target.id, target.path, previewBody],
  )
  // Inspector: overlay-mounted right; Escape closes it FIRST, then the window.
  const [inspectorOpen, setInspectorOpen] = useState(false)

  // Wiki-links inside the preview stay inside it — a click opens (or dedup-focuses) a tab.
  // ⌘-click is ADDITIVE: a new app tab opens behind, the preview stays.
  const openPreviewTab = useSession((s) => s.openPreviewTab)
  const { hover, card: hoverCard } = useConnectionHover()
  const connections = useMemo<ConnectionsApi | undefined>(() => {
    if (!tree) return undefined
    const idx = buildPageIndex(flattenPages(tree))
    return {
      ...idx,
      open: (page) => openPreviewTab({ id: page.id, path: page.path }),
      bypass: (page) =>
        void select({ kind: 'page', id: page.id, path: page.path }, { newTab: true }),
      hover,
      menu: showConnectionMenu,
    }
  }, [tree, openPreviewTab, select, hover])

  const resolveIndex = useMemo(() => (tree ? buildResolveIndex(tree) : null), [tree])

  // The breadcrumb: the page's container chain + the page itself as the last crumb.
  const crumbs = useMemo(() => {
    if (!resolveIndex) return []
    const res = resolveWith(resolveIndex, { kind: 'page', id: target.id, path: target.path })
    return res ? [...res.path, { icon: res.icon, title: res.title }] : []
  }, [resolveIndex, target])

  // Tab-switch slide: the incoming page slides in from the strip direction (the DetailPane WAAPI
  // pattern on the preview's own stamp), and the open inspector RIDES the same keyframes — the
  // one-motion push (transform only: the pane never blinks).
  const previewSlide = useSession((s) => s.previewSlide)
  const bodyRef = useRef<HTMLDivElement>(null)
  const prevPath = useRef(target.path)
  const playedSeq = useRef(0)
  useEffect(() => {
    const swapped = prevPath.current !== target.path
    prevPath.current = target.path
    if (!swapped || !previewSlide || previewSlide.seq === playedSeq.current) return
    playedSeq.current = previewSlide.seq
    const x = previewSlide.dir === 'back' ? -SLIDE_PX : SLIDE_PX
    const timing = { duration: Number.parseInt(duration.fast, 10), easing: easing.standard }
    bodyRef.current?.animate(
      [
        { transform: `translateX(${x}px)`, opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 },
      ],
      timing,
    )
    if (inspectorOpen)
      rootRef.current
        ?.querySelector('.pgpreview-inspector')
        ?.animate([{ transform: `translateX(${x}px)` }, { transform: 'translateX(0)' }], timing)
  }, [target.path, previewSlide, inspectorOpen])

  // Warmth: the shared seam — editor state per tab id + body-scroll capture/restore.
  const warmSeam = usePreviewWarm(bodyRef, target.path)

  // Promotion: open for real through the normal select; the window ENGULFS into the pane.
  const promote = (): void => {
    closePreview('engulf')
    void select({ kind: 'page', id: target.id, path: target.path })
  }

  // The engulf exit: a FLIP from the window's live rect onto the detail pane's — translate to
  // its center, scale to its box, fade — on the base/standard tokens. WAAPI owns it (the rects are
  // runtime values); the css .engulfing class only suppresses the default scale-out.
  const exitReason = useSession((s) => s.previewExit)
  useEffect(() => {
    if (!closing || useSession.getState().previewExit !== 'engulf') return
    const el = rootRef.current
    const to = getDetailPaneRect()
    if (!el || !to) return
    const from = el.getBoundingClientRect()
    const dx = to.left + to.width / 2 - (from.left + from.width / 2)
    const dy = to.top + to.height / 2 - (from.top + from.height / 2)
    el.animate(
      [
        { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
        {
          transform: `translate(${dx}px, ${dy}px) scale(${to.width / from.width}, ${to.height / from.height})`,
          opacity: 0,
        },
      ],
      { duration: Number.parseInt(duration.base, 10), easing: easing.standard, fill: 'forwards' },
    )
  }, [closing])

  return (
    <PreviewPane
      id="page-preview"
      rootRef={rootRef}
      className={cx('pgpreview', closing && EXIT_CLASS[exitReason])}
      closing={closing}
      onClose={() => closePreview()}
      onEscape={() => (inspectorOpen ? setInspectorOpen(false) : closePreview())}
      dragSurfaces={DRAG_SURFACES}
      ariaLabel="Page Preview"
      tintOpacity={85}
      // --mdpm-scale mirrors the embed's so the footer aligns to its text column.
      style={{ '--mdpm-scale': EMBED_SCALE } as React.CSSProperties}
      onScan={promote}
      title={
        <PreviewTabStrip
          index={resolveIndex}
          title={<NavCrumbs path={crumbs} className="pgpreview-crumbs" iconSize={11} />}
        />
      }
      actions={
        <PreviewActions
          inspectorOpen={inspectorOpen}
          onToggleInspector={() => setInspectorOpen((v) => !v)}
        />
      }
      right={{
        windowId: 'preview-inspector',
        bounds: PREVIEW_PANE_INSPECTOR,
        mode: 'overlay',
        open: inspectorOpen,
        className: 'pgpreview-inspector',
        children: (
          <div className="pgpreview-inspector-body">
            {inspectorOpen && <PreviewInspector target={target} />}
          </div>
        ),
      }}
      // Scoped to THIS page and counting the window's own body — never the app-wide live count.
      footer={<Subfield scope={scope} />}
    >
      <div className="pgpreview-body edge-fade pgembed-grows" ref={bodyRef}>
        <PageEmbed
          key={target.path}
          path={target.path}
          editing={editing}
          onBeginEdit={() => setEditing(true)}
          connections={connections}
          onBody={onPreviewBody}
          warm={warmSeam}
        />
      </div>
      {hoverCard}
    </PreviewPane>
  )
}
