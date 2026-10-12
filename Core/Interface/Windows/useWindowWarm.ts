import { useEffect, type RefObject } from 'react'
import type { WarmSeam } from '../../MarkdownPM/warmSeam'
import { useSession } from '../../Session/store'
import { knownBody } from '../../Session/pageDetailCache'
import { warmSeamOf } from '../../Session/warmCache'
import { captureBodyScroll, readBodyScroll, WINDOW_OWNER } from './windowCache'

// Liveness-gated — the editor's unmount capture trails the store's drop, and ungated it would re-insert one ghost editorState per close.
const isLive = (tabId: string): boolean =>
  useSession.getState().windowSlot?.tabs.some((t) => t.id === tabId) ?? false

/** One window tab's editor seam, fenced against the body known for its path. */
export const windowSeam = (tabId: string, path: string): WarmSeam =>
  warmSeamOf(
    () => WINDOW_OWNER,
    tabId,
    () => knownBody(path),
    () => isLive(tabId),
  )

/** A Space tab's body scroll; a Page tab's scroll is its editor's, kept in the warm store. */
export function useWindowWarm(
  scrollerRef: RefObject<HTMLElement | null>,
  /** Whether the shown tab is a Space tab whose board has landed. */
  spaceReady: boolean,
): void {
  const activeTabId = useSession((s) => s.windowSlot?.activeTabId)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el || !activeTabId || !spaceReady) return
    const onScroll = (): void => {
      if (isLive(activeTabId)) captureBodyScroll(activeTabId, el.scrollTop)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [activeTabId, spaceReady, scrollerRef])

  // A Space tab's board is read over IPC on its first activation, so the restore waits for readiness; even then an immediate set lands before the board's tiles lay out and clamps to 0, so double-rAF lands after their first layout pass.
  useEffect(() => {
    if (!activeTabId || !spaceReady) return
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
  }, [activeTabId, spaceReady])
}
