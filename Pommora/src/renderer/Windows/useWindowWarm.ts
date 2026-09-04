import { useCallback, useEffect, useMemo, type RefObject } from 'react'
import type { WarmSeam } from '@renderer/MarkdownPM/warmSeam'
import { useSession } from '../store'
import { fenceWarm, readPageDetail } from '../Store/tabState'
import { captureWindowCache, readWindowCache, type WindowCacheEntry } from './windowCache'

// Captures are liveness-gated — the editor's unmount capture trails the store's drop, and ungated
// it would re-insert one ghost editorState per close.

export function useWindowWarm(
  scrollerRef: RefObject<HTMLElement | null>,
  activePath: string | undefined,
): WarmSeam | undefined {
  const activeTabId = useSession((s) => s.pageWindow?.activeTabId)

  const captureIfLive = useCallback((tabId: string, entry: WindowCacheEntry): void => {
    const win = useSession.getState().pageWindow
    if (win?.tabs.some((t) => t.id === tabId)) captureWindowCache(tabId, entry)
  }, [])

  const seam = useMemo<WarmSeam | undefined>(
    () =>
      activeTabId
        ? {
            restore: () =>
              fenceWarm(
                readWindowCache(activeTabId),
                activePath === undefined ? undefined : readPageDetail(activePath)?.body,
              ),
            capture: (state) => captureIfLive(activeTabId, state),
          }
        : undefined,
    [activeTabId, activePath, captureIfLive],
  )

  // A passive listener records the active tab's body scroll as it happens — never a switch-time
  // read of a maybe-clamped value.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el || !activeTabId) return
    const onScroll = (): void => captureIfLive(activeTabId, { bodyScrollTop: el.scrollTop })
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [activeTabId, captureIfLive, scrollerRef])

  // CM6 builds the embed's height ASYNC after mount — an immediate set clamps to 0 (and the
  // listener records the clamp as truth). Double-rAF lands after its first measure/layout pass.
  useEffect(() => {
    if (!activeTabId || activePath === undefined) return
    const saved = readWindowCache(activeTabId)?.bodyScrollTop ?? 0
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
    // activePath IS the switch signal — the restore fires per content swap, not per tab-id.
  }, [activePath])

  return seam
}
