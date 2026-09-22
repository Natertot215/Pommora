import { useEffect, useRef } from 'react'
import type { BannerMenuAction } from '@pommora/core/Actions/identityMenus'
import type { WindowTarget } from '@pommora/core/Navigation/navRef'
import { resolveAssetUrl } from '../../Assets/assetUrl'
import { findSpace } from '../../Nexus/treeIndex'
import { coverOf } from '../../Pages/pageDetail'
import { fetchPageDetail, readPageDetail } from '../../Session/pageDetailCache'
import type { Personalization } from '../../Settings/personalization'
import { useSession } from '../../Session/store'

type BannerRun = (action: BannerMenuAction) => Promise<void>

interface BannerSeat {
  tabId: string
  run: BannerRun
}

// One tabbed window stands at a time and it mounts one tab body, so one seat stands. A row aimed at another tab waits here until that tab's header registers; any other registration drops it.
let seat: BannerSeat | null = null
let pending: { tabId: string; action: BannerMenuAction } | null = null

export const windowBannerShown = (p: Personalization, kind: WindowTarget['kind']): boolean =>
  (kind === 'space' ? p.windowSpaceBanners : p.windowPageBanners) ?? false

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

export function useWindowBannerSeat(active: boolean, run: BannerRun): void {
  const held = useRef(run)
  held.current = run
  const tabId = useSession((s) => (active ? s.pageWindow?.activeTabId : undefined))
  useEffect(() => {
    if (!tabId) return
    const mine: BannerSeat = { tabId, run: (action) => held.current(action) }
    seat = mine
    const due = pending?.tabId === tabId ? pending.action : null
    pending = null
    if (due) void mine.run(due)
    return () => {
      if (seat === mine) seat = null
    }
  }, [tabId])
}
