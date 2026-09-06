import { useEffect, useRef, type ReactNode } from 'react'
import { GlassPane } from '@pommora/uix/Glass'
import { cx } from '@pommora/uix/Utilities/cx'
import { Banner } from './Header/Banner'
import { isSurfaceKind, type BannerOwner } from '../Session/treeIndex'
import { useSession } from '../Session/store'
import { navKey } from '../Navigation/navRecents'
import { captureCache, readCache } from '../Navigation/warmTabs'

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

/** The app's root glass — the one surface everything else floats over. */
export function Surface({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return <GlassPane className={cx('surface-glass', className)}>{children}</GlassPane>
}
