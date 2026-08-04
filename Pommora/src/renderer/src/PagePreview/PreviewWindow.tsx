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
import type { ConnectionsApi } from '../MarkdownPM/connections'
import { showConnectionMenu } from '../Embeds/connectionMenu'
import { useConnectionHover } from '../Embeds/ConnectionHoverCard'
import { getDetailPaneRect } from '../Detail/DetailPane'
import { NavCrumbs } from '../Navigation/NavList'
import { resolveWith } from '../Navigation/navResolve'
import { pageIndexOf, resolveIndexOf } from '../treeIndex'
import { useSession, type PreviewTarget } from '../store'
import { PreviewActions } from './PreviewActions'
import { PreviewInspector } from './PreviewInspector'
import { PreviewTabStrip } from './PreviewTabStrip'
import { usePreviewWarm } from './usePreviewWarm'
import './previewWindow.css'

// The tab wrap's bare space moves too — a press on a .tab is not the wrap and never arms.
const DRAG_SURFACES =
  '.pgpreview-body, .pgpreview-tabwrap, .pgpreview-tabscroll, .pgpreview-tabstrip'

// The DetailPane's view-slide value, on the preview's own stamp.
const SLIDE_PX = 14

// Mirrors PageView — edits coalesce before the count recomputes.
const STATS_DEBOUNCE_MS = 120

// The class tells the stylesheet to suppress the shell's default scale-out so one motion owns the
// window; a plain dismiss keeps it.
const EXIT_CLASS = { dismiss: '', engulf: 'engulfing', morph: 'morphing' } as const

export function PreviewWindow(): React.JSX.Element | null {
  // Keys on the PAGE flavor, not the derived target — the nav flavor renders in NavWindow's
  // chrome, and its map tab nulls the target without closing anything.
  const open = useSession((s) => s.preview?.flavor === 'page')
  const target = useSession((s) => s.previewTarget)
  const { mounted, closing } = useExitPresence(open)
  // Held through the exit animation (the store nulls target at close). Not keyed by target — an
  // overtake swaps contents in place, the window never jumps.
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

  // Counts a LOCAL body — never the shared `liveBody` slot (single-owner; a second writer would
  // evict the main pane's live count).
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
  // Escape closes the inspector first, then the window.
  const [inspectorOpen, setInspectorOpen] = useState(false)

  // ⌘-click (bypass) is ADDITIVE — a new app tab opens behind, the preview stays.
  const openPreviewTab = useSession((s) => s.openPreviewTab)
  const { hover, card: hoverCard } = useConnectionHover()
  const connections = useMemo<ConnectionsApi | undefined>(() => {
    if (!tree) return undefined
    const idx = pageIndexOf(tree)
    return {
      ...idx,
      open: (page) => openPreviewTab({ id: page.id, path: page.path }),
      bypass: (page) =>
        void select({ kind: 'page', id: page.id, path: page.path }, { newTab: true }),
      hover,
      menu: showConnectionMenu,
    }
  }, [tree, openPreviewTab, select, hover])

  const resolveIndex = tree ? resolveIndexOf(tree) : null

  const crumbs = useMemo(() => {
    if (!resolveIndex) return []
    const res = resolveWith(resolveIndex, { kind: 'page', id: target.id })
    return res ? [...res.path, { icon: res.icon, title: res.title }] : []
  }, [resolveIndex, target])

  // The open inspector RIDES the same keyframes as the body — one motion, transform only, so the
  // pane never blinks.
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

  const warmSeam = usePreviewWarm(bodyRef, target.path)

  // Opens for real through the normal select; the window ENGULFS into the pane.
  const promote = (): void => {
    closePreview('engulf')
    void select({ kind: 'page', id: target.id, path: target.path })
  }

  // FLIP from the window's live rect onto the detail pane's. WAAPI owns it (the rects are runtime
  // values); the css .engulfing class only suppresses the default scale-out.
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
          title={<NavCrumbs path={crumbs} className="pgpreview-crumbs crumb-two-tone" iconSize={11} />}
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
