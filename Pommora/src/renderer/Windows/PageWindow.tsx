import { useEffect, useMemo, useRef, useState } from 'react'
import { footerLabel } from '@shared/toggleLabels'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { duration, easing, ms } from '@renderer/DesignSystem/Animation'
import { WINDOW_BASE_INSPECTOR, WindowBase } from './window-base'
import { useExitPresence } from '@renderer/DesignSystem/Animation/useExitPresence'
import { PageTile } from '../SurfacePM/PageTile'
import { Subfield } from '../Interface/Subfield/Subfield'
import { CitationsToggle } from '../Interface/Subfield/CitationsToggle'
import type { SubfieldPage } from '../Interface/Subfield/subfieldItems'
import type { ConnectionsApi } from '../MarkdownPM/Connections'
import { showConnectionMenu } from '../Links/connectionMenu'
import { hoverConnection, hoverWebsite } from '../Links/ConnectionPane'
import { getContentViewRect } from '../Interface/ContentView'
import { NavTrail, type TrailSegment } from '@renderer/DesignSystem/Elements/NavTrail'
import { ancestryOf, pageIndexOf, resolveIndexOf } from '../treeIndex'
import { previewTargetOf, useEmbedScale, useSession, type PreviewTarget } from '../store'
import { WindowActions } from './WindowActions'
import { WindowInspector } from './WindowInspector'
import { WindowTabStrip } from './WindowTabStrip'
import { useWindowWarm } from './useWindowWarm'
import './pageWindow.css'

const DRAG_SURFACES =
  '.page-window-body, .page-window-tabwrap, .page-window-tabscroll, .page-window-tabstrip'

const SLIDE_PX = 14

const STATS_DEBOUNCE_MS = 120

const EXIT_CLASS = { dismiss: '', engulf: 'engulfing', morph: 'morphing' } as const

const NO_TRAIL: TrailSegment[] = []

export function PageWindow(): React.JSX.Element | null {
  const open = useSession((s) => s.preview?.flavor === 'page')
  const target = useSession(previewTargetOf)
  const { mounted, closing } = useExitPresence(open)
  const held = useRef(target)
  if (target) held.current = target
  if (!mounted || !held.current) return null
  return <PageWindowBody target={held.current} closing={closing} />
}

function PageWindowBody({
  target,
  closing,
}: {
  target: PreviewTarget
  closing: boolean
}): React.JSX.Element {
  const closePreview = useSession((s) => s.closePreview)
  const embedScale = useEmbedScale()
  const select = useSession((s) => s.select)
  const tree = useSession((s) => s.tree)
  const rootRef = useRef<HTMLDivElement>(null)

  const [editing, setEditing] = useState(false)
  useEffect(() => setEditing(false), [target.path])

  const [previewBody, setPreviewBody] = useState('')
  const statsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const seededPath = useRef<string | null>(null)
  useEffect(() => {
    setPreviewBody('')
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
  const page = useMemo<SubfieldPage>(
    () => ({ target: { kind: 'page', id: target.id, path: target.path }, body: previewBody }),
    [target.id, target.path, previewBody],
  )
  const [inspectorOpen, setInspectorOpen] = useState(false)

  const openPreviewTab = useSession((s) => s.openPreviewTab)
  const connections = useMemo<ConnectionsApi | undefined>(() => {
    if (!tree) return undefined
    const idx = pageIndexOf(tree)
    return {
      ...idx,
      open: (page) => openPreviewTab({ id: page.id, path: page.path }),
      bypass: (page) =>
        void select({ kind: 'page', id: page.id, path: page.path }, { newTab: true }),
      hover: hoverConnection,
      hoverSite: hoverWebsite,
      menu: showConnectionMenu,
    }
  }, [tree, openPreviewTab, select])

  const resolveIndex = tree ? resolveIndexOf(tree) : null

  const trail = (tree && ancestryOf(tree, { kind: 'page', id: target.id })) ?? NO_TRAIL

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
    const timing = { duration: ms(duration.fast), easing: easing.baseEase }
    bodyRef.current?.animate(
      [
        { transform: `translateX(${x}px)`, opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 },
      ],
      timing,
    )
    if (inspectorOpen)
      rootRef.current
        ?.querySelector('.page-window-inspector')
        ?.animate([{ transform: `translateX(${x}px)` }, { transform: 'translateX(0)' }], timing)
  }, [target.path, previewSlide, inspectorOpen])

  const warmSeam = useWindowWarm(bodyRef, target.path)

  const promote = (): void => {
    closePreview('engulf')
    void select({ kind: 'page', id: target.id, path: target.path })
  }

  // FLIP from the window's live rect onto the content view's. WAAPI owns it (the rects are runtime
  // values); the css .engulfing class only suppresses the default scale-out.
  const exitReason = useSession((s) => s.previewExit)
  useEffect(() => {
    if (!closing || useSession.getState().previewExit !== 'engulf') return
    const el = rootRef.current
    const to = getContentViewRect()
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
      { duration: ms(duration.base), easing: easing.baseEase, fill: 'forwards' },
    )
  }, [closing])

  return (
    <WindowBase
      id="page-preview"
      rootRef={rootRef}
      className={cx('page-window', closing && EXIT_CLASS[exitReason])}
      closing={closing}
      onClose={() => closePreview()}
      onEscape={() => (inspectorOpen ? setInspectorOpen(false) : closePreview())}
      dragSurfaces={DRAG_SURFACES}
      ariaLabel="Page Preview"
      style={{ '--page-detail-scale': embedScale, '--editor-scale': 1 } as React.CSSProperties}
      onScan={promote}
      title={
        <WindowTabStrip
          index={resolveIndex}
          title={<NavTrail segments={trail} selected className="page-window-crumbs" />}
        />
      }
      actions={
        <WindowActions
          inspectorOpen={inspectorOpen}
          onToggleInspector={() => setInspectorOpen((v) => !v)}
        />
      }
      right={{
        windowId: 'preview-inspector',
        bounds: WINDOW_BASE_INSPECTOR,
        mode: 'overlay',
        open: inspectorOpen,
        className: 'page-window-inspector',
        children: (
          <div className="window-pane-scroll">
            {inspectorOpen && <WindowInspector target={target} />}
          </div>
        ),
      }}
      footer={<Subfield page={page} inert />}
      footerLabel={footerLabel}
      footerLead={<CitationsToggle page={page} />}
    >
      <div className="window-body page-window-body over-scroll page-tile-grows" ref={bodyRef}>
        <PageTile
          key={target.path}
          path={target.path}
          editing={editing}
          onBeginEdit={() => setEditing(true)}
          connections={connections}
          onBody={onPreviewBody}
          warm={warmSeam}
        />
      </div>
    </WindowBase>
  )
}
