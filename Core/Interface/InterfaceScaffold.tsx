import { useEffect, useRef, type ReactNode, type Ref } from 'react'
import { GlassPane } from '@pommora/uix/Glass/glass-pane'
import { cx } from '@pommora/uix/Utilities/cx'
import { EntityBanner } from './Header/Banner'
import { isSurfaceKind, type BannerOwner } from '../Nexus/treeIndex'
import { useContentHost } from './contentHost'
import { captureCache, readCache } from '../Navigation/warmTabs'

export function InterfaceScaffold({
  owner,
  children,
}: {
  owner: BannerOwner | null
  children?: React.ReactNode
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const host = useContentHost()
  const tabId = host?.tabId
  const warmKey = host?.key

  // Scroll tracks into `last`: an unmount's cleanup runs after the div has left the page.
  useEffect(() => {
    const el = ref.current
    if (!el || tabId === undefined || warmKey === undefined) return
    const saved = readCache(tabId, warmKey)?.scrollTop
    el.scrollTop = saved ?? 0
    let last = saved ?? 0
    const onScroll = (): void => {
      last = el.scrollTop
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      captureCache(tabId, warmKey, { scrollTop: last })
    }
  }, [tabId, warmKey])

  const surface = owner !== null && isSurfaceKind(owner.kind)
  return (
    <div ref={ref} className={`detail-scroll${owner ? ' has-header' : ''}`}>
      {owner ? <EntityBanner owner={owner} /> : null}
      <div className={surface ? 'tile-host-frame' : 'detail-body'}>{children}</div>
    </div>
  )
}

export function Surface({
  children,
  className,
  ref,
}: {
  children: ReactNode
  className?: string
  ref?: Ref<HTMLDivElement>
}): React.JSX.Element {
  return (
    <GlassPane ref={ref} className={cx('surface-glass', className)}>
      {children}
    </GlassPane>
  )
}
