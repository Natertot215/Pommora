import { useEffect, useRef } from 'react'
import { footerLabel } from '@pommora/core/Actions/toggleLabels'
import type { WindowTarget } from '@pommora/core/Navigation/navRef'
import { cx } from '@pommora/uix/Utilities/cx'
import { duration, easing, ms } from '@pommora/uix/Animations/motion'
import { WindowBase } from '@pommora/uix/Windows/window-base'
import { useHeldPresence } from '@pommora/uix/Animations/useExitPresence'
import { chromePartRect, publishChromePart } from '../chromeParts'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { resolveIndexOf, trailOf } from '../../Nexus/treeIndex'
import { windowTargetOf, useEmbedScale, useSession } from '../../Session/store'
import { WindowTabStrip } from './WindowTabStrip'
import { useWindowTabBody } from './WindowTabBody'
import { useWindowGeometry } from './useWindowGeometry'
import './page-window.css'

const DRAG_SURFACES = '.tab-scroll, .tab-strip'

const SLIDE_PX = 14

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
  const geometry = useWindowGeometry('page-window')
  const embedScale = useEmbedScale()
  const tree = useSession((s) => s.tree)
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => publishChromePart('pageWindow')(rootRef.current), [])

  const { body, bodyRef, right, actions, footer, footerLead, closeSidePane, promote } =
    useWindowTabBody(target)
  const sidePaneOpen = right.open === true

  const resolveIndex = tree ? resolveIndexOf(tree) : null
  const trail = trailOf(tree, target)

  const windowSlide = useSession((s) => s.windowSlide)
  const prevId = useRef(target.id)
  const playedSeq = useRef(0)
  useEffect(() => {
    const swapped = prevId.current !== target.id
    prevId.current = target.id
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
    if (sidePaneOpen)
      rootRef.current
        ?.querySelector('.window-side-pane')
        ?.animate([{ transform: `translateX(${x}px)` }, { transform: 'translateX(0)' }], timing)
  }, [target.id, windowSlide, sidePaneOpen, bodyRef])

  // FLIP from the window's live rect onto the content view's. WAAPI owns it (the rects are runtime values); the css .engulfing class only suppresses the default scale-out.
  const exitReason = useSession((s) => s.windowExit)
  useEffect(() => {
    if (!closing || useSession.getState().windowExit !== 'engulf') return
    const el = rootRef.current
    const to = chromePartRect('contentView')
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
      {...geometry}
      rootRef={rootRef}
      className={cx('page-window', closing && EXIT_CLASS[exitReason])}
      closing={closing}
      onClose={() => closeWindow()}
      onEscape={() => (sidePaneOpen ? closeSidePane() : closeWindow())}
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
      actions={actions}
      right={right}
      footer={footer}
      footerLabel={footerLabel}
      footerLead={footerLead}
    >
      {body}
    </WindowBase>
  )
}
