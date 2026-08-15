import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { SegmentedButton, type Segment } from '../Segmented-Controls'
import { useDismiss } from '../useDismiss'
import { useExitPresence } from '../../useExitPresence'
import { MenuSurface } from './MenuSurface'

/** A trigger button with a pane hanging under it: the open state, the outside-dismiss, and the
 *  retract beat, stated once. `MenuSurface` stays state-free on purpose — the toolbar trio shares one
 *  dismiss region across two panes and owns that state itself — so the state belongs to this shell
 *  rather than to the surface underneath it.
 *
 *  Carries no styling. Every class comes from the caller, which keeps surface-specific geometry (the
 *  toolbar's swallow shift, its drag-region opt-out) with the surface that means it. */
export function MenuDropdown({
  icon,
  title,
  label,
  labelCollapsed = true,
  edgeInset,
  dismissOnOutside = true,
  classNames,
  onContextMenu,
  children,
}: {
  icon: Segment['icon']
  title: string
  label?: string
  labelCollapsed?: boolean
  /** A click outside closes the pane by default. Set false to keep it open until Escape or a second
   *  press of the trigger — for a pane meant to stay up while you work elsewhere. */
  dismissOnOutside?: boolean
  /** Bounds the pane's growth so its right edge keeps this gap from the window, published to the
   *  anchor as `--menu-dropdown-max` for the pane's own `max-width`. Omit where content sizes itself. */
  edgeInset?: number
  classNames?: {
    wrapper?: string
    button?: string
    /** A layout-neutral slot around the button alone, so `onContextMenu` fires on the button chrome
     *  and not on the open pane, which is a sibling outside it. */
    buttonSlot?: string
    anchor?: string
    pane?: string
  }
  onContextMenu?: (e: React.MouseEvent) => void
  children: (api: { close: () => void }) => ReactNode
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  useDismiss(wrapRef, () => setOpen(false), open, dismissOnOutside)
  const pane = useExitPresence(open)

  // The pane is centred on the button, so the room to that button's right counts twice. Measured from
  // a live rect rather than offsetWidth because the comparison is against the window: a cluster riding
  // a translate puts the on-screen position exactly where the transform contributes.
  useLayoutEffect(() => {
    if (!pane.mounted || edgeInset === undefined) return
    // Written straight to the node, never held as state: nothing renders from it, and a resize fires
    // per frame while the window is dragged — routing it through React would re-render every row on
    // each one. Refs are read inside the callback, never captured: a detached node measures all zeros,
    // which reads as a successful measurement and silently uncaps the pane.
    const measure = (): void => {
      const wrap = wrapRef.current
      const anchor = anchorRef.current
      if (!wrap || !anchor) return
      const r = wrap.getBoundingClientRect()
      const max = 2 * Math.max(0, window.innerWidth - edgeInset - (r.left + r.width / 2))
      anchor.style.setProperty('--menu-dropdown-max', `${max}px`)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [pane.mounted, edgeInset])

  const segment: Segment = {
    icon,
    title,
    label,
    active: open,
    onClick: () => setOpen((v) => !v),
  }
  const button = (
    <SegmentedButton
      segments={[segment]}
      className={classNames?.button}
      labelCollapsed={labelCollapsed}
    />
  )

  return (
    <div ref={wrapRef} className={classNames?.wrapper}>
      {onContextMenu ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
        <span className={classNames?.buttonSlot} onContextMenu={onContextMenu}>
          {button}
        </span>
      ) : (
        button
      )}
      {pane.mounted && (
        <div ref={anchorRef} className={classNames?.anchor}>
          <MenuSurface closing={pane.closing} className={classNames?.pane}>
            {children({ close: () => setOpen(false) })}
          </MenuSurface>
        </div>
      )}
    </div>
  )
}
