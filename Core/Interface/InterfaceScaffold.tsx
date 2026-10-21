import { useCallback, useEffect, useRef } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { Scrollbar } from '@pommora/uix/Interactions/Scrollbar'
import { EntityBanner } from './Header/Banner'
import { isSurfaceKind, type BannerOwner } from '../Nexus/treeIndex'
import { useContentHost } from './contentHost'
import { captureWarm, readWarm } from '../Session/warmCache'

export function InterfaceScaffold({
  owner,
  trailing,
  plain,
  ready = true,
  scrollRef,
  children,
}: {
  owner: BannerOwner | null
  trailing?: React.ReactNode
  plain?: true
  /** False while the content still has no height, so the saved scroll lands once it has. */
  ready?: boolean
  /** Handed the scroll element, for content that measures against it. */
  scrollRef?: (el: HTMLDivElement | null) => void
  children?: React.ReactNode
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null)
  const attach = useCallback(
    (el: HTMLDivElement | null) => {
      ref.current = el
      scrollRef?.(el)
    },
    [scrollRef],
  )
  const host = useContentHost()
  const tabId = host?.tabId
  const warmKey = host?.key

  // Scroll tracks into `last`: an unmount's cleanup runs after the div has left the page.
  useEffect(() => {
    const el = ref.current
    if (!el || !ready || tabId === undefined || warmKey === undefined) return
    const saved = readWarm(tabId, warmKey)?.scrollTop
    el.scrollTop = saved ?? 0
    let last = saved ?? 0
    const onScroll = (): void => {
      last = el.scrollTop
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      captureWarm(tabId, warmKey, { scrollTop: last })
    }
  }, [tabId, warmKey, ready])

  const surface = owner !== null && isSurfaceKind(owner.kind)
  return (
    <>
      <div ref={attach} className={cx('detail-scroll', owner && 'has-header')}>
        {owner ? <EntityBanner owner={owner} trailing={trailing} plain={plain} /> : null}
        <div className={cx(surface ? 'tile-host-frame' : 'detail-body', 'interface-inset')}>
          {children}
        </div>
      </div>
      <Scrollbar />
    </>
  )
}
