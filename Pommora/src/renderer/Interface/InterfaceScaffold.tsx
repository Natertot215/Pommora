import { useEffect, useRef } from 'react'
import { Banner } from './Banner'
import { isSurfaceKind, type BannerOwner } from './scope'
import { useSession } from '../store'
import { navKey } from '../Navigation/navRecents'
import { captureCache, readCache } from '../Store/tabState'

export function InterfaceScaffold({
  owner,
  children,
}: {
  owner: BannerOwner | null
  children?: React.ReactNode
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const activeTabId = useSession((s) => s.activeTabId)
  const selection = useSession((s) => s.selection)
  // A container's warmth is its scroll position only — undo/folds are page-editor concerns.
  const warmKey = selection.kind !== 'none' && selection.kind !== 'page' ? navKey(selection) : null

  // The scaffold's div is reused across containers (no key): scroll tracks continuously into
  // `last` since by cleanup the div may already hold the next container's content.
  useEffect(() => {
    const el = ref.current
    if (!el || !warmKey) return
    const saved = readCache(activeTabId, warmKey)?.scrollTop
    el.scrollTop = saved ?? 0
    let last = saved ?? 0
    const onScroll = (): void => {
      last = el.scrollTop
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      captureCache(activeTabId, warmKey, { scrollTop: last })
    }
  }, [activeTabId, warmKey])

  return (
    <div
      ref={ref}
      className={
        'detail-scroll' +
        (owner ? ' has-header' : '') +
        (owner && isSurfaceKind(owner.kind) ? ' is-surface' : '')
      }
    >
      {owner ? <Banner owner={owner} /> : null}
      <div className="detail-body">{children}</div>
    </div>
  )
}
