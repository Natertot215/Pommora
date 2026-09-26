import { useEffect, useRef } from 'react'
import { footerLabel } from '@pommora/core/Actions/toggleLabels'
import type { WindowTarget } from '@pommora/core/Navigation/navRef'
import { cx } from '@pommora/uix/Utilities/cx'
import { duration, easing, flipTransform, ms } from '@pommora/uix/Animations/motion'
import { WindowBase } from '@pommora/uix/Windows/WindowBase'
import { useHeldPresence } from '@pommora/uix/Animations/useExitPresence'
import { chromePartRect, publishChromePart } from '../chromeParts'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { resolveIndexOf, trailOf } from '../../Nexus/treeIndex'
import { useFold, windowTargetOf, useSession } from '../../Session/store'
import { WindowTabStrip } from './WindowTabStrip'
import { useWindowTabBody } from './WindowTabBody'
import { useWindowGeometry } from './useWindowGeometry'
import { useWindowTabSlide } from './useWindowTabSlide'
import './page-window.css'

const DRAG_SURFACES = '.page-window-content, .tab-scroll, .tab-strip'

const EXIT_CLASS = { dismiss: '', engulf: 'engulfing', morph: 'morphing' } as const

export function PageWindow(): React.JSX.Element | null {
  const open = useSession((s) => s.windowSlot?.kind === 'page')
  const target = useSession(windowTargetOf)
  const shown = useHeldPresence(target, 'base', open)
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
  const summon = useSession((s) => s.windowSummon)
  const geometry = useWindowGeometry('page-window')
  const [footerOpen, setFooterOpen] = useFold('footer:page-window')
  const tree = useSession((s) => s.tree)
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => publishChromePart('pageWindow')(rootRef.current), [])

  const { body, bodyRef, right, actions, footer, footerLead, closeSidePane, promote } =
    useWindowTabBody(target)
  const sidePaneOpen = right.open === true

  const resolveIndex = tree ? resolveIndexOf(tree) : null
  const trail = trailOf(tree, target)

  useWindowTabSlide(bodyRef, rootRef, sidePaneOpen)

  // FLIP from the window's live rect onto the content view's. WAAPI owns it (the rects are runtime values); the css .engulfing class only suppresses the default scale-out.
  const exitReason = useSession((s) => s.windowExit)
  useEffect(() => {
    if (!closing || useSession.getState().windowExit !== 'engulf') return
    const el = rootRef.current
    const to = chromePartRect('contentView')
    if (!el || !to) return
    el.animate(
      [
        { transform: 'none', opacity: 1 },
        { transform: flipTransform(el.getBoundingClientRect(), to), opacity: 0 },
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
      raiseOn={summon}
      onEscape={() => (sidePaneOpen ? closeSidePane() : closeWindow())}
      dragSurfaces={DRAG_SURFACES}
      ariaLabel="Page Preview"
      onScan={promote}
      title={
        <WindowTabStrip
          index={resolveIndex}
          title={<NavTrail segments={trail} selected className="page-window-crumbs" />}
        />
      }
      actions={actions}
      right={right}
      footer={
        footer
          ? {
              bar: footer,
              open: footerOpen,
              onOpenChange: setFooterOpen,
              label: footerLabel,
              lead: footerLead,
            }
          : undefined
      }
    >
      <div className="page-window-content">{body}</div>
    </WindowBase>
  )
}
