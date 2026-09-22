import { type RefObject, useEffect, useRef } from 'react'
import { slideIn } from '@pommora/uix/Animations/motion'
import { useSession } from '../../Session/store'

// Keyed on the active tab rather than its target: the map tab has none.
export function useWindowTabSlide(
  surfaceRef: RefObject<HTMLElement | null>,
  rootRef: RefObject<HTMLElement | null>,
  sidePaneOpen: boolean,
): void {
  const activeTabId = useSession((s) => s.pageWindow?.activeTabId)
  const windowSlide = useSession((s) => s.windowSlide)
  const prevId = useRef(activeTabId)
  // A stamp from before this window mounted belongs to another window's switch.
  const playedSeq = useRef(windowSlide?.seq)
  useEffect(() => {
    const swapped = prevId.current !== activeTabId
    prevId.current = activeTabId
    if (!swapped || !windowSlide || windowSlide.seq === playedSeq.current) return
    playedSeq.current = windowSlide.seq
    const back = windowSlide.dir === 'back'
    slideIn(surfaceRef.current, back)
    if (sidePaneOpen) slideIn(rootRef.current?.querySelector('.window-side-pane'), back, false)
  }, [activeTabId, windowSlide, sidePaneOpen, surfaceRef, rootRef])
}
