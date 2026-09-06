import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Segmented, type Segment } from '../Buttons/Button'
import { useDismissal } from '../Interactions/dismissalStack'
import { useExitPresence } from '../Animations/useExitPresence'
import { MenuSurface } from './menu-surface'

/** The open state lives here, not in `MenuSurface`, which stays state-free so the toolbar trio shares one dismiss region. */
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
  dismissOnOutside?: boolean
  edgeInset?: number
  classNames?: {
    wrapper?: string
    button?: string
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
  useDismissal(open, false, {
    layer: () => wrapRef.current,
    dismiss: () => setOpen(false),
    outsidePress: dismissOnOutside,
  })
  const pane = useExitPresence(open)

  // The pane is centered on the button, so the room to its right counts twice; a live rect, since a translated cluster must measure where it sits.
  useLayoutEffect(() => {
    if (!pane.mounted || edgeInset === undefined) return
    // Written to the node, never state (a drag fires this per frame); refs read inside, since a detached node measures zeros.
    const measure = (): void => {
      const wrap = wrapRef.current
      const anchor = anchorRef.current
      if (!wrap || !anchor) return
      const r = wrap.getBoundingClientRect()
      const max = 2 * Math.max(0, window.innerWidth - edgeInset - (r.left + r.width / 2))
      anchor.style.setProperty('--menu-max', `${max}px`)
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
    <Segmented
      glass
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
