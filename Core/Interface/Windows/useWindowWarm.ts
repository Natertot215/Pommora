import { useCallback, useEffect, useMemo, type RefObject } from 'react'
import type { WarmSeam } from '../../MarkdownPM/warmSeam'
import { useSession } from '../../Session/store'
import { knownBody } from '../../Session/pageDetailCache'
import { warmSeamOf } from '../../Navigation/warmTabs'
import { captureBodyScroll, readBodyScroll, WINDOW_OWNER } from './windowCache'

// Liveness-gated — the editor's unmount capture trails the store's drop, and ungated it would re-insert one ghost editorState per close.

export function useWindowWarm(
  scrollerRef: RefObject<HTMLElement | null>,
  activePath: string | undefined,
  /** Whether the tab's body can hold a scroll yet — `true` for a Page tab, a Space tab's board readiness otherwise. */
  ready: boolean,
): WarmSeam | undefined {
  const activeTabId = useSession((s) => s.pageWindow?.activeTabId)

  const isLive = useCallback(
    (tabId: string): boolean =>
      useSession.getState().pageWindow?.tabs.some((t) => t.id === tabId) ?? false,
    [],
  )

  const seam = useMemo<WarmSeam | undefined>(
    () =>
      activeTabId
        ? warmSeamOf(
            WINDOW_OWNER,
            activeTabId,
            () => (activePath === undefined ? undefined : knownBody(activePath)),
            () => isLive(activeTabId),
          )
        : undefined,
    [activeTabId, activePath, isLive],
  )

  useEffect(() => {
    const el = scrollerRef.current
    if (!el || !activeTabId) return
    const onScroll = (): void => {
      if (isLive(activeTabId)) captureBodyScroll(activeTabId, el.scrollTop)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [activeTabId, isLive, scrollerRef])

  // CM6 builds the embed's height ASYNC after mount — an immediate set clamps to 0, and double-rAF lands after its first measure/layout pass. A Space tab's board is read over IPC on its first activation, so `ready` is the second thing worth waiting for.
  useEffect(() => {
    if (!activeTabId || !ready) return
    const saved = readBodyScroll(activeTabId)
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        if (scrollerRef.current) scrollerRef.current.scrollTop = saved
      })
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [activeTabId, ready])

  return seam
}
