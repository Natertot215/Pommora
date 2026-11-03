import { useEffect } from 'react'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import { useSession } from './store'

/** Runs `run` on navigation: a selection change, or a tab switch in the main window or a page window. A subscription, so its host re-renders on none of them. */
export function useOnNavigate(run: () => void): void {
  const latest = useLatest(run)
  useEffect(
    () =>
      useSession.subscribe((s, prev) => {
        if (
          s.selection !== prev.selection ||
          s.activeTabId !== prev.activeTabId ||
          s.windowSlot?.activeTabId !== prev.windowSlot?.activeTabId
        )
          latest.current()
      }),
    [latest],
  )
}
