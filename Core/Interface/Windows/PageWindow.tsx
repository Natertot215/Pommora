import { useEffect, useMemo, useRef, useState } from 'react'
import { footerLabel } from '@pommora/core/Actions/toggleLabels'
import { cx } from '@pommora/uix/Utilities/cx'
import { duration, easing, ms } from '@pommora/uix/Animations/motion'
import { WINDOW_BASE_PANEL, WindowBase } from '@pommora/uix/Windows/window-base'
import { useHeldPresence } from '@pommora/uix/Animations/useExitPresence'
import { PageTile } from '../../Tiles/Surfaces/PageTile'
import { Subfield } from '../Subfield/Subfield'
import { CitationsToggle } from '../Subfield/CitationsToggle'
import type { SubfieldPage } from '../Subfield/subfieldItems'
import { getContentViewRect } from '../ContentView'
import { NavTrail } from '@pommora/uix/Elements/NavTrail/NavTrail'
import { resolveIndexOf, trailOf } from '../../Nexus/treeIndex'
import { useWindowTabConnections } from '../../Session/pageConnections'
import { windowTargetOf, useEmbedScale, useSession, type WindowTarget } from '../../Session/store'
import { WindowActions } from '@pommora/uix/Windows/WindowActions'
import { PagePropertyRows } from '../../Properties/Page/PagePropertyRows'
import { WindowTabStrip } from './WindowTabStrip'
import { useWindowWarm } from './useWindowWarm'
import './page-window.css'

const DRAG_SURFACES = '.page-window-body, .window-tabwrap, .tab-scroll, .tab-strip'

const SLIDE_PX = 14

const STATS_DEBOUNCE_MS = 120

const EXIT_CLASS = { dismiss: '', engulf: 'engulfing', morph: 'morphing' } as const

export function PageWindow(): React.JSX.Element | null {
  const open = useSession((s) => s.pageWindow?.kind === 'page')
  const target = useSession(windowTargetOf)
  const shown = useHeldPresence(target, open)
  if (!shown) return null
  return <PageWindowBody target={shown.held} closing={shown.closing} />
}

function PageWindowBody({
  target,
  closing,
}: {
  target: WindowTarget
  closing: boolean
}): React.JSX.Element {
  const closeWindow = useSession((s) => s.closeWindow)
  const embedScale = useEmbedScale()
  const select = useSession((s) => s.select)
  const tree = useSession((s) => s.tree)
  const rootRef = useRef<HTMLDivElement>(null)

  const [editing, setEditing] = useState(false)
  useEffect(() => setEditing(false), [target.path])

  const [bodyText, setBodyText] = useState('')
  const statsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const seededPath = useRef<string | null>(null)
  useEffect(() => {
    setBodyText('')
    clearTimeout(statsTimer.current)
  }, [target.path])
  useEffect(
    () => () => {
      clearTimeout(statsTimer.current)
    },
    [],
  )
  const onBodyText = (b: string): void => {
    clearTimeout(statsTimer.current)
    if (seededPath.current !== target.path) {
      seededPath.current = target.path
      setBodyText(b)
      return
    }
    statsTimer.current = setTimeout(() => setBodyText(b), STATS_DEBOUNCE_MS)
  }
  const page = useMemo<SubfieldPage>(
    () => ({ target: { kind: 'page', id: target.id, path: target.path }, body: bodyText }),
    [target.id, target.path, bodyText],
  )
  const [inspectorOpen, setInspectorOpen] = useState(false)

  const connections = useWindowTabConnections(tree)

  const resolveIndex = tree ? resolveIndexOf(tree) : null

  const trail = trailOf(tree, { kind: 'page', id: target.id })

  const windowSlide = useSession((s) => s.windowSlide)
  const bodyRef = useRef<HTMLDivElement>(null)
  const prevPath = useRef(target.path)
  const playedSeq = useRef(0)
  useEffect(() => {
    const swapped = prevPath.current !== target.path
    prevPath.current = target.path
    if (!swapped || !windowSlide || windowSlide.seq === playedSeq.current) return
    playedSeq.current = windowSlide.seq
    const x = windowSlide.dir === 'back' ? -SLIDE_PX : SLIDE_PX
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
  }, [target.path, windowSlide, inspectorOpen])

  const warmSeam = useWindowWarm(bodyRef, target.path)

  const promote = (): void => {
    closeWindow('engulf')
    void select({ kind: 'page', id: target.id, path: target.path })
  }

  // FLIP from the window's live rect onto the content view's. WAAPI owns it (the rects are runtime values); the css .engulfing class only suppresses the default scale-out.
  const exitReason = useSession((s) => s.windowExit)
  useEffect(() => {
    if (!closing || useSession.getState().windowExit !== 'engulf') return
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
      id="page-window"
      rootRef={rootRef}
      className={cx('page-window', closing && EXIT_CLASS[exitReason])}
      closing={closing}
      onClose={() => closeWindow()}
      onEscape={() => (inspectorOpen ? setInspectorOpen(false) : closeWindow())}
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
        windowId: 'window-inspector',
        bounds: WINDOW_BASE_PANEL,
        mode: 'overlay',
        open: inspectorOpen,
        className: 'page-window-inspector',
        children: (
          <div className="window-pane-scroll">
            {inspectorOpen && <PagePropertyRows variant="panel" page={target} />}
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
          onBody={onBodyText}
          warm={warmSeam}
        />
      </div>
    </WindowBase>
  )
}
