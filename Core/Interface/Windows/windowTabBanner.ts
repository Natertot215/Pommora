import { createContext, useContext, useEffect } from 'react'
import type { BannerMenuAction } from '../../Actions/identityMenus'
import type { WindowTarget } from '../../Navigation/navRef'
import { resolveAssetUrl } from '../../Assets/assetUrl'
import { findSpace } from '../../Nexus/treeIndex'
import { coverOf } from '../../Pages/pageDetail'
import { fetchPageDetail, readPageDetail } from '../../Session/pageDetailCache'
import { type Personalization, settingOf } from '../../Settings/personalization'
import { useSession } from '../../Session/store'
import { useLatest } from '@pommora/uix/Utilities/stableApi'

type BannerRun = (action: BannerMenuAction) => Promise<void>

interface BannerSeat {
  tabId: string
  run: BannerRun
  rename: () => boolean
}

// One tabbed window stands at a time and only its shown tab's header holds the seat; a parked tab's stays out. A row aimed at another tab waits here until that tab's header registers; any other registration drops it.
let seat: BannerSeat | null = null
let pending: { tabId: string; action: BannerMenuAction } | null = null

/** The window tab a body belongs to, and whether it is the one on show. */
export const WindowTabContext = createContext<{ tabId: string; shown: boolean } | null>(null)

export const windowBannerShown = (p: Personalization, kind: WindowTarget['kind']): boolean =>
  settingOf(p, kind === 'space' ? 'windowSpaceBanners' : 'windowPageBanners')

// The rows follow what the header draws: a banner whose asset no longer resolves reads as none, so Add repairs it.
export async function windowBannerAdd(target: WindowTarget): Promise<boolean> {
  const { tree, assetMap } = useSession.getState()
  const detail =
    target.kind === 'page'
      ? (readPageDetail(target.path) ?? (await fetchPageDetail(target.path)))
      : null
  const value =
    target.kind === 'space' ? findSpace(tree, target.id)?.banner : detail && coverOf(detail)
  return resolveAssetUrl(value, assetMap) === null
}

export function runWindowBanner(tabId: string, action: BannerMenuAction): void {
  if (seat?.tabId === tabId) {
    void seat.run(action)
    return
  }
  pending = { tabId, action }
  useSession.getState().activateWindowTab(tabId)
}

// The title rides the banner, so a tab whose banner draws no title leaves its rename to the window's own label.
export const renameWindowTitle = (tabId: string): boolean => seat?.tabId === tabId && seat.rename()

export function useWindowBannerSeat(active: boolean, run: BannerRun, rename?: () => void): void {
  const held = useLatest(run)
  const heldRename = useLatest(rename)
  const tab = useContext(WindowTabContext)
  const tabId = active && tab?.shown ? tab.tabId : undefined
  useEffect(() => {
    if (!tabId) return
    const mine: BannerSeat = {
      tabId,
      run: (action) => held.current(action),
      rename: () => {
        const open = heldRename.current
        open?.()
        return open !== undefined
      },
    }
    seat = mine
    const due = pending?.tabId === tabId ? pending.action : null
    pending = null
    if (due) void mine.run(due)
    return () => {
      if (seat === mine) seat = null
    }
  }, [tabId])
}
